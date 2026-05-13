import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";
import { gerarESalvarRelatorio } from "@/lib/pdf/gerar-relatorio";
import { parseConsulta } from "@/lib/api-full";
import { cleanCPF, isValidCPF } from "@/lib/utils";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/admin/regerar-pdf
 * Body: { cpf: "12345678901" }
 *
 * Regera o PDF baseado nos dados que JÁ ESTÃO em LNB_Consultas
 * (resultado_raw, score, tem_pendencia, etc).
 *
 * NÃO chama a API Full — não tem custo. Útil quando:
 * - PDF antigo está errado (foi gerado com dados zerados)
 * - Atualizar layout do PDF sem nova consulta
 * - Cliente perdeu o PDF e quer baixar de novo (mas link já tá ativo então isso é raro)
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

  const { data: rowsArr } = await supa
    .from("LNB_Consultas")
    .select(
      "id, cpf, nome, email, telefone, tem_pendencia, qtd_pendencias, total_dividas, score, resultado_raw"
    )
    .eq("cpf", cpf)
    .limit(1);
  const row = rowsArr?.[0] as Record<string, unknown> | undefined;

  if (!row) {
    return NextResponse.json(
      { ok: false, error: "CPF não encontrado em LNB_Consultas" },
      { status: 404 }
    );
  }

  const nome = String(row.nome || "");
  const email = String(row.email || "");
  const telefone = String(row.telefone || "");
  const score = (row.score as number | null) ?? undefined;

  // Tenta re-parsear pra extrair pendências detalhadas (pra lista do PDF)
  let pendencias: Array<{ credor: string; valor: number; data?: string }> = [];
  if (row.resultado_raw && typeof row.resultado_raw === "object") {
    try {
      const parsed = parseConsulta(row.resultado_raw as never);
      pendencias = parsed.pendencias.map((p) => ({
        credor: p.credor,
        valor: p.valor,
        data: p.data,
      }));
    } catch {}
  }

  // Regenera PDF
  let pdfUrl: string | null = null;
  try {
    const r = await gerarESalvarRelatorio({
      cpf,
      nome,
      email,
      telefone,
      score,
      tem_pendencia: !!row.tem_pendencia,
      qtd_pendencias: (row.qtd_pendencias as number) || 0,
      total_dividas: (row.total_dividas as number) || 0,
      pendencias,
    });
    if (r.ok) pdfUrl = r.pdfUrl;
    else throw new Error(r.error || "PDF erro");
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: "Falha gerar PDF: " + (e instanceof Error ? e.message : String(e)),
      },
      { status: 500 }
    );
  }

  // Atualiza só o pdf_url
  await supa.rpc("webhook_set_consulta_resultado", {
    p_cpf: cpf,
    p_pdf_url: pdfUrl,
    p_tem_pendencia: !!row.tem_pendencia,
    p_qtd_pendencias: (row.qtd_pendencias as number) || 0,
    p_total_dividas: (row.total_dividas as number) || 0,
    p_resumo: row.tem_pendencia
      ? `Foram encontradas ${row.qtd_pendencias} pendência(s) em seu nome.`
      : "Não foram encontradas pendências em seu nome.",
    p_resultado_raw: null,
    p_score: score ?? null,
  });

  return NextResponse.json({
    ok: true,
    cpf,
    nome,
    pdf_url: pdfUrl,
    score,
    tem_pendencia: row.tem_pendencia,
    latencia_ms: Date.now() - t0,
  });
}
