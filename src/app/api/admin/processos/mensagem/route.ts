import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin";

/**
 * POST /api/admin/processos/mensagem
 * { processo_id, mensagem, visivel_cliente=true }
 */
export async function POST(req: Request) {
  await requireAdmin();
  const { processo_id, mensagem, visivel_cliente = true } = await req.json();

  if (!processo_id || !mensagem) {
    return NextResponse.json({ ok: false, error: "Parâmetros inválidos" }, { status: 400 });
  }

  const supa = await createClient();
  const { data, error } = await supa.rpc("admin_processo_mensagem", {
    p_processo_id: processo_id,
    p_mensagem: mensagem,
    p_visivel_cliente: visivel_cliente,
  });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
