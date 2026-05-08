import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createPreference } from "@/lib/mercadopago";
import { cleanCPF, isValidCPF } from "@/lib/utils";

/**
 * POST /api/site/checkout
 *
 * Fluxo self-service do site (SEM n8n):
 * 1) Valida + cadastra cliente em lnb_cliente_auth
 * 2) Se tipo for limpeza_desconto: valida pré-requisito (consulta paga + pendência)
 * 3) Upsert em "LNB - CRM" com origem='site'
 * 4) Cria preference Mercado Pago direto (server-side)
 * 5) Retorna init_point pra redirect
 *
 * MP volta com webhook → /api/site/mp-webhook (processa pagamento + API Full).
 */
const PRECOS = {
  consulta:         { valor: 19.99,  titulo: "LNB - Consulta CPF" },
  limpeza_desconto: { valor: 480.01, titulo: "LNB - Limpeza + Blindagem (com desconto)" },
  limpeza:          { valor: 499.90, titulo: "LNB - Limpeza de Nome + Blindagem" },
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
    cpf: cpfRaw, nome, email,
    telefone: telRaw, senha,
    tipo = "consulta",
  } = body as Record<string, string>;

  const cpf = cleanCPF(cpfRaw || "");
  const telefone = (telRaw || "").replace(/\D/g, "");

  if (!isValidCPF(cpf))                  return bad("CPF inválido");
  if (!nome || nome.length < 2)          return bad("Nome inválido");
  if (!email || !email.includes("@"))    return bad("Email inválido");
  if (!telefone || telefone.length < 10) return bad("Telefone inválido");
  if (!senha || senha.length < 8)        return bad("Senha precisa ter ao menos 8 caracteres");
  if (!(tipo in PRECOS))                 return bad("Tipo de cobrança inválido");

  const item = PRECOS[tipo as TipoCobranca];
  const supa = await createClient();

  // Pré-requisito: limpeza só após consulta paga COM pendência
  if (tipo === "limpeza_desconto" || tipo === "limpeza") {
    const { data: eleg, error: elegErr } = await supa.rpc(
      "cliente_pode_contratar_limpeza",
      { p_cpf: cpf }
    );
    if (elegErr) {
      console.error("[checkout] elegibilidade erro:", elegErr);
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
  }

  // 1) Cadastra cliente (RPC trata duplicata)
  const reg = await supa.rpc("lnb_cliente_register", {
    p_cpf: cpf, p_senha: senha, p_nome: nome, p_email: email, p_telefone: telefone,
  });
  if (reg.error) {
    console.error("[checkout] register erro:", reg.error);
  } else if (reg.data && (reg.data as { ok: boolean }).ok === false) {
    const msg = (reg.data as { error?: string }).error || "";
    if (!msg.includes("já cadastrado")) return bad(msg);
  }

  // 2) Upsert CRM com origem='site' (via RPC SECURITY DEFINER — sem service_role)
  try {
    await supa.rpc("checkout_upsert_crm_lead", {
      p_telefone: telefone,
      p_nome: nome,
      p_cpf: cpf,
      p_email: email,
      p_servico: item.titulo,
      p_origem: "site",
    });
  } catch (e) {
    console.error("[checkout] upsert CRM erro (segue):", e);
  }

  // 3) Cria preference MP direto
  const base = siteUrl(req);
  const externalRef = `${tipo.toUpperCase()}-${cpf}-${Date.now()}`;

  // URLs de retorno por tipo
  const isConsulta = tipo === "consulta";
  const successUrl = isConsulta
    ? `${base}/consultar?status=success&cpf=${cpf}`
    : `${base}/conta/dashboard?status=success`;
  const failureUrl = isConsulta
    ? `${base}/consultar?status=failure`
    : `${base}/contratar?plano=${tipo}&status=failure`;
  const pendingUrl = isConsulta
    ? `${base}/consultar?status=pending&cpf=${cpf}`
    : `${base}/conta/dashboard?status=pending`;

  let preference;
  try {
    preference = await createPreference({
      title: item.titulo,
      unitPrice: item.valor,
      externalReference: externalRef,
      payer: { name: nome, email, cpf, phone: telefone },
      metadata: { cpf, telefone, tipo, origem: "site" },
      notificationUrl: `${base}/api/site/mp-webhook`,
      successUrl,
      failureUrl,
      pendingUrl,
    });
  } catch (e) {
    console.error("[checkout] MP create erro:", e);
    return NextResponse.json(
      { ok: false, error: "Não conseguimos gerar a cobrança. Tente novamente." },
      { status: 502 }
    );
  }

  // 4) Salva preference_id no CRM (via RPC)
  try {
    await supa.rpc("checkout_save_preference", {
      p_telefone: telefone,
      p_link_pagamento: preference.init_point,
      p_external_ref: externalRef,
      p_id_pagamento: preference.id,
    });
  } catch (e) {
    console.error("[checkout] update CRM com preference erro (segue):", e);
  }

  return NextResponse.json({
    ok: true,
    init_point: preference.init_point,
    preference_id: preference.id,
    external_reference: externalRef,
    cpf,
  });
}

function bad(error: string) {
  return NextResponse.json({ ok: false, error }, { status: 400 });
}
