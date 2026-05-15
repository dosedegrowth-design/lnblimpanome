/**
 * GET /api/admin/processos/[id]
 * Retorna detalhes do processo pra exibir no Drawer lateral.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const supa = await createClient();
  const { data, error } = await supa.rpc("admin_processo_detail", { p_processo_id: id });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, ...data });
}
