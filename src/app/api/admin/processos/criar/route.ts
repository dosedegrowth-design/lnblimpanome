import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin";
import { cleanCPF, isValidCPF } from "@/lib/utils";

/**
 * POST /api/admin/processos/criar
 * { cpf, tipo: 'limpeza'|'blindagem'|'consulta', responsavel_id?, observacoes? }
 */
export async function POST(req: Request) {
  await requireAdmin();
  const { cpf, tipo, responsavel_id, observacoes } = await req.json();

  const cleanedCpf = cleanCPF(cpf || "");
  if (!isValidCPF(cleanedCpf)) {
    return NextResponse.json({ ok: false, error: "CPF inválido" }, { status: 400 });
  }
  if (!["limpeza", "blindagem", "consulta"].includes(tipo)) {
    return NextResponse.json({ ok: false, error: "Tipo inválido" }, { status: 400 });
  }

  const supa = await createClient();
  const { data, error } = await supa.rpc("admin_processo_criar", {
    p_cpf: cleanedCpf,
    p_tipo: tipo,
    p_responsavel_id: responsavel_id ?? null,
    p_observacoes: observacoes ?? null,
  });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
