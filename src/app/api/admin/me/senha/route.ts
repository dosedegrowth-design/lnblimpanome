import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin";

/**
 * POST /api/admin/me/senha
 * { senha: string }  — atualiza a senha do user logado via Supabase Auth
 */
export async function POST(req: Request) {
  await requireAdmin();
  const { senha } = await req.json();
  if (!senha || senha.length < 8) {
    return NextResponse.json({ ok: false, error: "Senha precisa ter ao menos 8 caracteres" }, { status: 400 });
  }
  const supa = await createClient();
  const { error } = await supa.auth.updateUser({ password: senha });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
