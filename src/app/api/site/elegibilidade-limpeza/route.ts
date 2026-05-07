import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cleanCPF, isValidCPF } from "@/lib/utils";

/**
 * GET /api/site/elegibilidade-limpeza?cpf=...
 *
 * Retorna se o CPF pode contratar limpeza.
 * Usado pelo /contratar pra validar antes de processar pagamento.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const cpf = cleanCPF(url.searchParams.get("cpf") || "");

  if (!isValidCPF(cpf)) {
    return NextResponse.json(
      { ok: false, pode: false, motivo: "cpf_invalido", mensagem: "CPF inválido" },
      { status: 400 }
    );
  }

  const supa = await createClient();
  const { data, error } = await supa.rpc("cliente_pode_contratar_limpeza", { p_cpf: cpf });

  if (error) {
    return NextResponse.json(
      { ok: false, pode: false, motivo: "erro", mensagem: "Erro ao validar" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, ...(data as object) });
}
