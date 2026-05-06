import { NextResponse } from "next/server";
import { registerCliente } from "@/lib/auth/cliente";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { cpf, senha, nome, email, telefone } = body as {
    cpf?: string; senha?: string; nome?: string; email?: string | null; telefone?: string | null;
  };

  if (!cpf || !senha || !nome) {
    return NextResponse.json({ ok: false, error: "CPF, nome e senha são obrigatórios" }, { status: 400 });
  }

  const result = await registerCliente({ cpf, senha, nome, email, telefone });
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
