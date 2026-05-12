import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cleanCPF, isValidCPF, cleanCNPJ, isValidCNPJ } from "@/lib/utils";

/**
 * GET /api/site/consulta-status/[doc]
 *
 * Polling: cliente espera o resultado depois de pagar.
 * Aceita CPF (11 dígitos) OU CNPJ (14 dígitos).
 * O nome do segmento `[cpf]` é histórico — aceita ambos.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ cpf: string }> }
) {
  const { cpf: rawDoc } = await ctx.params;
  const docNumbers = (rawDoc || "").replace(/\D/g, "");

  if (docNumbers.length === 14) {
    const cnpj = cleanCNPJ(rawDoc);
    if (!isValidCNPJ(cnpj)) {
      return NextResponse.json({ ok: false, error: "CNPJ inválido" }, { status: 400 });
    }
    return await consultaStatusCNPJ(cnpj);
  }

  const cpf = cleanCPF(rawDoc);
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
    tipo: "CPF",
    paga: !!consulta?.consulta_paga,
    realizada,
    pdf_pronto: !!consulta?.pdf_url,
    tem_pendencia: realizada ? !!consulta?.tem_pendencia : null,
    qtd_pendencias: consulta?.qtd_pendencias ?? null,
    total_dividas: consulta?.total_dividas ?? null,
  });
}

async function consultaStatusCNPJ(cnpj: string) {
  const supa = await createClient();
  const { data, error } = await supa
    .from("LNB_Consultas")
    .select("cnpj, tipo_documento, consulta_paga, tem_pendencia, qtd_pendencias, total_dividas, pdf_url, razao_social, created_at")
    .eq("cnpj", cnpj)
    .eq("tipo_documento", "CNPJ")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const realizada =
    !!data &&
    data.tem_pendencia !== null &&
    data.tem_pendencia !== undefined;

  return NextResponse.json({
    ok: true,
    tipo: "CNPJ",
    paga: !!data?.consulta_paga,
    realizada,
    pdf_pronto: !!data?.pdf_url,
    tem_pendencia: realizada ? !!data?.tem_pendencia : null,
    qtd_pendencias: data?.qtd_pendencias ?? null,
    total_dividas: data?.total_dividas ?? null,
    razao_social: data?.razao_social ?? null,
  });
}
