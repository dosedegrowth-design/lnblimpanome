/* eslint-disable @typescript-eslint/no-explicit-any */
import PDFDocument from "pdfkit";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const BUCKET = "lnb-relatorios";

/**
 * Cliente Supabase pra Storage — usa anon key (sem service_role).
 * As policies do bucket lnb-relatorios autorizam INSERT/UPDATE/SELECT
 * pra anon, então funciona sem precisar de SUPABASE_SERVICE_ROLE_KEY.
 */
function createStorageClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ─── Paleta LNB ─────────────────────────────────────────
const C = {
  forest900: "#0A1F1D",
  forest800: "#13312E",
  forest700: "#1F5D5D",
  brand500: "#0298D9",
  brand400: "#33ABDF",
  sand: "#DBD2C6",
  sandLight: "#F5F0E7",
  red500: "#DC2626",
  red100: "#FEE2E2",
  amber500: "#D97706",
  emerald500: "#059669",
  emerald100: "#D1FAE5",
  gray50: "#F9FAFB",
  gray100: "#F3F4F6",
  gray200: "#E5E7EB",
  gray300: "#D1D5DB",
  gray400: "#9CA3AF",
  gray500: "#6B7280",
  gray600: "#4B5563",
  gray700: "#374151",
  gray800: "#1F2937",
  white: "#FFFFFF",
};

export interface RelatorioInput {
  cpf: string;
  nome?: string;
  email?: string;
  telefone?: string;
  score?: number;
  tem_pendencia: boolean;
  qtd_pendencias: number;
  total_dividas: number;
  pendencias?: Array<{ credor: string; valor: number; data?: string }>;
  data_consulta?: string;
}

function formatCPF(cpf: string): string {
  const c = cpf.replace(/\D/g, "");
  if (c.length !== 11) return cpf;
  return `${c.slice(0, 3)}.${c.slice(3, 6)}.${c.slice(6, 9)}-${c.slice(9)}`;
}

