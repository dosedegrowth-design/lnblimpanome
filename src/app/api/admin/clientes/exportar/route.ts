/**
 * GET /api/admin/clientes/exportar?formato=completo|operacional&etapa=...
 *
 * formato=completo     -> CSV com TODAS colunas (nome, CPF, telefone, email, etapa, valor, etc)
 * formato=operacional  -> CSV apenas com Nome + CPF (pro time externo)
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin";

export const runtime = "nodejs";

interface Cliente {
  id: string;
  cpf: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  tipo: string | null;
  tag_servico: string | null;
  etapa: string;
  valor_pago: number | null;
  pdf_url: string | null;
  created_at: string;
  updated_at: string;
  finalizado_em: string | null;
  tem_pendencia: boolean | null;
  score: number | null;
  qtd_pendencias: number | null;
  total_dividas: number | null;
}

function csvEscape(v: unknown): string {
  if (v == null) return "";
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(req: Request) {
  await requireAdmin();
  const url = new URL(req.url);
  const formato = url.searchParams.get("formato") || "completo";
  const etapaFiltro = url.searchParams.get("etapa") || null;

  const supa = await createClient();
  const { data, error } = await supa.rpc("admin_clientes_list");
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const r = data as { ok: boolean; clientes: Cliente[] } | null;
  let clientes = r?.clientes ?? [];

  if (etapaFiltro) {
    clientes = clientes.filter((c) => c.etapa === etapaFiltro);
  }

  const fileName = `lnb-clientes-${formato}-${new Date().toISOString().slice(0, 10)}.csv`;

  let csv: string;
  if (formato === "operacional") {
    // SO nome + CPF (pro time externo)
    csv = "Nome,CPF\n";
    for (const c of clientes) {
      csv += `${csvEscape(c.nome)},${csvEscape(c.cpf)}\n`;
    }
  } else {
    // Completo
    csv = "Nome,CPF,Telefone,Email,Tag,Etapa,Tipo,Valor pago,Tem pendencia,Score,Qtd pendencias,Total dividas,Criado em,Finalizado em\n";
    for (const c of clientes) {
      csv += [
        csvEscape(c.nome),
        csvEscape(c.cpf),
        csvEscape(c.telefone),
        csvEscape(c.email),
        csvEscape(c.tag_servico),
        csvEscape(c.etapa),
        csvEscape(c.tipo),
        csvEscape(c.valor_pago != null ? Number(c.valor_pago).toFixed(2) : ""),
        csvEscape(c.tem_pendencia == null ? "" : c.tem_pendencia ? "Sim" : "Nao"),
        csvEscape(c.score),
        csvEscape(c.qtd_pendencias),
        csvEscape(c.total_dividas != null ? Number(c.total_dividas).toFixed(2) : ""),
        csvEscape(c.created_at?.slice(0, 19).replace("T", " ")),
        csvEscape(c.finalizado_em?.slice(0, 19).replace("T", " ")),
      ].join(",") + "\n";
    }
  }

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
