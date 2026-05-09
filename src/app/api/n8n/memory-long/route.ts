import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkN8nAuth } from "@/lib/n8n/auth";

export const runtime = "nodejs";

/**
 * POST /api/n8n/memory-long
 *
 * Atualiza a memória longa do agente Maia (markdown) sobre um lead.
 * Substitui a tool long_memory do v02 (que apontava pra webhook-test n8n).
 *
 * Body:
 *   {
 *     telefone: "5511997440101",
 *     memoria: "## Resumo do lead..."
 *   }
 *
 * Headers: Authorization: Bearer <N8N_SHARED_TOKEN>
 */
export async function POST(req: Request) {
  const auth = checkN8nAuth(req);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const telefone = String(body?.telefone || "").replace(/\D/g, "");
  const memoria = String(body?.memoria || "").trim();

  if (!telefone) {
    return NextResponse.json({ ok: false, error: "telefone obrigatório" }, { status: 400 });
  }
  if (!memoria) {
    return NextResponse.json({ ok: false, error: "memoria obrigatória" }, { status: 400 });
  }

  const supa = await createClient();
  try {
    const { data, error } = await supa.rpc("n8n_atualizar_memoria_longa", {
      p_telefone: telefone,
      p_memoria: memoria,
    });
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, ...(data as object) });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "POST /api/n8n/memory-long",
    body: { telefone: "...", memoria: "## Markdown..." },
  });
}
