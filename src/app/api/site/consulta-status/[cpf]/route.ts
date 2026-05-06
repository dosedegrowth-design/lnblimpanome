import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cleanCPF, isValidCPF } from "@/lib/utils";

/**
 * GET /api/site/consulta-status/[cpf]
 *
 * Polling: cliente espera o resultado depois de pagar.
 * Lê LNB_Consultas pelo CPF e retorna o estado atual.
 *
 * Públicamente acessível mas só retorna campos seguros (sem score nem pendências
 * antes de pagar — esses ficam só na área logada).
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ cpf: string }> }
) {
  const { cpf: rawCpf } = await ctx.params;
  const cpf = cleanCPF(rawCpf);
  if (!isValidCPF(cpf)) {
    return NextResponse.json({ ok: false, error: "CPF inválido" }, { status: 400 });
  }

  const supa = await createClient();
  const { data, error } = await supa.rpc("lnb_cliente_dashboard", { p_cpf: cpf });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const consulta = (data as { consulta: unknown })?.consulta as
    | { consulta_paga?: boolean; tem_pendencia?: boolean; pdf_url?: string }
    | null;

  return NextResponse.json({
    ok: true,
    paga: !!consulta?.consulta_paga,
    realizada: !!consulta && consulta.tem_pendencia !== null && consulta.tem_pendencia !== undefined,
    pdf_pronto: !!consulta?.pdf_url,
  });
}
