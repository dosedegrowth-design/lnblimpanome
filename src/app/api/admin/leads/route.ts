import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin";

/**
 * POST /api/admin/leads
 * { telefone: string, status: 'lead'|'interessado'|'agendado'|'fechado'|'perdido' }
 */
export async function POST(req: Request) {
  await requireAdmin();
  const { telefone, status } = await req.json();

  if (!telefone || !status) {
    return NextResponse.json({ ok: false, error: "Parâmetros inválidos" }, { status: 400 });
  }

  const supa = await createClient();
  const { data, error } = await supa.rpc("admin_lead_set_status", {
    p_telefone: telefone,
    p_status: status,
  });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
