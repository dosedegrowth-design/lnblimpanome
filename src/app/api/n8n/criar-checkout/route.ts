import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { criarCobrancaLNB } from "@/lib/asaas";
import { checkN8nAuth } from "@/lib/n8n/auth";
import { cleanCPF, isValidCPF, cleanCNPJ, isValidCNPJ } from "@/lib/utils";
import { aplicarLabelsLnb, type LnbLabelContext } from "@/lib/chatwoot-labels";
import { buscarConversationIdPorTelefone } from "@/lib/chatwoot-kanban";

export const runtime = "nodejs";

// Mapa tipo → contexto label
const LABEL_POR_TIPO: Record<string, LnbLabelContext> = {
  consulta: "interessado_consulta",
  consulta_cnpj: "interessado_consulta",
  limpeza_desconto: "interessado_limpeza",
  limpeza_cnpj: "interessado_limpeza",
  blindagem: "interessado_blindagem",
};

/**
 * POST /api/n8n/criar-checkout
 *
 * Cria preference Mercado Pago pra o cliente do WhatsApp pagar
 * (substitui as tools gerar_cobranca_consulta + gerar_cobranca_limpeza do v02).
 *
 * Diferenças do /api/site/checkout:
 * - Não exige senha (cliente WhatsApp não tem login no painel)
 * - origem='whatsapp' (mp-webhook roteia notificação pelo Chatwoot)
 * - Não cadastra em lnb_cliente_auth
 *
 * Body:
 *   {
 *     telefone: "5511997440101",
 *     cpf: "48058310816",
 *     nome: "Lucas",
 *     email?: "lucas@exemplo.com",
 *     tipo: "consulta" | "limpeza_desconto" | "blindagem"
 *   }
 *
 * Resposta:
 *   { ok: true, init_point: "https://...", preference_id: "...", external_reference: "..." }
 */
// MODO TESTE: se env LNB_MODO_TESTE = "true", aplica R$ 5,00 (mínimo Asaas)
const MODO_TESTE = process.env.LNB_MODO_TESTE === "true";

const PRECOS_REAIS = {
  consulta:         { valor: 29.99,  titulo: "LNB - Consulta CPF",                          isCnpj: false },
  consulta_cnpj:    { valor: 39.99,  titulo: "LNB - Consulta CNPJ",                         isCnpj: true  },
  limpeza_desconto: { valor: 500.00, titulo: "LNB - Limpeza + Blindagem (com desconto)",    isCnpj: false },
  limpeza_cnpj:     { valor: 580.01, titulo: "LNB - Limpeza CNPJ + Sócio + Monitoramento",  isCnpj: true  },
  blindagem:        { valor: 29.90,  titulo: "LNB - Blindagem mensal de CPF",               isCnpj: false },
} as const;

// Asaas exige valor mínimo de R$ 5,00 — R$ 1,00 retorna 502
const PRECOS_TESTE = {
  consulta:         { valor: 5.00, titulo: "[TESTE] LNB - Consulta CPF",   isCnpj: false },
  consulta_cnpj:    { valor: 5.00, titulo: "[TESTE] LNB - Consulta CNPJ",  isCnpj: true  },
  limpeza_desconto: { valor: 5.00, titulo: "[TESTE] LNB - Limpeza",        isCnpj: false },
  limpeza_cnpj:     { valor: 5.00, titulo: "[TESTE] LNB - Limpeza CNPJ",   isCnpj: true  },
  blindagem:        { valor: 5.00, titulo: "[TESTE] LNB - Blindagem",      isCnpj: false },
} as const;

const PRECOS = MODO_TESTE ? PRECOS_TESTE : PRECOS_REAIS;

type TipoCobranca = keyof typeof PRECOS_REAIS;

function siteUrl(req: Request): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env) return env.replace(/\/$/, "");
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}