function formatBRL(v: number): string {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function scoreColor(score: number): string {
  if (score >= 700) return C.emerald500;
  if (score >= 500) return C.amber500;
  if (score >= 300) return C.amber500;
  return C.red500;
}

function scoreFaixa(score: number): string {
  if (score >= 700) return "BOM";
  if (score >= 500) return "REGULAR";
  if (score >= 300) return "BAIXO";
  return "MUITO BAIXO";
}

/**
 * Gera PDF profissional, sóbrio, em UMA página A4. Layout tipo extrato bancário.
 */
async function montarPdf(data: RelatorioInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 0,
      info: {
        Title: `Relatório CPF ${formatCPF(data.cpf)} — LNB`,
        Author: "Limpa Nome Brazil",
        Subject: "Relatório de Consulta de CPF",
        Keywords: "CPF, score, Serasa, SPC, Boa Vista",
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const PAGE_W = 595.28;
    const PAGE_H = 841.89;
    const M = 40; // margin
    const W = PAGE_W - M * 2;

    const dataStr =
      data.data_consulta ||
      new Date().toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    const horaStr = new Date().toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const sc = data.score ?? 0;
    const corScore = scoreColor(sc);
    const faixa = scoreFaixa(sc);
    const protocolo = `LNB-${data.cpf.replace(/\D/g, "").slice(-6)}-${Date.now().toString().slice(-6)}`;

    // ─── HEADER (faixa fina forest no topo) ────────────────
    const HEADER_H = 56;
    doc.rect(0, 0, PAGE_W, HEADER_H).fill(C.forest800);

    // Logo "LNB" pequeno à esquerda
    doc.fillColor(C.white).fontSize(15).font("Helvetica-Bold");
    doc.text("LNB", M, 16);
    doc.fillColor(C.brand400).fontSize(7).font("Helvetica-Bold");
    doc.text("LIMPA NOME BRAZIL", M, 36, { characterSpacing: 1.5 });

    // Título do documento à direita
    doc.fillColor(C.white).fontSize(10).font("Helvetica-Bold");
    doc.text("RELATÓRIO DE CONSULTA DE CPF", PAGE_W - M - 280, 19, {
      width: 280,
      align: "right",
      characterSpacing: 1,
    });
    doc.fillColor(C.sand).fontSize(8).font("Helvetica");
    doc.text(`Emitido em ${dataStr} às ${horaStr}`, PAGE_W - M - 280, 36, {
      width: 280,
      align: "right",
    });

    // ─── BODY ──────────────────────────────────────────────
    let y = HEADER_H + 24;

    // Título principal
    doc.fillColor(C.gray500).fontSize(8).font("Helvetica-Bold");
    doc.text("DADOS DO CONSULTADO", M, y, { characterSpacing: 1.5 });
    y += 12;
    doc
      .moveTo(M, y)
      .lineTo(M + W, y)
      .lineWidth(0.5)
      .strokeColor(C.gray200)
      .stroke();
    y += 10;

    // Identificação em 2 colunas (label/value)
    const halfW = W / 2;
    const identItems: Array<[string, string]> = [
      ["NOME", data.nome || "—"],
      ["CPF", formatCPF(data.cpf)],
      ["E-MAIL", data.email || "—"],
      ["TELEFONE", data.telefone || "—"],
    ];
    identItems.forEach((item, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const ix = M + col * halfW;
      const iy = y + row * 26;
      doc.fillColor(C.gray500).fontSize(7).font("Helvetica");
      doc.text(item[0], ix, iy, { characterSpacing: 1 });
      doc.fillColor(C.forest800).fontSize(10).font("Helvetica-Bold");
      doc.text(item[1], ix, iy + 9, { width: halfW - 12 });
    });
    y += 26 * Math.ceil(identItems.length / 2) + 8;

    // ─── SCORE + STATUS (linha única) ──────────────────────
    doc.fillColor(C.gray500).fontSize(8).font("Helvetica-Bold");
    doc.text("ANÁLISE DE CRÉDITO", M, y, { characterSpacing: 1.5 });
    y += 12;
    doc
      .moveTo(M, y)
      .lineTo(M + W, y)
      .lineWidth(0.5)
      .strokeColor(C.gray200)
      .stroke();
    y += 14;

    // 4 boxes lado a lado (Score, Faixa, Pendências, Total)
    const boxW = (W - 24) / 4;
    const boxH = 64;
    const boxes = [
      {
        label: "SCORE",
        value: `${sc}`,
        sub: "de 1000",
        color: corScore,
        big: true,
      },
      {
        label: "FAIXA",
        value: faixa,
        sub: faixa === "BOM" ? "ótimo" : faixa === "REGULAR" ? "atenção" : "ação necessária",
        color: corScore,
      },
      {
        label: "PENDÊNCIAS",
        value: String(data.qtd_pendencias),
        sub: data.qtd_pendencias === 1 ? "registro" : "registros",
        color: data.tem_pendencia ? C.red500 : C.emerald500,
        big: true,
      },
      {
        label: "TOTAL EM DÍVIDAS",
        value: `R$ ${formatBRL(data.total_dividas)}`,
        sub: data.tem_pendencia ? "consolidado" : "sem dívidas",
        color: data.tem_pendencia ? C.red500 : C.emerald500,
      },
    ];

    boxes.forEach((b, i) => {
      const bx = M + i * (boxW + 8);
      // Card cinza claro com border esquerda colorida
      doc.rect(bx, y, boxW, boxH).fill(C.gray50);
      doc.rect(bx, y, 3, boxH).fill(b.color);

      doc.fillColor(C.gray500).fontSize(7).font("Helvetica-Bold");
      doc.text(b.label, bx + 10, y + 9, { characterSpacing: 1, width: boxW - 14 });

      // Valor (font size adapta se for grande/longo)
      const fs = b.big ? 22 : b.value.length > 10 ? 13 : 16;
      doc.fillColor(b.color).fontSize(fs).font("Helvetica-Bold");
      doc.text(b.value, bx + 10, y + 22, { width: boxW - 14 });

      doc.fillColor(C.gray500).fontSize(8).font("Helvetica");
      doc.text(b.sub, bx + 10, y + boxH - 14, { width: boxW - 14 });
    });

    y += boxH + 20;

    // ─── PENDÊNCIAS (tabela) ───────────────────────────────
    doc.fillColor(C.gray500).fontSize(8).font("Helvetica-Bold");
    doc.text(
      data.tem_pendencia ? "PENDÊNCIAS REGISTRADAS" : "STATUS DO CPF",
      M,
      y,
      { characterSpacing: 1.5 }
    );
    y += 12;
    doc
      .moveTo(M, y)
      .lineTo(M + W, y)
      .lineWidth(0.5)
      .strokeColor(C.gray200)
      .stroke();
    y += 10;

    if (data.tem_pendencia && data.pendencias && data.pendencias.length > 0) {
      // Header da tabela
      doc.rect(M, y, W, 22).fill(C.forest800);
      doc.fillColor(C.white).fontSize(8).font("Helvetica-Bold");
      doc.text("#", M + 10, y + 8, { width: 20, characterSpacing: 1 });
      doc.text("CREDOR", M + 36, y + 8, { width: W * 0.5, characterSpacing: 1 });
      doc.text("DATA", M + W * 0.62, y + 8, { width: W * 0.18, characterSpacing: 1 });
      doc.text("VALOR", M + W * 0.8, y + 8, {
        width: W * 0.18 - 10,
        align: "right",
        characterSpacing: 1,
      });
      y += 22;

      // Limita a 8 pendências pra caber em 1 página
      const maxRows = 8;
      const rowsToShow = data.pendencias.slice(0, maxRows);
      rowsToShow.forEach((p, i) => {
        const rowH = 22;
        if (i % 2 === 0) doc.rect(M, y, W, rowH).fill(C.gray50);
        doc.fillColor(C.gray500).fontSize(8).font("Helvetica");
        doc.text(`${String(i + 1).padStart(2, "0")}`, M + 10, y + 7, { width: 20 });
        doc.fillColor(C.forest800).fontSize(9).font("Helvetica-Bold");
        doc.text(p.credor, M + 36, y + 7, {
          width: W * 0.5 - 10,
          ellipsis: true,
        });
        doc.fillColor(C.gray600).fontSize(8).font("Helvetica");
        doc.text(p.data || "—", M + W * 0.62, y + 7, { width: W * 0.18 });
        doc.fillColor(C.red500).fontSize(9).font("Helvetica-Bold");
        doc.text(`R$ ${formatBRL(p.valor)}`, M + W * 0.8, y + 7, {
          width: W * 0.18 - 10,
          align: "right",
        });
        y += rowH;
      });

      // Indicador de "mais X pendências" se truncou
      if (data.pendencias.length > maxRows) {
        doc.rect(M, y, W, 18).fill(C.gray100);
        doc.fillColor(C.gray600).fontSize(8).font("Helvetica-Oblique");
        doc.text(
          `+ ${data.pendencias.length - maxRows} pendência(s) adicional(is) — detalhamento completo na sua área online`,
          M + 10,
          y + 5,
          { width: W - 20, align: "center" }
        );
        y += 18;
      }

      // Total
      doc.rect(M, y, W, 26).fill(C.forest800);
      doc.fillColor(C.white).fontSize(9).font("Helvetica-Bold");
      doc.text("TOTAL EM PENDÊNCIAS", M + 10, y + 8, { characterSpacing: 1 });
      doc.fillColor(C.brand400).fontSize(13).font("Helvetica-Bold");
      doc.text(`R$ ${formatBRL(data.total_dividas)}`, M, y + 6, {
        width: W - 12,
        align: "right",
      });
      y += 26;
    } else {
      // Box "Nome limpo"
      doc.rect(M, y, W, 50).fill(C.emerald100);
      doc.rect(M, y, 3, 50).fill(C.emerald500);
      doc.fillColor(C.emerald500).fontSize(11).font("Helvetica-Bold");
      doc.text("✓ NOME LIMPO", M + 14, y + 12, { characterSpacing: 1 });
      doc.fillColor(C.gray700).fontSize(9).font("Helvetica");
      doc.text(
        "Não foram encontradas pendências em seu nome. Continue mantendo as contas em dia.",
        M + 14,
        y + 28,
        { width: W - 28 }
      );
      y += 50;
    }

    y += 16;

    // ─── PRÓXIMOS PASSOS / CTA (só se tem pendência) ──────
    if (data.tem_pendencia) {
      doc.fillColor(C.gray500).fontSize(8).font("Helvetica-Bold");
      doc.text("PRÓXIMOS PASSOS", M, y, { characterSpacing: 1.5 });
      y += 12;
      doc
        .moveTo(M, y)
        .lineTo(M + W, y)
        .lineWidth(0.5)
        .strokeColor(C.gray200)
        .stroke();
      y += 14;

      // Box compacto com call to action
      const ctaH = 88;
      doc.rect(M, y, W, ctaH).fill(C.forest800);

      doc.fillColor(C.brand400).fontSize(8).font("Helvetica-Bold");
      doc.text("RECOMENDAÇÃO", M + 16, y + 14, { characterSpacing: 1.5 });

      doc.fillColor(C.white).fontSize(13).font("Helvetica-Bold");
      doc.text("Limpe seu nome em até 20 dias úteis", M + 16, y + 28);

      doc.fillColor(C.sand).fontSize(8).font("Helvetica");
      doc.text(
        "Sem quitar dívida · Sem negociar com credor · Blindagem 12 meses inclusa",
        M + 16,
        y + 47,
        { width: W - 200 }
      );

      doc.fillColor(C.brand400).fontSize(7).font("Helvetica-Bold");
      doc.text("INVESTIMENTO", M + 16, y + 64, { characterSpacing: 1 });
      doc.fillColor(C.white).fontSize(15).font("Helvetica-Bold");
      doc.text("R$ 480,01", M + 84, y + 60);

      // CTA box no canto direito
      const ctaBoxW = 140;
      const ctaBoxX = M + W - ctaBoxW - 16;
      doc.rect(ctaBoxX, y + 22, ctaBoxW, 44).fill(C.brand500);
      doc.fillColor(C.white).fontSize(8).font("Helvetica-Bold");
      doc.text("ACESSE", ctaBoxX, y + 30, {
        width: ctaBoxW,
        align: "center",
        characterSpacing: 1.5,
      });
      doc.fillColor(C.white).fontSize(10).font("Helvetica-Bold");
      doc.text("limpanomebrazil.com.br", ctaBoxX, y + 45, {
        width: ctaBoxW,
        align: "center",
      });

      y += ctaH + 8;
    }

    // ─── FOOTER (rodapé fixo) ──────────────────────────────
    const FOOTER_Y = PAGE_H - 56;
    doc
      .moveTo(M, FOOTER_Y)
      .lineTo(M + W, FOOTER_Y)
      .lineWidth(0.5)
      .strokeColor(C.gray300 || C.gray200)
      .stroke();

    doc.fillColor(C.gray500).fontSize(7).font("Helvetica");
    doc.text(`Protocolo: ${protocolo}`, M, FOOTER_Y + 10);
    doc.text(
      "Fonte de dados: Boa Vista SCPC, Serasa Experian, SPC Brasil",
      M,
      FOOTER_Y + 22
    );
    doc.text(
      "Documento autenticado pela Limpa Nome Brazil · LGPD compatível",
      M,
      FOOTER_Y + 34
    );

    // Lado direito: contatos
    doc.fillColor(C.forest800).fontSize(8).font("Helvetica-Bold");
    doc.text("limpanomebrazil.com.br", PAGE_W - M - 200, FOOTER_Y + 10, {
      width: 200,
      align: "right",
    });
    doc.fillColor(C.gray600).fontSize(7).font("Helvetica");
    doc.text("contato@limpanomebrazil.com.br", PAGE_W - M - 200, FOOTER_Y + 22, {
      width: 200,
      align: "right",
    });
    doc.text("WhatsApp (11) 99744-0101", PAGE_W - M - 200, FOOTER_Y + 34, {
      width: 200,
      align: "right",
    });

    doc.end();
  });
}

