import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cleanCPF, isValidCPF } from "@/lib/utils";

/**
 * GET /api/site/consulta-status/[cpf]
 *
 * Polling: cliente espera o resultado depois de pagar.
 * Lê LNB_Consultas pelo CPF e retorna o estado atual.
 *
 * Públicamente acessível mas só retorna campos seguros (sem score nem credores
 * — esses ficam só na área logada). Retorna tem_pendencia + qtd_pendencias pra
 * o upsell de Limpeza após resultado positivo.
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
    | {
        consulta_paga?: boolean;
        tem_pendencia?: boolean;
        qtd_pendencias?: number;
        total_dividas?: number;
        pdf_url?: string;
      }
    | null;

  const realizada =
    !!consulta &&
    consulta.tem_pendencia !== null &&
    consulta.tem_pendencia !== undefined;

  return NextResponse.json({
    ok: true,
    paga: !!consulta?.consulta_paga,
    realizada,
    pdf_pronto: !!consulta?.pdf_url,
    tem_pendencia: realizada ? !!consulta?.tem_pendencia : null,
    qtd_pendencias: consulta?.qtd_pendencias ?? null,
    total_dividas: consulta?.total_dividas ?? null,
  });
}
