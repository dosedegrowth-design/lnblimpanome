import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { criarCobrancaLNB } from "@/lib/asaas";
import { cleanCPF, isValidCPF, cleanCNPJ, isValidCNPJ } from "@/lib/utils";

/**
 * POST /api/site/checkout
 *
 * Fluxo self-service do site (SEM n8n):
 * 1) Valida dados (CPF ou CNPJ + responsável)
 * 2) Se for limpeza_*: valida pré-requisito (consulta paga + pendência)
 * 3) Cadastra cliente em lnb_cliente_auth (CPF do cliente OU do responsável)
 * 4) Upsert em "LNB - CRM" com origem='site'
 * 5) Cria cobrança Asaas (Pix + cartão + boleto na mesma tela)
 * 6) Retorna init_point (invoiceUrl Asaas)
 *
 * Asaas notifica via webhook → /api/site/asaas-webhook
 */
const PRECOS = {
  consulta:         { valor: 19.99,  titulo: "LNB - Consulta CPF",                          tipoDoc: "CPF"  as const },
  consulta_cnpj:    { valor: 24.99,  titulo: "LNB - Consulta CNPJ",                         tipoDoc: "CNPJ" as const },
  limpeza_desconto: { valor: 480.01, titulo: "LNB - Limpeza de Nome + Monitoramento 12m",   tipoDoc: "CPF"  as const },
  limpeza:          { valor: 499.90, titulo: "LNB - Limpeza de Nome + Monitoramento 12m",   tipoDoc: "CPF"  as const },
  limpeza_cnpj:     { valor: 580.01, titulo: "LNB - Limpeza CNPJ + Sócio + Monitoramento",  tipoDoc: "CNPJ" as const },
} as const;

type TipoCobranca = keyof typeof PRECOS;

