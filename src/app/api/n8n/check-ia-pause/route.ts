import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkN8nAuth } from "@/lib/n8n/auth";

export const runtime = "nodejs";

/**
 * POST /api/n8n/check-ia-pause
 *
 * n8n consulta antes de chamar a Maia: a IA está pausada pra essa conversa?
 *
 * Body:
 *   { telefone: "5511997440101" }
 *
 * Resposta:
 *   { ok: true, pausada: bool, motivo?: string, pausada_em?: ISO }
 */
export async function POST(req: Request) {
  const auth = checkN8nAuth(req);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const telefone = String(body?.telefone || "").replace(/\D/g, "");

  if (!telefone) {
    return NextResponse.json({ ok: false, error: "telefone obrigatório" }, { status: 400 });
  }

  const supa = await createClient();
  const { data } = await supa
    .from("LNB - CRM")
    .select("ia_pausada, ia_pausada_em, ia_pausa_motivo")
    .eq("telefone", telefone)
    .maybeSingle();

  return NextResponse.json({
    ok: true,
    telefone,
    pausada: !!data?.ia_pausada,
    motivo: data?.ia_pausa_motivo || null,
    pausada_em: data?.ia_pausada_em || null,
  });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "POST /api/n8n/check-ia-pause",
    body: { telefone: "5511997440101" },
  });
}
