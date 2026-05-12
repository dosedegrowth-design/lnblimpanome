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

  // Busca dados completos via RPC SECURITY DEFINER (lnb_cliente_auth tem RLS)
  const supa = await createClient();
  const { data, error } = await supa.rpc("lnb_cliente_me", { p_cpf: session.cpf });

  if (error) {
    console.error("[/api/cliente/me] rpc erro:", error);
    return NextResponse.json({
      ok: true,
      logado: true,
      cpf: session.cpf,
      nome: session.nome,
      email: "",
      telefone: "",
    });
  }

  const d = data as { ok: boolean; cpf?: string; nome?: string; email?: string; telefone?: string };
  if (!d?.ok) {
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
    cpf: d.cpf || session.cpf,
    nome: d.nome || session.nome,
    email: d.email || "",
    telefone: d.telefone || "",
  });
}
