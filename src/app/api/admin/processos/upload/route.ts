import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/admin";

/**
 * POST /api/admin/processos/upload (multipart/form-data)
 * Campos:
 *   - file: File
 *   - processo_id: string
 *   - tipo: 'comprovante' | 'relatorio' | 'outro'
 *   - visivel_cliente: 'true' | 'false'
 */
export async function POST(req: Request) {
  const ctx = await requireAdmin();
  const form = await req.formData();
  const file = form.get("file") as File | null;
  const processoId = form.get("processo_id") as string | null;
  const tipo = (form.get("tipo") as string | null) || "outro";
  const visivelCliente = form.get("visivel_cliente") !== "false";

  if (!file || !processoId) {
    return NextResponse.json({ ok: false, error: "file e processo_id obrigatórios" }, { status: 400 });
  }

  // Limite 10MB
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ ok: false, error: "Arquivo muito grande (máx 10MB)" }, { status: 400 });
  }

  const ext = file.name.split(".").pop() || "bin";
  const ts = Date.now();
  const path = `${processoId}/${ts}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const admin = createAdminClient();
  const buf = Buffer.from(await file.arrayBuffer());

  const { error: upErr } = await admin.storage.from("lnb-processos").upload(path, buf, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (upErr) {
    return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });
  }

  // Registra na tabela
  const { data, error } = await admin
    .from("lnb_processo_arquivos")
    .insert({
      processo_id: processoId,
      tipo,
      nome_arquivo: file.name,
      caminho_storage: path,
      tamanho_bytes: file.size,
      mime_type: file.type,
      visivel_cliente: visivelCliente,
      upload_por: ctx.authId,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, arquivo_id: data.id, path });
}