export async function POST(req: Request) {
  const auth = checkN8nAuth(req);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const tipo = String(body?.tipo || "consulta") as TipoCobranca;
  const telefone = String(body?.telefone || "").replace(/\D/g, "");
  const email = String(body?.email || "").trim();

  if (!(tipo in PRECOS)) return bad(`Tipo inválido: ${tipo}`);
  if (!telefone || telefone.length < 10) return bad("Telefone inválido");

  const item: { valor: number; titulo: string; isCnpj: boolean } = { ...PRECOS[tipo] };

  // Campos diferentes por tipo (PF vs PJ)
  let cpf = "";
  let cnpj = "";
  let nome = "";
  let cpfResponsavel = "";
  let nomeResponsavel = "";
  let razaoSocial = "";

  if (item.isCnpj) {
    cnpj = cleanCNPJ(String(body?.cnpj || ""));
    cpfResponsavel = cleanCPF(String(body?.cpf_responsavel || body?.cpf || ""));
    nomeResponsavel = String(body?.nome_responsavel || body?.nome || "").trim();
    razaoSocial = String(body?.razao_social || "").trim();

    if (!isValidCNPJ(cnpj)) return bad("CNPJ inválido");
    if (!isValidCPF(cpfResponsavel)) return bad("CPF do sócio responsável inválido");
    if (!razaoSocial || razaoSocial.length < 2) return bad("Razão social inválida");
    if (!nomeResponsavel || nomeResponsavel.length < 2) return bad("Nome do sócio responsável inválido");

    // Pra Asaas usamos CNPJ + razão social, mas o CPF responsável é guardado pra consulta API Full
    cpf = cpfResponsavel; // mantém compat
    nome = razaoSocial;
  } else {
    cpf = cleanCPF(String(body?.cpf || ""));
    nome = String(body?.nome || "").trim();

    if (!isValidCPF(cpf)) return bad("CPF inválido");
    if (!nome || nome.length < 2) return bad("Nome inválido");
  }

  const supa = await createClient();

  // Pré-requisito + desconto: limpeza só após consulta paga COM pendência
  let descontoAplicado = false;
  let diasRestantesDesconto: number | null = null;
  if (tipo === "limpeza_desconto") {
    const { data: eleg } = await supa.rpc("cliente_pode_contratar_limpeza", { p_cpf: cpf });
    const r = eleg as { pode: boolean; motivo?: string; mensagem?: string };
    if (!r?.pode) {
      return NextResponse.json(
        {
          ok: false,
          error: r?.mensagem || "CPF não elegível pra limpeza",
          motivo: r?.motivo,
        },
        { status: 409 }
      );
    }

    // Aplica desconto se consulta paga há ≤ 15 dias (skip em modo teste — valor sempre R$ 5)
    if (!MODO_TESTE) {
      try {
        const { data: vlr } = await supa.rpc("lnb_calcular_valor_limpeza", { p_cpf: cpf });
        const v = vlr as {
          valor_cheio: number;
          valor_com_desconto: number;
          tem_desconto: boolean;
          dias_restantes: number;
        };
        if (v?.tem_desconto) {
          item.valor = v.valor_com_desconto;
          item.titulo = "LNB - Limpeza de Nome (com desconto da consulta)";
          descontoAplicado = true;
          diasRestantesDesconto = v.dias_restantes;
        } else {
          item.valor = v?.valor_cheio ?? 500.0;
          item.titulo = "LNB - Limpeza de Nome";
        }
      } catch (e) {
        console.error("[n8n/criar-checkout] calc desconto erro (segue, usa valor cheio):", e);
      }
    } else {
      // modo teste: força R$ 5,00 (já vem do PRECOS_TESTE)
      descontoAplicado = false;
    }
  } else if (tipo === "limpeza_cnpj") {
    // Pré-requisito CNPJ: consulta CNPJ paga COM pendência no sócio
    const { data: eleg } = await supa.rpc("cliente_pode_contratar_limpeza_cnpj", { p_cnpj: cnpj });
    const r = eleg as { pode: boolean; motivo?: string; mensagem?: string };
    if (!r?.pode) {
      return NextResponse.json(
        {
          ok: false,
          error: r?.mensagem || "CNPJ não elegível pra limpeza",
          motivo: r?.motivo,
        },
        { status: 409 }
      );
    }
  }

  // Upsert CRM com origem='whatsapp'
  try {
    await supa.rpc("checkout_upsert_crm_lead", {
      p_telefone: telefone,
      p_nome: nome,
      p_cpf: cpf,
      p_email: email || null,
      p_servico: item.titulo,
      p_origem: "whatsapp",
    });
  } catch (e) {
    console.error("[n8n/criar-checkout] upsert CRM erro (segue):", e);
  }

  // Se CNPJ: salva dados PJ no CRM (cnpj, razao_social, cpf_responsavel, nome_responsavel)
  if (item.isCnpj && cnpj) {
    try {
      await supa.rpc("lnb_crm_set_cnpj_data", {
        p_telefone: telefone,
        p_cnpj: cnpj,
        p_razao_social: razaoSocial,
        p_cpf_responsavel: cpfResponsavel,
        p_nome_responsavel: nomeResponsavel,
      });
    } catch (e) {
      console.error("[n8n/criar-checkout] set cnpj data erro (segue):", e);
    }
  }

  // Cria cobrança Asaas — PF usa CPF + nome, PJ usa CNPJ + razão social
  const base = siteUrl(req);
  const docPraExtRef = item.isCnpj ? cnpj : cpf;
  const externalRef = `${tipo.toUpperCase()}-${docPraExtRef}-${Date.now()}`;
  let cobranca;
  try {
    cobranca = await criarCobrancaLNB({
      cpf: item.isCnpj ? cnpj : cpf, // Asaas aceita CPF/CNPJ no mesmo campo cpfCnpj
      nome: item.isCnpj ? razaoSocial : nome,
      email: email || `${telefone}@whatsapp.lnb`,
      telefone,
      valor: item.valor,
      descricao: item.titulo,
      externalReference: externalRef,
      successUrl: `${base}/conta/dashboard?status=success`,
    });
  } catch (e) {
    console.error("[n8n/criar-checkout] Asaas erro:", e);
    return NextResponse.json(
      { ok: false, error: "Não conseguimos gerar a cobrança. Tente novamente." },
      { status: 502 }
    );
  }

  // Salva no CRM (RPC mantém os mesmos nomes de params)
  try {
    await supa.rpc("checkout_save_preference", {
      p_telefone: telefone,
      p_link_pagamento: cobranca.invoiceUrl,
      p_external_ref: externalRef,
      p_id_pagamento: cobranca.paymentId,
    });
  } catch (e) {
    console.error("[n8n/criar-checkout] save cobrança erro (segue):", e);
  }

  // Grava valor_servico + tipo_servico (padrão SPV pra Kanban)
  const valorFormatado = `R$ ${item.valor
    .toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  try {
    await supa.rpc("lnb_crm_set_valor_servico", {
      p_telefone: telefone,
      p_valor_servico: valorFormatado,
      p_tipo_servico: tipo,
    });
  } catch (e) {
    console.error("[n8n/criar-checkout] set valor erro (segue):", e);
  }

  // Aplica labels Chatwoot automaticamente (interessado_*, aguardando-pagamento)
  try {
    const labelContext = LABEL_POR_TIPO[tipo];
    if (labelContext) {
      const conv = await buscarConversationIdPorTelefone(telefone);
      if (conv) {
        await aplicarLabelsLnb(conv, labelContext);
      }
    }
  } catch (e) {
    console.error("[n8n/criar-checkout] aplicar labels erro (segue):", e);
  }

  return NextResponse.json({
    ok: true,
    init_point: cobranca.invoiceUrl, // mantém o nome pra compat n8n
    invoice_url: cobranca.invoiceUrl,
    payment_id: cobranca.paymentId,
    customer_id: cobranca.customerId,
    external_reference: externalRef,
    cpf: item.isCnpj ? undefined : cpf,
    cnpj: item.isCnpj ? cnpj : undefined,
    razao_social: item.isCnpj ? razaoSocial : undefined,
    cpf_responsavel: item.isCnpj ? cpfResponsavel : undefined,
    telefone,
    tipo,
    valor: item.valor,
    desconto_aplicado: descontoAplicado,
    dias_restantes_desconto: diasRestantesDesconto,
  });
}

function bad(error: string) {
  return NextResponse.json({ ok: false, error }, { status: 400 });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "POST /api/n8n/criar-checkout",
    body: {
      telefone: "...",
      cpf: "...",
      nome: "...",
      email: "...",
      tipo: "consulta | limpeza_desconto | blindagem",
    },
  });
}
