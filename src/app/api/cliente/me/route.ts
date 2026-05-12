import { NextResponse } from "next/server";
import { getClienteSession } from "@/lib/auth/cliente";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/cliente/me
 *
 * Retorna dados do cliente LOGADO pra pré-preencher formulários e evitar
 * pedir cadastro de novo numa segunda compra.
 *
 * Resposta:
 *   { ok: true, logado: true, cpf, nome, email, telefone }
 *   ou
 *   { ok: true, logado: false }
 */
export async function GET() {
  const session = await getClienteSession();
  if (!session) {
    return NextResponse.json({ ok: true, logado: false });
  }

  // Busca dados completos (email + telefone) na lnb_cliente_auth via RPC
  const supa = await createClient();
  const { data, error } = await supa
    .from("lnb_cliente_auth")
    .select("cpf, nome, email, telefone")
    .eq("cpf", session.cpf)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({
      ok: true,
      logado: true,
      cpf: session.cpf,
      nome: session.nome,
      email: "",
      telefone: "",
    });
  }

  return NextResponse.json({
    ok: true,
    logado: true,
    cpf: data.cpf,
    nome: data.nome,
    email: data.email || "",
    telefone: data.telefone || "",
  });
}
