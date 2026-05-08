import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";
import { gerarESalvarRelatorio } from "@/lib/pdf/gerar-relatorio";
import { cleanCPF, isValidCPF } from "@/lib/utils";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/admin/gerar-pdf
 *
 * Gera (ou regenera) o PDF de relatório de uma consulta de CPF.
 * Lê dados de LNB_Consultas, gera PDF via @react-pdf/renderer,
 * faz upload em Supabase Storage e atualiza pdf_url na tabela.
 *
 * Body: { cpf: "..." }
 */
export async function POST(req: Request) {
  await requireAdmin();

  const body = await req.json().catch(() => ({}));
  const cpf = cleanCPF(String(body?.cpf || ""));
  if (!isValidCPF(cpf)) {
    return NextResponse.json({ ok: false, error: "CPF inválido" }, { status: 400 });
  }

  const supa = await createClient();
  const { data: consulta, error } = await supa
    .from("LNB_Consultas")
    .select(
      "cpf, nome, email, telefone, tem_pendencia, qtd_pendencias, total_dividas, resultado_raw, created_at"
    )
    .eq("cpf", cpf)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !consulta) {
    return NextResponse.json(
      { ok: false, error: "Consulta não encontrada pra esse CPF" },
      { status: 404 }
    );
  }

  // Extrai score + pendências do raw (formato e-boavista API Full)
  const raw = (consulta.resultado_raw as Record<string, unknown>) || {};
  const score =
    typeof raw.Score === "number"
      ? raw.Score
      : typeof raw.score === "number"
      ? raw.score
      : undefined;

  const pendencias: Array<{ credor: string; valor: number; data?: string }> = [];
  if (Array.isArray(raw.RegistroDeDebitos)) {
    for (const d of raw.RegistroDeDebitos as Array<Record<string, unknown>>) {
      pendencias.push({
        credor: String(d.Credor || "Credor"),
        valor: parseFloat(String(d.Valor ?? 0)) || 0,
        data: d.Data ? String(d.Data) : undefined,
      });
    }
  }
  if (Array.isArray(raw.Protestos)) {
    for (const p of raw.Protestos as Array<Record<string, unknown>>) {
      pendencias.push({
        credor: String(p.Credor || "Protesto"),
        valor: parseFloat(String(p.Valor ?? 0)) || 0,
        data: p.Data ? String(p.Data) : undefined,
      });
    }
  }

  const result = await gerarESalvarRelatorio({
    cpf: consulta.cpf,
    nome: consulta.nome || undefined,
    email: consulta.email || undefined,
    telefone: consulta.telefone || undefined,
    score,
    tem_pendencia: !!consulta.tem_pendencia,
    qtd_pendencias: consulta.qtd_pendencias || 0,
    total_dividas: Number(consulta.total_dividas) || 0,
    pendencias,
    data_consulta: consulta.created_at
      ? new Date(consulta.created_at).toLocaleDateString("pt-BR")
      : undefined,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  }

  // Atualiza pdf_url na consulta via RPC SECURITY DEFINER (sem service_role na escrita)
  await supa.rpc("webhook_set_pdf_url" as never, {
    p_cpf: cpf,
    p_pdf_url: result.pdfUrl,
  } as never);

  return NextResponse.json({
    ok: true,
    pdf_url: result.pdfUrl,
    path: result.path,
  });
}

/**
 * GET /api/admin/gerar-pdf?cpf=... — preview rápido (mesmo POST)
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const cpf = url.searchParams.get("cpf");
  if (!cpf) return NextResponse.json({ ok: false, error: "cpf obrigatório" }, { status: 400 });
  return POST(
    new Request(req.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cpf }),
    })
  );
}
