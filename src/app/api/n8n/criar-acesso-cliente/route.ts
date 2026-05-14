import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkN8nAuth } from "@/lib/n8n/auth";
import { cleanCPF, isValidCPF } from "@/lib/utils";

export const runtime = "nodejs";

/**
 * POST /api/n8n/criar-acesso-cliente
 *
 * Gera senha temporária pro cliente acessar o painel.
 * Usado pela Maia logo após o pagamento da Consulta ser confirmado.
 *
 * Body:
 *   {
 *     cpf: "07468391971",
 *     nome: "Alex do Rocio Alves",
 *     email: "cwbrocio@gmail.com",
 *     telefone: "5511997440101"
 *   }
 *
 * Resposta:
 *   {
 *     ok: true,
 *     cpf: "07468391971",
 *     cpf_formatado: "074.683.919-71",
 *     senha_temporaria: "Lnb#a4kP9",
 *     url_login: "https://limpanomebrazil.com.br/conta/login"
 *   }
 *
 * Headers:
 *   Authorization: Bearer <N8N_SHARED_TOKEN>
 */
export async function POST(req: Request) {
  const auth = checkN8nAuth(req);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const cpf = cleanCPF(String(body?.cpf || ""));
  const nome = String(body?.nome || "").trim();
  const email = String(body?.email || "").trim();
  const telefone = String(body?.telefone || "").replace(/\D/g, "");

  if (!isValidCPF(cpf)) {
    return NextResponse.json({ ok: false, error: "CPF inválido" }, { status: 400 });
  }

  const supa = await createClient();
  const { data, error } = await supa.rpc("lnb_gerar_senha_temporaria", {
    p_cpf: cpf,
    p_nome: nome,
    p_email: email,
    p_telefone: telefone,
  });

  if (error) {
    console.error("[criar-acesso-cliente] erro RPC:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const r = data as { ok: boolean; senha_temporaria: string };
  const cpfFmt = `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`;
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://limpanomebrazil.com.br";

  return NextResponse.json({
    ok: true,
    cpf,
    cpf_formatado: cpfFmt,
    senha_temporaria: r.senha_temporaria,
    url_login: `${siteUrl}/conta/login`,
    url_relatorio: `${siteUrl}/conta/relatorio`,
  });
}
