import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";
import { consultarCPF, parseConsulta, type APIFullResultado } from "@/lib/api-full";
import { gerarESalvarRelatorio } from "@/lib/pdf/gerar-relatorio";
import { cleanCPF, isValidCPF } from "@/lib/utils";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/admin/reprocessar-consulta
 * Body: { cpf: "12345678901" }
 *
 * Pega consulta existente que falhou (provider_status != 'ok' OU tem_pendencia null),
 * chama API Full de novo, regera PDF, atualiza banco.
 *
 * ⚠ Custa R$ 2,49 por chamada (consome saldo API Full).
 * Só use pra reprocessar consultas pagas que falharam.
 */
export async function POST(req: Request) {
  await requireAdmin();

  const body = await req.json().catch(() => ({}));
  const cpfRaw = String((body as { cpf?: string }).cpf || "");
  const cpf = cleanCPF(cpfRaw);

  if (!isValidCPF(cpf)) {
    return NextResponse.json({ ok: false, error: "CPF inválido" }, { status: 400 });
  }

  const t0 = Date.now();
  const supa = await createClient();

  // Verifica se cliente existe e pagou
  const { data: rowsArr } = await supa
    .from("LNB_Consultas")
    .select("id, cpf, nome, email, telefone, consulta_paga, pdf_url, tem_pendencia, provider_status")
    .eq("cpf", cpf)
    .limit(1);
  const row = rowsArr?.[0] as Record<string, unknown> | undefined;

  if (!row) {
    return NextResponse.json(
      { ok: false, error: "CPF não encontrado em LNB_Consultas" },
      { status: 404 }
    );
  }
  if (!row.consulta_paga) {
    return NextResponse.json(
      { ok: false, error: "Consulta ainda não foi paga" },
      { status: 400 }
    );
  }

  const nome = String(row.nome || "");
  const email = String(row.email || "");
  const telefone = String(row.telefone || "");

  let raw: APIFullResultado | null = null;
  let parsed: ReturnType<typeof parseConsulta> | null = null;

  try {
    raw = await consultarCPF(cpf);
    parsed = parseConsulta(raw);
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: "Falha na API Full: " + (e instanceof Error ? e.message : String(e)),
      },
      { status: 502 }
    );
  }

  // Extrai score
  const rawObj = (raw as Record<string, unknown>) || {};
  let score: number | undefined;
  function findSaida(o: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
    if (!o || typeof o !== "object") return undefined;
    const dados = o.dados as Record<string, unknown> | undefined;
    if (dados?.data && typeof dados.data === "object") {
      const dd = dados.data as Record<string, unknown>;
      if (dd.saida && typeof dd.saida === "object") return dd.saida as Record<string, unknown>;
      return dd;
    }
    if (o.data && typeof o.data === "object") return o.data as Record<string, unknown>;
    return o;
  }
  const saida = findSaida(rawObj) || {};
  const scoresArr = saida.Scores as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(scoresArr) && scoresArr.length > 0) {
    const sNum = parseFloat(String(scoresArr[0]?.score ?? scoresArr[0]?.valor ?? ""));
    if (!isNaN(sNum)) score = sNum;
  }

  // Pendências (compatibilidade com webhook normal)
  const pendencias: Array<{ credor: string; valor: number; data?: string }> = [];
  if (parsed?.pendencias) {
    for (const p of parsed.pendencias) {
      pendencias.push({ credor: p.credor, valor: p.valor, data: p.data });
    }
  }

  // Regera PDF
  let pdfUrl: string | null = null;
  try {
    const r = await gerarESalvarRelatorio({
      cpf,
      nome,
      email,
      telefone,
      score,
      tem_pendencia: !!parsed?.tem_pendencia,
      qtd_pendencias: parsed?.qtd_pendencias || 0,
      total_dividas: parsed?.total_dividas || 0,
      pendencias,
    });
    if (r.ok) pdfUrl = r.pdfUrl;
    else throw new Error(r.error || "PDF erro desconhecido");
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: "Falha gerar PDF: " + (e instanceof Error ? e.message : String(e)),
      },
      { status: 500 }
    );
  }

  // Atualiza banco com tudo
  const rpc = await supa.rpc("webhook_set_consulta_resultado", {
    p_cpf: cpf,
    p_pdf_url: pdfUrl,
    p_tem_pendencia: !!parsed?.tem_pendencia,
    p_qtd_pendencias: parsed?.qtd_pendencias || 0,
    p_total_dividas: parsed?.total_dividas || 0,
    p_resumo: parsed?.tem_pendencia
      ? `Foram encontradas ${parsed.qtd_pendencias} pendência(s) em seu nome, totalizando R$ ${parsed.total_dividas.toFixed(2)}.`
      : "Não foram encontradas pendências em seu nome. Continue mantendo as contas em dia.",
    p_resultado_raw: raw as unknown as object,
    p_score: score ?? null,
  });

  if (rpc.error) {
    return NextResponse.json(
      { ok: false, error: "RPC erro: " + rpc.error.message },
      { status: 500 }
    );
  }

  // CRM também
  if (telefone) {
    await supa.rpc("lnb_crm_set_consulta_resultado", {
      p_telefone: telefone,
      p_score: score ?? null,
      p_tem_pendencia: !!parsed?.tem_pendencia,
      p_qtd_pendencias: parsed?.qtd_pendencias || 0,
      p_total_dividas: parsed?.total_dividas || 0,
      p_pdf_url: pdfUrl,
    });
  }

  return NextResponse.json({
    ok: true,
    cpf,
    nome,
    pdf_url: pdfUrl,
    score,
    tem_pendencia: parsed?.tem_pendencia,
    qtd_pendencias: parsed?.qtd_pendencias,
    total_dividas: parsed?.total_dividas,
    latencia_ms: Date.now() - t0,
  });
}
