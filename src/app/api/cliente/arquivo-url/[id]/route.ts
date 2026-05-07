import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getClienteSession } from "@/lib/auth/cliente";

/**
 * GET /api/cliente/arquivo-url/[id]
 * Cliente pega URL assinada do arquivo do PRÓPRIO processo.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getClienteSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });

  const { id: arquivoId } = await ctx.params;

  const admin = createAdminClient();

  // Verifica que o arquivo pertence a um processo do cliente logado
  const { data: arquivo, error } = await admin
    .from("lnb_processo_arquivos")
    .select("caminho_storage, nome_arquivo, visivel_cliente, processo_id, lnb_processos!inner(cpf)")
    .eq("id", arquivoId)
    .single();

  if (error || !arquivo) {
    return NextResponse.json({ ok: false, error: "Arquivo não encontrado" }, { status: 404 });
  }
  if (!arquivo.visivel_cliente) {
    return NextResponse.json({ ok: false, error: "Arquivo restrito" }, { status: 403 });
  }
  // Type assertion pra Supabase relation
  const proc = arquivo.lnb_processos as unknown as { cpf: string };
  if (proc.cpf !== session.cpf) {
    return NextResponse.json({ ok: false, error: "Acesso negado" }, { status: 403 });
  }

  const { data: signed, error: e2 } = await admin.storage
    .from("lnb-processos")
    .createSignedUrl(arquivo.caminho_storage, 60 * 60 * 24 * 7);

  if (e2 || !signed) {
    return NextResponse.json({ ok: false, error: e2?.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, url: signed.signedUrl, nome: arquivo.nome_arquivo });
}
