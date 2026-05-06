import { NextResponse } from "next/server";
import { loginCliente, setClienteSession } from "@/lib/auth/cliente";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { cpf, senha } = body as { cpf?: string; senha?: string };

  if (!cpf || !senha) {
    return NextResponse.json({ ok: false, error: "CPF e senha são obrigatórios" }, { status: 400 });
  }

  const result = await loginCliente(cpf, senha);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 401 });
  }

  await setClienteSession({ cpf: result.cpf, nome: result.nome });
  return NextResponse.json({ ok: true });
}
