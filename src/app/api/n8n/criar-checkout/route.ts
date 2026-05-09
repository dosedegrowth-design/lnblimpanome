import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createPreference } from "@/lib/mercadopago";
import { checkN8nAuth } from "@/lib/n8n/auth";
import { cleanCPF, isValidCPF } from "@/lib/utils";

export const runtime = "nodejs";

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
const PRECOS = {
  consulta:         { valor: 19.99,  titulo: "LNB - Consulta CPF" },
  limpeza_desconto: { valor: 480.01, titulo: "LNB - Limpeza + Blindagem (com desconto)" },
  blindagem:        { valor: 29.90,  titulo: "LNB - Blindagem mensal de CPF" },
} as const;

type TipoCobranca = keyof typeof PRECOS;

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
  const cpf = cleanCPF(String(body?.cpf || ""));
  const telefone = String(body?.telefone || "").replace(/\D/g, "");
  const nome = String(body?.nome || "").trim();
  const email = String(body?.email || "").trim();
  const tipo = String(body?.tipo || "consulta") as TipoCobranca;

  if (!isValidCPF(cpf)) return bad("CPF inválido");
  if (!telefone || telefone.length < 10) return bad("Telefone inválido");
  if (!nome || nome.length < 2) return bad("Nome inválido");
  if (!(tipo in PRECOS)) return bad(`Tipo inválido: ${tipo}`);

  const item = PRECOS[tipo];
  const supa = await createClient();

  // Pré-requisito: limpeza só após consulta paga COM pendência
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

  // Cria preference MP
  const base = siteUrl(req);
  const externalRef = `${tipo.toUpperCase()}-${cpf}-${Date.now()}`;
  let preference;
  try {
    preference = await createPreference({
      title: item.titulo,
      unitPrice: item.valor,
      externalReference: externalRef,
      payer: { name: nome, email: email || `${telefone}@whatsapp.lnb`, cpf, phone: telefone },
      metadata: { cpf, telefone, tipo, origem: "whatsapp" },
      notificationUrl: `${base}/api/site/mp-webhook`,
      successUrl: `${base}/conta/dashboard?status=success`,
      failureUrl: `${base}/?status=failure`,
      pendingUrl: `${base}/?status=pending`,
    });
  } catch (e) {
    console.error("[n8n/criar-checkout] MP erro:", e);
    return NextResponse.json(
      { ok: false, error: "Não conseguimos gerar a cobrança. Tente novamente." },
      { status: 502 }
    );
  }

  // Salva preference no CRM
  try {
    await supa.rpc("checkout_save_preference", {
      p_telefone: telefone,
      p_link_pagamento: preference.init_point,
      p_external_ref: externalRef,
      p_id_pagamento: preference.id,
    });
  } catch (e) {
    console.error("[n8n/criar-checkout] save preference erro (segue):", e);
  }

  return NextResponse.json({
    ok: true,
    init_point: preference.init_point,
    preference_id: preference.id,
    external_reference: externalRef,
    cpf,
    telefone,
    tipo,
    valor: item.valor,
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