/**
 * Gera o PDF do relatório de consulta, faz upload no Supabase Storage
 * (bucket público lnb-relatorios) e retorna a URL pública.
 */
export async function gerarESalvarRelatorio(
  data: RelatorioInput
): Promise<{ ok: true; pdfUrl: string; path: string } | { ok: false; error: string }> {
  try {
    // 1) Gera PDF como Buffer (puro Node, sem Chrome, sem fontes externas)
    const buffer = await montarPdf(data);

    // 2) Upload pra Supabase Storage
    const cpfClean = data.cpf.replace(/\D/g, "");
    const ts = Date.now();
    const path = `consultas/${cpfClean}/${ts}-relatorio.pdf`;

    const supa = createStorageClient();
    const { error: upErr } = await supa.storage.from(BUCKET).upload(path, buffer, {
      contentType: "application/pdf",
      upsert: true,
    });
    if (upErr) {
      return { ok: false, error: `Upload falhou: ${upErr.message}` };
    }

    // 3) URL pública (bucket lnb-relatorios é público)
    const { data: urlData } = supa.storage.from(BUCKET).getPublicUrl(path);

    return { ok: true, pdfUrl: urlData.publicUrl, path };
  } catch (e) {
    const errMsg =
      e instanceof Error
        ? `${e.name}: ${e.message}${e.stack ? "\n" + e.stack.split("\n").slice(0, 5).join("\n") : ""}`
        : String(e);
    console.error("[pdf-gerar] erro:", errMsg);
    return { ok: false, error: errMsg };
  }
}
