import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkN8nAuth } from "@/lib/n8n/auth";
import { cleanCPF } from "@/lib/utils";

export const runtime = "nodejs";

/**
 * POST /api/n8n/status-processo
 *
 * Consulta o status do processo de limpeza/consulta/blindagem do cliente.
 * Maia usa pra responder quando cliente pergunta "tá pronto?", "como tá meu processo?".
 *
 * Body:
 *   { telefone: "5511997440101" }
 *   ou
 *   { cpf: "48058310816" }
 */
export async function POST(req: Request) {
  const auth = checkN8nAuth(req);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const telefone = String(body?.telefone || "").replace(/\D/g, "");
  const cpf = cleanCPF(String(body?.cpf || ""));

  if (!telefone && !cpf) {
    return NextResponse.json(
      { ok: false, error: "telefone ou cpf obrigatório" },
      { status: 400 }
    );
  }

  const supa = await createClient();

  // 1) Estado no CRM
  let crm: Record<string, unknown> | null = null;
  if (telefone) {
    const { data } = await supa
      .from("LNB - CRM")
      .select(
        '"Lead", "Interessado", "Qualificado", "Fechado", "perdido", valor_servico, tipo_servico, score, tem_pendencia, qtd_pendencias, total_dividas, pdf_url, status_pagamento, last_interaction'
      )
      .eq("telefone", telefone)
      .maybeSingle();
    crm = (data ?? null) as Record<string, unknown> | null;
  }

  // 2) Consulta paga + resultado API Full
  let consulta: Record<string, unknown> | null = null;
  if (cpf) {
    const { data } = await supa
      .from("LNB_Consultas")
      .select("cpf, consulta_paga, tem_pendencia, qtd_pendencias, total_dividas, pdf_url, fechou_limpeza, created_at")
      .eq("cpf", cpf)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    consulta = (data ?? null) as Record<string, unknown> | null;
  }

  // 3) Processos ativos (limpeza/blindagem em andamento)
  let processos: Array<Record<string, unknown>> = [];
  if (cpf) {
    const { data } = await supa
      .from("lnb_processos")
      .select("tipo, etapa, started_at, finalizado_em, ultima_atualizacao")
      .eq("cpf", cpf)
      .order("started_at", { ascending: false })
      .limit(5);
    processos = (data ?? []) as Array<Record<string, unknown>>;
  }

  // 4) Texto resumo pra Maia usar diretamente na resposta
  const partes: string[] = [];
  if (crm) {
    if (crm.Fechado === true) {
      partes.push("✅ Cliente já FECHOU venda (paga limpeza R$ 500,00)");
    } else if (crm.Qualificado === true) {
      partes.push("⏳ Cliente qualificado, link de pagamento enviado");
    } else if (crm.Interessado === true) {
      partes.push("📝 Cliente passou os 4 dados (Interessado)");
    } else if (crm.Lead === true) {
      partes.push("👋 Cliente em Lead (1ª interação)");
    } else if (crm.perdido === true) {
      partes.push("❌ Cliente em Perdido");
    }
    if (crm.tipo_servico) partes.push(`Último serviço ofertado: ${crm.tipo_servico} (${crm.valor_servico})`);
  }

  if (consulta) {
    const c = consulta;
    if (c.consulta_paga) {
      if (c.tem_pendencia) {
        partes.push(`Consulta paga: ${c.qtd_pendencias} pendências, total R$ ${c.total_dividas}`);
      } else {
        partes.push(`Consulta paga: nome LIMPO, sem pendências`);
      }
      if (c.pdf_url) partes.push(`PDF disponível: ${c.pdf_url}`);
    }
    if (c.fechou_limpeza) {
      partes.push(`Limpeza CONTRATADA — em andamento`);
    }
  }

  if (processos.length) {
    for (const p of processos) {
      partes.push(`Processo ${p.tipo}: etapa "${p.etapa}" (atualizado: ${p.ultima_atualizacao || p.started_at})`);
    }
  }

  return NextResponse.json({
    ok: true,
    telefone,
    cpf,
    crm,
    consulta,
    processos,
    resumo: partes.length > 0 ? partes.join(" · ") : "Nenhum registro encontrado pra esse contato",
  });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "POST /api/n8n/status-processo",
    body: { telefone: "...", cpf: "..." },
  });
}
