import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * GET /api/admin/teste-pdf
 *
 * Testa SOMENTE a geração de PDF — sem chamar API Full, sem custar nada.
 * Usa dados mock fixos. Retorna JSON com erro detalhado se falhar.
 *
 * Usa cliente Supabase com anon key (sem service_role).
 */
export async function GET() {
  await requireAdmin();

  const t0 = Date.now();
  const debug: Record<string, unknown> = {
    step: "init",
    timestamp: new Date().toISOString(),
  };

  try {
    debug.step = "import_pdfkit";
    const PDFDocument = (await import("pdfkit")).default;
    debug.pdfkit_imported = true;

    debug.step = "criar_documento";
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    debug.documento_criado = true;

    debug.step = "coletar_buffer";
    const chunks: Buffer[] = [];
    const bufferPromise = new Promise<Buffer>((resolve, reject) => {
      doc.on("data", (c: Buffer) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
    });

    debug.step = "escrever_conteudo";
    doc.fontSize(20).text("Teste PDF LNB", 100, 100);
    doc.fontSize(12).text(`Gerado em: ${new Date().toISOString()}`, 100, 150);
    doc.end();
    debug.conteudo_escrito = true;

    debug.step = "aguardar_buffer";
    const buffer = await bufferPromise;
    debug.buffer_size = buffer.length;
    debug.buffer_ok = true;

    debug.step = "import_supabase_client";
    const { createClient } = await import("@supabase/supabase-js");
    debug.supabase_imported = true;

    debug.step = "criar_supabase_client";
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    debug.url_ok = !!url;
    debug.key_ok = !!key;
    const supa = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    debug.supabase_client_criado = true;

    debug.step = "upload_storage";
    const path = `teste/${Date.now()}-teste.pdf`;
    const { error: upErr } = await supa.storage
      .from("lnb-relatorios")
      .upload(path, buffer, {
        contentType: "application/pdf",
        upsert: true,
      });
    if (upErr) {
      debug.upload_error = upErr.message;
      throw new Error(`Upload falhou: ${upErr.message}`);
    }
    debug.upload_ok = true;

    debug.step = "get_public_url";
    const { data: urlData } = supa.storage.from("lnb-relatorios").getPublicUrl(path);
    debug.pdf_url = urlData.publicUrl;

    return NextResponse.json({
      ok: true,
      latencia_ms: Date.now() - t0,
      pdf_url: urlData.publicUrl,
      path,
      debug,
    });
  } catch (e) {
    const errInfo = {
      name: e instanceof Error ? e.name : "Unknown",
      message: e instanceof Error ? e.message : String(e),
      stack:
        e instanceof Error && e.stack
          ? e.stack.split("\n").slice(0, 10)
          : undefined,
      raw: String(e),
    };
    return NextResponse.json(
      {
        ok: false,
        latencia_ms: Date.now() - t0,
        falhou_em: debug.step,
        erro: errInfo,
        debug,
      },
      { status: 500 }
    );
  }
}
