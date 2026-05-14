import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkN8nAuth } from "@/lib/n8n/auth";
import { cleanCPF, isValidCPF } from "@/lib/utils";

export const runtime = "nodejs";

/**
 * POST /api/n8n/calcular-valor-limpeza
 *
 * Calcula o valor da Limpeza pro CPF, considerando desconto de 15 dias
 * da consulta paga. Maia chama isso ANTES de oferecer a Limpeza.
 *
 * Body:
 *   { cpf: "07468391971" }
 *
 * Resposta:
 *   {
 *     ok: true,
 *     valor_cheio: 500.00,
 *     valor_com_desconto: 470.01,
 *     valor_final: 470.01,         // o valor que vai cobrar
 *     desconto: 29.99,
 *     tem_desconto: true,
 *     dias_restantes: 14,
 *     consulta_paga_em: "2026-05-13T13:18:34.639561+00:00",
 *     mensagem_maia: "Você fez a consulta há 1 dia, então tem desconto..."
 *   }
 */
export async function POST(req: Request) {
  const auth = checkN8nAuth(req);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const cpf = cleanCPF(String(body?.cpf || ""));

  if (!isValidCPF(cpf)) {
    return NextResponse.json({ ok: false, error: "CPF inválido" }, { status: 400 });
  }

  const supa = await createClient();
  const { data, error } = await supa.rpc("lnb_calcular_valor_limpeza", { p_cpf: cpf });

  if (error) {
    console.error("[calcular-valor-limpeza] erro RPC:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const r = data as {
    valor_cheio: number;
    valor_com_desconto: number;
    desconto: number;
    tem_desconto: boolean;
    dias_restantes: number;
    consulta_paga_em: string | null;
    validade_dias: number;
  };

  const valorFinal = r.tem_desconto ? r.valor_com_desconto : r.valor_cheio;

  // Texto pré-pronto pra Maia usar no WhatsApp
  let mensagemMaia: string;
  if (r.tem_desconto) {
    mensagemMaia =
      `🎯 Limpeza de Nome: R$ ${r.valor_cheio.toFixed(2).replace(".", ",")}\n` +
      `Você já fez a consulta, então tem R$ ${r.desconto.toFixed(2).replace(".", ",")} de desconto! ` +
      `(válido por ${r.dias_restantes} dias)\n` +
      `Valor final: R$ ${valorFinal.toFixed(2).replace(".", ",")} 💙`;
  } else if (r.consulta_paga_em) {
    mensagemMaia =
      `🎯 Limpeza de Nome: R$ ${r.valor_cheio.toFixed(2).replace(".", ",")}\n` +
      `O desconto da sua consulta expirou (válido por ${r.validade_dias} dias), o valor é o cheio.`;
  } else {
    mensagemMaia =
      `🎯 Limpeza de Nome: R$ ${r.valor_cheio.toFixed(2).replace(".", ",")}\n` +
      `Pra contratar a limpeza, faça antes a Consulta CPF (R$ 29,99) — ` +
      `assim você ainda tem desconto de R$ 29,99 na limpeza por 15 dias.`;
  }

  return NextResponse.json({
    ok: true,
    cpf,
    valor_cheio: r.valor_cheio,
    valor_com_desconto: r.valor_com_desconto,
    valor_final: valorFinal,
    desconto: r.desconto,
    tem_desconto: r.tem_desconto,
    dias_restantes: r.dias_restantes,
    consulta_paga_em: r.consulta_paga_em,
    mensagem_maia: mensagemMaia,
  });
}
