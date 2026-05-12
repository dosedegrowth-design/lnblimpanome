import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cleanCPF, isValidCPF, cleanCNPJ, isValidCNPJ } from "@/lib/utils";

/**
 * GET /api/site/elegibilidade-limpeza?cpf=...        (PF)
 * GET /api/site/elegibilidade-limpeza?cnpj=...       (PJ)
 *
 * Retorna se o documento pode contratar limpeza.
 * Usado pelo /contratar pra validar antes de processar pagamento.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const cpfRaw = url.searchParams.get("cpf");
  const cnpjRaw = url.searchParams.get("cnpj");

  const supa = await createClient();

  if (cnpjRaw) {
    const cnpj = cleanCNPJ(cnpjRaw);
    if (!isValidCNPJ(cnpj)) {
      return NextResponse.json(
        { ok: false, pode: false, motivo: "cnpj_invalido", mensagem: "CNPJ inválido" },
        { status: 400 }
      );
    }
    const { data, error } = await supa.rpc("cliente_pode_contratar_limpeza_cnpj", { p_cnpj: cnpj });
    if (error) {
      return NextResponse.json(
        { ok: false, pode: false, motivo: "erro", mensagem: "Erro ao validar" },
        { status: 500 }
      );
    }
    return NextResponse.json({ ok: true, tipo: "CNPJ", ...(data as object) });
  }

  // CPF (default)
  const cpf = cleanCPF(cpfRaw || "");
  if (!isValidCPF(cpf)) {
    return NextResponse.json(
      { ok: false, pode: false, motivo: "cpf_invalido", mensagem: "CPF inválido" },
      { status: 400 }
    );
  }

  const { data, error } = await supa.rpc("cliente_pode_contratar_limpeza", { p_cpf: cpf });
  if (error) {
    return NextResponse.json(
      { ok: false, pode: false, motivo: "erro", mensagem: "Erro ao validar" },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true, tipo: "CPF", ...(data as object) });
}
