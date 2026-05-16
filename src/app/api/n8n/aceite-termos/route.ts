/**
 * POST /api/n8n/aceite-termos
 *
 * Registra o aceite dos Termos pelo cliente que veio via WhatsApp.
 * Versão WhatsApp do /api/site/aceite-termos.
 *
 * Por que precisamos disso (juridicamente):
 * - LGPD exige consentimento explícito antes de tratar dados pessoais
 * - CDC exige aceite informado antes de prestação de serviço
 * - Audit_log com timestamp + texto/url do contrato + meio de coleta
 *   (whatsapp) torna o aceite válido perante a justiça
 *
 * Body:
 *   {
 *     cpf: "12345678909",        # ou cnpj se for PJ
 *     cnpj?: "00000000000100",
 *     tipo: "consulta" | "consulta-cnpj" | "limpeza" | "limpeza-cnpj" | "blindagem",
 *     telefone: "11999990101",
 *     nome?: "Maria Silva",
 *     conversation_id?: "123",   # id da conversa Chatwoot pra rastreabilidade
 *     versao?: "1.0",
 *   }
 *
 * Retorna:
 *   { ok: true, audit_id: "...", url_termos: "https://..." }
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkN8nAuth } from "@/lib/n8n/auth";
import { cleanCPF, cleanCNPJ } from "@/lib/utils";

export const runtime = "nodejs";

const URLS_TERMOS: Record<string, string> = {
  consulta: "https://limpanomebrazil.com.br/termos/consulta",
  "consulta-cnpj": "https://limpanomebrazil.com.br/termos/consulta-cnpj",
  limpeza: "https://limpanomebrazil.com.br/termos/limpeza",
  "limpeza-cnpj": "https://limpanomebrazil.com.br/termos/limpeza-cnpj",
  blindagem: "https://limpanomebrazil.com.br/termos/limpeza", // mesmo termo (genérico)
};

export async function POST(req: Request) {
  const auth = checkN8nAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const cpf = cleanCPF(String(body?.cpf || ""));
  const cnpj = cleanCNPJ(String(body?.cnpj || ""));
  const tipo = String(body?.tipo || "");
  const telefone = String(body?.telefone || "").replace(/\D/g, "");
  const nome = String(body?.nome || "").trim();
  const conversationId = String(body?.conversation_id || "").trim();
  const versao = String(body?.versao || "1.0");

  if (!cpf && !cnpj) {
    return NextResponse.json({ ok: false, error: "cpf ou cnpj obrigatório" }, { status: 400 });
  }
  if (!telefone) {
    return NextResponse.json({ ok: false, error: "telefone obrigatório" }, { status: 400 });
  }
  if (!URLS_TERMOS[tipo]) {
    return NextResponse.json(
      { ok: false, error: `Tipo inválido. Use: ${Object.keys(URLS_TERMOS).join(", ")}` },
      { status: 400 }
    );
  }

  const url = URLS_TERMOS[tipo];
  const supa = await createClient();

  const { data, error } = await supa
    .from("lnb_audit_log")
    .insert({
      actor_id: cpf || cnpj,
      actor_type: "cliente_whatsapp",
      action: `aceite_termos_${tipo}`,
      resource_type: "termos",
      resource_id: tipo,
      metadata: {
        cpf: cpf || null,
        cnpj: cnpj || null,
        telefone,
        nome,
        versao,
        url_termos: url,
        via: "whatsapp",
        conversation_id: conversationId || null,
        aceitou_em: new Date().toISOString(),
      },
    })
    .select("id")
    .single();

  if (error) {
    console.error("[aceite-termos n8n] erro:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  console.log(
    `[aceite-termos n8n] ✓ Aceite registrado: ${cpf || cnpj} tipo=${tipo} via WhatsApp`
  );

  return NextResponse.json({
    ok: true,
    audit_id: data?.id,
    url_termos: url,
    tipo,
    registrado_em: new Date().toISOString(),
  });
}
