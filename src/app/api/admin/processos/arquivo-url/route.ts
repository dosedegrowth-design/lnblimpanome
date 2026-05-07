import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/admin";

/**
 * GET /api/admin/processos/arquivo-url?arquivo_id=...
 * Retorna URL assinada (válida 7 dias) do arquivo no Storage privado.
 */
export async function GET(req: Request) {
  await requireAdmin();
  const url = new URL(req.url);
  const arquivoId = url.searchParams.get("arquivo_id");
  if (!arquivoId) {
    return NextResponse.json({ ok: false, error: "arquivo_id obrigatório" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: arquivo, error: e1 } = await admin
    .from("lnb_processo_arquivos")
    .select("caminho_storage, nome_arquivo")
    .eq("id", arquivoId)
    .single();

  if (e1 || !arquivo) {
    return NextResponse.json({ ok: false, error: "Arquivo não encontrado" }, { status: 404 });
  }

  const { data: signed, error: e2 } = await admin.storage
    .from("lnb-processos")
    .createSignedUrl(arquivo.caminho_storage, 60 * 60 * 24 * 7); // 7 dias

  if (e2 || !signed) {
    return NextResponse.json({ ok: false, error: e2?.message || "Falha ao assinar" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    url: signed.signedUrl,
    nome: arquivo.nome_arquivo,
  });
}