function siteUrl(req: Request): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env) return env.replace(/\/$/, "");
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const {
    cpf: cpfRaw, cnpj: cnpjRaw,
    nome, email, telefone: telRaw, senha,
    razao_social, cpf_responsavel: cpfRespRaw, nome_responsavel,
    tipo = "consulta",
  } = body as Record<string, string>;

  const telefone = (telRaw || "").replace(/\D/g, "");

  if (!(tipo in PRECOS)) return bad("Tipo de cobrança inválido");
  const item = PRECOS[tipo as TipoCobranca];
  const isCNPJ = item.tipoDoc === "CNPJ";

  // ─── Validações comuns ───
  if (!email || !email.includes("@"))    return bad("Email inválido");
  if (!telefone || telefone.length < 10) return bad("Telefone inválido");
  if (!senha || senha.length < 8)        return bad("Senha precisa ter ao menos 8 caracteres");

  // ─── Validações específicas por tipo ───
  let cpf = "";          // CPF do cliente (PF) OU do responsável (PJ)
  let cnpj = "";
  let cpfResponsavel = "";

  if (isCNPJ) {
    cnpj = cleanCNPJ(cnpjRaw || "");
    cpfResponsavel = cleanCPF(cpfRespRaw || "");
    if (!isValidCNPJ(cnpj))               return bad("CNPJ inválido");
    if (!razao_social || razao_social.length < 2) return bad("Razão social inválida");
    if (!isValidCPF(cpfResponsavel))      return bad("CPF do responsável inválido");
    if (!nome_responsavel || nome_responsavel.length < 2) return bad("Nome do responsável inválido");
    cpf = cpfResponsavel; // usa CPF do responsável como identidade do "cliente" no auth
  } else {
    cpf = cleanCPF(cpfRaw || "");
    if (!isValidCPF(cpf))                 return bad("CPF inválido");
    if (!nome || nome.length < 2)         return bad("Nome inválido");
  }

  const supa = await createClient();

  // ─── Pré-requisito limpeza (CPF ou CNPJ): exige consulta paga COM pendência ───
  if (tipo === "limpeza_desconto" || tipo === "limpeza") {
    const { data: eleg, error: elegErr } = await supa.rpc(
      "cliente_pode_contratar_limpeza",
      { p_cpf: cpf }
    );
    if (elegErr) {
      console.error("[checkout] elegibilidade CPF erro:", elegErr);
      return bad("Não foi possível validar elegibilidade. Tente novamente.");
    }
    const r = eleg as { pode: boolean; motivo?: string; mensagem?: string };
    if (!r?.pode) {
      return NextResponse.json(
        {
          ok: false,
          error: r?.mensagem || "CPF não elegível pra contratação de limpeza",
          motivo: r?.motivo,
          requer_consulta: r?.motivo === "sem_consulta",
        },
        { status: 409 }
      );
    }
  } else if (tipo === "limpeza_cnpj") {
    const { data: eleg, error: elegErr } = await supa.rpc(
      "cliente_pode_contratar_limpeza_cnpj",
      { p_cnpj: cnpj }
    );
    if (elegErr) {
      console.error("[checkout] elegibilidade CNPJ erro:", elegErr);
      return bad("Não foi possível validar elegibilidade. Tente novamente.");
    }
    const r = eleg as { pode: boolean; motivo?: string; mensagem?: string };
    if (!r?.pode) {
      return NextResponse.json(
        {
          ok: false,
          error: r?.mensagem || "CNPJ não elegível pra contratação de limpeza",
          motivo: r?.motivo,
          requer_consulta: r?.motivo === "sem_consulta",
        },
        { status: 409 }
      );
    }
  }

  // ─── 1) Cadastra cliente em lnb_cliente_auth (CPF do responsável p/ CNPJ) ───
  const reg = await supa.rpc("lnb_cliente_register", {
    p_cpf: cpf, p_senha: senha,
    p_nome: isCNPJ ? nome_responsavel : nome,
    p_email: email, p_telefone: telefone,
  });
  if (reg.error) {
    console.error("[checkout] register erro:", reg.error);
  } else if (reg.data && (reg.data as { ok: boolean }).ok === false) {
    const msg = (reg.data as { error?: string }).error || "";
    if (!msg.includes("já cadastrado")) return bad(msg);
  }

  // ─── 2) Upsert CRM ───
  try {
    await supa.rpc("checkout_upsert_crm_lead", {
      p_telefone: telefone,
      p_nome: isCNPJ ? razao_social : nome,
      p_cpf: cpf,
      p_email: email,
      p_servico: item.titulo,
      p_origem: "site",
    });
  } catch (e) {
    console.error("[checkout] upsert CRM erro (segue):", e);
  }

  // 2.5) Se CNPJ: grava dados PJ no CRM via RPC SECURITY DEFINER
  if (isCNPJ) {
    try {
      await supa.rpc("lnb_crm_set_cnpj_data", {
        p_telefone: telefone,
        p_cnpj: cnpj,
        p_razao_social: razao_social,
        p_cpf_responsavel: cpfResponsavel,
        p_nome_responsavel: nome_responsavel,
      });
    } catch (e) {
      console.error("[checkout] set_cnpj_data erro (segue):", e);
    }
  }

  // ─── 3) Cria cobrança Asaas ───
  const base = siteUrl(req);
  const docPraExtRef = isCNPJ ? cnpj : cpf;
  const externalRef = `${tipo.toUpperCase()}-${docPraExtRef}-${Date.now()}`;

  // Sucesso volta pro fluxo certo
  let successUrl: string;
  if (tipo === "consulta") {
    successUrl = `${base}/consultar/cpf?status=success&cpf=${cpf}`;
  } else if (tipo === "consulta_cnpj") {
    successUrl = `${base}/consultar/cnpj?status=success&cnpj=${cnpj}`;
  } else {
    successUrl = `${base}/conta/dashboard?status=success`;
  }

  let cobranca;
  try {
    cobranca = await criarCobrancaLNB({
      cpf, // Asaas pede CPF/CNPJ na criação do customer; usamos CPF do responsável p/ PJ tbm
      nome: isCNPJ ? razao_social : nome,
      email,
      telefone,
      valor: item.valor,
      descricao: item.titulo,
      externalReference: externalRef,
      successUrl,
    });
  } catch (e) {
    console.error("[checkout] Asaas create erro:", e);
    return NextResponse.json(
      { ok: false, error: "Não conseguimos gerar a cobrança. Tente novamente." },
      { status: 502 }
    );
  }

  // ─── 4) Salva no CRM ───
  try {
    await supa.rpc("checkout_save_preference", {
      p_telefone: telefone,
      p_link_pagamento: cobranca.invoiceUrl,
      p_external_ref: externalRef,
      p_id_pagamento: cobranca.paymentId,
    });
  } catch (e) {
    console.error("[checkout] update CRM com cobrança erro (segue):", e);
  }

  return NextResponse.json({
    ok: true,
    init_point: cobranca.invoiceUrl,
    invoice_url: cobranca.invoiceUrl,
    payment_id: cobranca.paymentId,
    customer_id: cobranca.customerId,
    external_reference: externalRef,
    tipo,
    cpf: isCNPJ ? undefined : cpf,
    cnpj: isCNPJ ? cnpj : undefined,
  });
}

function bad(error: string) {
  return NextResponse.json({ ok: false, error }, { status: 400 });
}
