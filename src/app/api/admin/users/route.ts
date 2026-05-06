import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin";

/**
 * POST /api/admin/users → adicionar
 * PATCH /api/admin/users → atualizar role/ativo
 *
 * Body POST:   { user_id, email, nome, role }
 * Body PATCH:  { user_id, role, ativo, nome? }
 */
export async function POST(req: Request) {
  await requireAdmin(["owner"]);
  const { user_id, email, nome, role } = await req.json();
  if (!user_id || !email || !nome) {
    return NextResponse.json({ ok: false, error: "user_id, email e nome obrigatórios" }, { status: 400 });
  }
  const supa = await createClient();
  const { data, error } = await supa.rpc("admin_user_add", {
    p_user_id: user_id,
    p_email: email,
    p_nome: nome,
    p_role: role || "viewer",
  });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(req: Request) {
  await requireAdmin(["owner"]);
  const { user_id, role, ativo, nome } = await req.json();
  if (!user_id || !role || typeof ativo !== "boolean") {
    return NextResponse.json({ ok: false, error: "user_id, role e ativo obrigatórios" }, { status: 400 });
  }
  const supa = await createClient();
  const { data, error } = await supa.rpc("admin_user_update", {
    p_user_id: user_id,
    p_role: role,
    p_ativo: ativo,
    p_nome: nome ?? null,
  });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
