/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderToBuffer } from "@react-pdf/renderer";
import { createAdminClient } from "@/lib/supabase/admin";
import { RelatorioConsultaPDF, type RelatorioInput } from "./relatorio-consulta";

const BUCKET = "lnb-relatorios";

/**
 * Gera o PDF do relatório de consulta, faz upload no Supabase Storage
 * (bucket público lnb-relatorios) e retorna a URL pública.
 */
export async function gerarESalvarRelatorio(
  data: RelatorioInput
): Promise<{ ok: true; pdfUrl: string; path: string } | { ok: false; error: string }> {
  try {
    // 1) Gera PDF como Buffer (server-side, sem Chrome)
    // RelatorioConsultaPDF retorna <Document>, que é o tipo esperado por renderToBuffer.
    // Cast porque o type checker do react-pdf é estrito sobre DocumentProps.
    const element = RelatorioConsultaPDF({ data }) as any;
    const buffer = await renderToBuffer(element);

    // 2) Upload pra Supabase Storage
    const cpfClean = data.cpf.replace(/\D/g, "");
    const ts = Date.now();
    const path = `consultas/${cpfClean}/${ts}-relatorio.pdf`;

    const admin = createAdminClient();
    const { error: upErr } = await admin.storage.from(BUCKET).upload(path, buffer, {
      contentType: "application/pdf",
      upsert: true,
    });
    if (upErr) {
      return { ok: false, error: `Upload falhou: ${upErr.message}` };
    }

    // 3) URL pública (bucket lnb-relatorios é público)
    const { data: urlData } = admin.storage.from(BUCKET).getPublicUrl(path);

    return { ok: true, pdfUrl: urlData.publicUrl, path };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
