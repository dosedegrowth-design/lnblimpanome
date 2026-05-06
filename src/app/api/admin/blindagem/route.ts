import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin";

/**
 * POST /api/admin/blindagem
 * { cpf: string, action: 'pausar' | 'reativar' }
 */
export async function POST(req: Request) {
  await requireAdmin();
  const { cpf, action } = await req.json();

  if (!cpf || !["pausar", "reativar"].includes(action)) {
    return NextResponse.json({ ok: false, error: "Parâmetros inválidos" }, { status: 400 });
  }

  const supa = await createClient();
  const fn = action === "pausar" ? "admin_blindagem_pausar" : "admin_blindagem_reativar";
  const { data, error } = await supa.rpc(fn, { p_cpf: cpf });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
