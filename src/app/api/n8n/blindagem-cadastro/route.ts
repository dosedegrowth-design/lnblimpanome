import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkN8nAuth } from "@/lib/n8n/auth";
import { cleanCPF, isValidCPF } from "@/lib/utils";

export const runtime = "nodejs";

/**
 * POST /api/n8n/blindagem-cadastro
 *
 * Cadastra CPF em LNB_Blindagem pra monitoramento contínuo.
 * Substitui a tool blindagem_cadastro do v02.
 *
 * Body:
 *   {
 *     telefone: "...",
 *     cpf: "...",
 *     nome: "...",
 *     email?: "...",
 *     plano?: "mensal" | "anual",
 *   }
 */
export async function POST(req: Request) {
  const auth = checkN8nAuth(req);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const cpf = cleanCPF(String(body?.cpf || ""));
  const telefone = String(body?.telefone || "").replace(/\D/g, "");
  const nome = String(body?.nome || "").trim();
  const email = String(body?.email || "").trim();
  const plano = String(body?.plano || "mensal");
  const valor = plano === "anual" ? 299.0 : 29.9;

  if (!isValidCPF(cpf)) return NextResponse.json({ ok: false, error: "CPF inválido" }, { status: 400 });
  if (!telefone) return NextResponse.json({ ok: false, error: "telefone obrigatório" }, { status: 400 });
  if (!nome) return NextResponse.json({ ok: false, error: "nome obrigatório" }, { status: 400 });

  const supa = await createClient();
  const { data, error } = await supa
    .from("LNB_Blindagem")
    .upsert(
      {
        cpf,
        nome,
        telefone,
        email: email || null,
        ativo: true,
        plano,
        valor,
        proxima_verificacao: new Date().toISOString(),
        tem_pendencia_atual: null,
      },
      { onConflict: "cpf" }
    )
    .select("id, cpf, ativo, plano")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, blindagem: data });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "POST /api/n8n/blindagem-cadastro",
    body: { telefone: "...", cpf: "...", nome: "...", email: "...", plano: "mensal|anual" },
  });
}
