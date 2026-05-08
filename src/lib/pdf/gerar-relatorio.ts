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
  gray100: "#F3F4F6",
  gray200: "#E5E7EB",
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
 * Gera PDF profissional do relatório de consulta usando pdfkit (puro Node).
 * Funciona em qualquer ambiente serverless sem precisar de Chrome ou fontes externas.
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
        Keywords: "CPF, score, Serasa, SPC, Boa Vista, limpa nome",
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const PAGE_W = 595.28;
    const PAGE_H = 841.89;
    const MARGIN = 50;
    const CONTENT_W = PAGE_W - MARGIN * 2;

    const dataStr =
      data.data_consulta ||
      new Date().toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
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

    // ════════════════ PÁGINA 1 — CAPA ════════════════
    // Background forest
    doc.rect(0, 0, PAGE_W, PAGE_H).fill(C.forest800);

    // Faixa decorativa azul no topo
    doc.rect(0, 0, PAGE_W, 6).fill(C.brand500);

    // Logo "LNB" estilizado (texto, sem precisar baixar imagem)
    doc
      .fillColor(C.white)
      .font("Helvetica-Bold")
      .fontSize(28)
      .text("LNB", MARGIN, 50, { continued: false });
    doc
      .fillColor(C.brand400)
      .fontSize(11)
      .text("LIMPA NOME BRAZIL", MARGIN, 82, { characterSpacing: 2 });

    // Selo "Documento Autêntico" (canto superior direito)
    const seloX = PAGE_W - MARGIN - 130;
    const seloY = 55;
    doc.rect(seloX, seloY, 130, 24).fill(C.brand500);
    doc
      .fillColor(C.white)
      .font("Helvetica-Bold")
      .fontSize(8)
      .text("DOCUMENTO AUTÊNTICO", seloX, seloY + 9, {
        width: 130,
        align: "center",
        characterSpacing: 1,
      });

    // Conteúdo central
    doc.fillColor(C.brand400).fontSize(10).font("Helvetica-Bold");
    doc.text("RELATÓRIO OFICIAL", MARGIN, 200, { characterSpacing: 4 });

    doc.fillColor(C.white).fontSize(36).font("Helvetica-Bold");
    doc.text("Consulta de CPF", MARGIN, 225, { width: CONTENT_W });
    doc.text("e Análise de", MARGIN, 270, { width: CONTENT_W });
    doc.text("Crédito", MARGIN, 315, { width: CONTENT_W });

    doc.fillColor(C.sand).fontSize(12).font("Helvetica");
    doc.text(
      "Documento detalhado com score de crédito, pendências, credores e recomendações personalizadas para sua situação financeira.",
      MARGIN,
      375,
      { width: 380, lineGap: 4 }
    );

    // Box brand com info do consultado
    const boxY = 460;
    const boxH = 110;
    doc
      .rect(MARGIN, boxY, CONTENT_W, boxH)
      .fillOpacity(0.15)
      .fill(C.brand500)
      .fillOpacity(1);

    // Faixa esquerda do box
    doc.rect(MARGIN, boxY, 4, boxH).fill(C.brand500);

    doc.fillColor(C.brand400).fontSize(8).font("Helvetica-Bold");
    doc.text("EMITIDO PARA", MARGIN + 22, boxY + 18, { characterSpacing: 2 });
    doc.fillColor(C.white).fontSize(18).font("Helvetica-Bold");
    doc.text(data.nome || "Cliente Limpa Nome Brazil", MARGIN + 22, boxY + 32, {
      width: CONTENT_W - 40,
    });

    doc.fillColor(C.brand400).fontSize(8).font("Helvetica-Bold");
    doc.text("CPF", MARGIN + 22, boxY + 70, { characterSpacing: 2 });
    doc.fillColor(C.white).fontSize(18).font("Helvetica-Bold");
    doc.text(formatCPF(data.cpf), MARGIN + 22, boxY + 84);

    // Rodapé da capa
    const rodapeY = PAGE_H - 130;
    doc
      .moveTo(MARGIN, rodapeY)
      .lineTo(PAGE_W - MARGIN, rodapeY)
      .strokeColor(C.sand)
      .strokeOpacity(0.3)
      .lineWidth(1)
      .stroke()
      .strokeOpacity(1);

    doc.fillColor(C.sand).fontSize(9).font("Helvetica");
    doc.text(`Data:`, MARGIN, rodapeY + 18, { continued: true });
    doc.font("Helvetica-Bold").fillColor(C.white).text(` ${dataStr} às ${horaStr}`);

    doc.fillColor(C.sand).font("Helvetica");
    doc.text(`Protocolo:`, MARGIN, rodapeY + 36, { continued: true });
    doc.font("Helvetica-Bold").fillColor(C.white).text(` ${protocolo}`);

    doc.fillColor(C.sand).font("Helvetica");
    doc.text(`Fonte:`, MARGIN, rodapeY + 54, { continued: true });
    doc
      .font("Helvetica-Bold")
      .fillColor(C.white)
      .text(` Boa Vista SCPC · Serasa Experian · SPC Brasil`);

    // Direita
    doc.fillColor(C.sand).fontSize(9).font("Helvetica");
    const rightX = PAGE_W - MARGIN - 200;
    doc.text("limpanomebrazil.com.br", rightX, rodapeY + 18, {
      width: 200,
      align: "right",
    });
    doc.text("+55 11 99744-0101", rightX, rodapeY + 36, {
      width: 200,
      align: "right",
    });
    doc.text("contato@limpanomebrazil.com.br", rightX, rodapeY + 54, {
      width: 200,
      align: "right",
    });

    // ════════════════ PÁGINA 2 — DASHBOARD ════════════════
    doc.addPage({ size: "A4", margin: 0 });

    // Header dark
    doc.rect(0, 0, PAGE_W, 50).fill(C.forest800);
    doc.fillColor(C.white).fontSize(14).font("Helvetica-Bold");
    doc.text("LNB", MARGIN, 18);
    doc.fillColor(C.brand400).fontSize(8).font("Helvetica-Bold");
    doc.text("LIMPA NOME BRAZIL", MARGIN, 36, { characterSpacing: 1 });

    doc.fillColor(C.brand400).fontSize(8).font("Helvetica-Bold");
    doc.text(`RELATÓRIO · ${dataStr.toUpperCase()}`, PAGE_W - MARGIN - 200, 23, {
      width: 200,
      align: "right",
      characterSpacing: 1,
    });

    let y = 80;

    // Section 1: Identificação
    drawSectionHeader(doc, "1. IDENTIFICAÇÃO", "Dados do consultado", MARGIN, y);
    y += 50;

    // Card sand
    doc.rect(MARGIN, y, CONTENT_W, 80).fill(C.sandLight);

    const idCols = [
      { label: "NOME", value: data.nome || "—" },
      { label: "CPF", value: formatCPF(data.cpf) },
      { label: "E-MAIL", value: data.email || "—" },
      { label: "TELEFONE", value: data.telefone || "—" },
    ];
    idCols.forEach((col, i) => {
      const colX = MARGIN + 20 + (i % 2) * (CONTENT_W / 2 - 10);
      const colY = y + 18 + Math.floor(i / 2) * 30;
      doc.fillColor(C.gray500).fontSize(7).font("Helvetica-Bold");
      doc.text(col.label, colX, colY, { characterSpacing: 1 });
      doc.fillColor(C.forest800).fontSize(11).font("Helvetica-Bold");
      doc.text(col.value, colX, colY + 10, { width: CONTENT_W / 2 - 30 });
    });

    y += 100;

    // Section 2: Score
    drawSectionHeader(
      doc,
      "2. SCORE DE CRÉDITO",
      `Sua pontuação: ${sc}`,
      MARGIN,
      y
    );
    y += 50;

    // Card score
    const scoreBoxH = 140;
    doc.rect(MARGIN, y, CONTENT_W, scoreBoxH).fill(C.gray100);

    // Score number gigante
    doc.fillColor(C.gray500).fontSize(8).font("Helvetica-Bold");
    doc.text("SEU SCORE", MARGIN + 22, y + 22, { characterSpacing: 2 });
    doc.fillColor(corScore).fontSize(48).font("Helvetica-Bold");
    doc.text(`${sc}`, MARGIN + 22, y + 32);
    doc.fillColor(C.gray500).fontSize(10).font("Helvetica");
    doc.text("de 1000 pontos", MARGIN + 22, y + 92);

    // Badge faixa (canto direito)
    const badgeW = 110;
    const badgeX = PAGE_W - MARGIN - 22 - badgeW;
    doc
      .rect(badgeX, y + 22, badgeW, 28)
      .fillOpacity(0.15)
      .fill(corScore)
      .fillOpacity(1);
    doc.fillColor(corScore).fontSize(13).font("Helvetica-Bold");
    doc.text(faixa, badgeX, y + 30, {
      width: badgeW,
      align: "center",
      characterSpacing: 1,
    });

    // Barra de score
    const barY = y + scoreBoxH - 35;
    const barW = CONTENT_W - 44;
    const barX = MARGIN + 22;
    // Track
    doc.roundedRect(barX, barY, barW, 10, 5).fill(C.gray200);
    // Fill
    const fillW = Math.max(8, (sc / 1000) * barW);
    doc.roundedRect(barX, barY, fillW, 10, 5).fill(corScore);

    // Ticks
    ["0", "300", "500", "700", "1000"].forEach((tick, i) => {
      const tickX = barX + (Number(tick) / 1000) * barW - 8;
      doc.fillColor(C.gray500).fontSize(7).font("Helvetica");
      doc.text(tick, tickX, barY + 14);
    });

    y += scoreBoxH + 25;

    // Section 3: Stats row
    drawSectionHeader(
      doc,
      "3. RESUMO DE PENDÊNCIAS",
      "Situação atual do CPF",
      MARGIN,
      y
    );
    y += 50;

    // 3 stats lado a lado
    const statW = (CONTENT_W - 20) / 3;
    const statH = 90;
    const stats = [
      {
        label: "PENDÊNCIAS",
        value: String(data.qtd_pendencias),
        sub: data.qtd_pendencias === 1 ? "registro encontrado" : "registros encontrados",
        color: data.tem_pendencia ? C.red500 : C.emerald500,
      },
      {
        label: "TOTAL EM DÍVIDAS",
        value: `R$ ${formatBRL(data.total_dividas)}`,
        sub: "somatório dos credores",
        color: data.tem_pendencia ? C.red500 : C.gray800,
      },
      {
        label: "STATUS",
        value: data.tem_pendencia ? "● NEGATIVADO" : "● NOME LIMPO",
        sub: data.tem_pendencia ? "Ação recomendada" : "Tudo certo",
        color: data.tem_pendencia ? C.red500 : C.emerald500,
        isBadge: true,
      },
    ];

    stats.forEach((s, i) => {
      const sx = MARGIN + i * (statW + 10);
      // Card branco com border
      doc.roundedRect(sx, y, statW, statH, 6).fill(C.white).stroke(C.gray200);
      doc.lineWidth(1).rect(sx, y, statW, statH).stroke(C.gray200);

      doc.fillColor(C.gray500).fontSize(7).font("Helvetica-Bold");
      doc.text(s.label, sx + 14, y + 14, { characterSpacing: 1 });

      if (s.isBadge) {
        doc
          .roundedRect(sx + 14, y + 32, statW - 28, 22, 4)
          .fillOpacity(0.15)
          .fill(s.color)
          .fillOpacity(1);
        doc.fillColor(s.color).fontSize(10).font("Helvetica-Bold");
        doc.text(s.value, sx + 14, y + 38, {
          width: statW - 28,
          align: "center",
        });
      } else {
        doc.fillColor(s.color).fontSize(s.value.length > 6 ? 17 : 22).font("Helvetica-Bold");
        doc.text(s.value, sx + 14, y + 30);
      }

      doc.fillColor(C.gray500).fontSize(8).font("Helvetica");
      doc.text(s.sub, sx + 14, y + 70);
    });

    y += statH + 25;

    // Watermark autenticação
    doc.rect(MARGIN, y, CONTENT_W, 70).fill(C.sandLight);
    // Selo redondo "LNB"
    doc.circle(MARGIN + 35, y + 35, 22).fill(C.brand500);
    doc.fillColor(C.white).fontSize(13).font("Helvetica-Bold");
    doc.text("LNB", MARGIN + 22, y + 28, { width: 26, align: "center" });

    doc.fillColor(C.forest800).fontSize(10).font("Helvetica-Bold");
    doc.text("Documento autenticado pela Limpa Nome Brazil", MARGIN + 75, y + 18, {
      width: CONTENT_W - 95,
    });
    doc.fillColor(C.gray600).fontSize(8).font("Helvetica");
    doc.text(
      `Protocolo ${protocolo} · Verifique a autenticidade em limpanomebrazil.com.br/conta/dashboard usando seu CPF e senha.`,
      MARGIN + 75,
      y + 35,
      { width: CONTENT_W - 95, lineGap: 2 }
    );

    drawFooter(doc, dataStr);

    // ════════════════ PÁGINA 3 — PENDÊNCIAS ═════════════
    if (data.tem_pendencia && data.pendencias && data.pendencias.length > 0) {
      doc.addPage({ size: "A4", margin: 0 });
      drawHeader(doc, dataStr, "DETALHAMENTO");

      let py = 80;
      drawSectionHeader(
        doc,
        "4. CREDORES E VALORES",
        "Detalhamento das pendências",
        MARGIN,
        py
      );
      py += 50;

      doc.fillColor(C.gray600).fontSize(10).font("Helvetica");
      doc.text(
        "Lista completa de cada registro de débito identificado. Os valores estão consolidados ao momento da consulta.",
        MARGIN,
        py,
        { width: CONTENT_W, lineGap: 3 }
      );
      py += 36;

      // Cada pendência
      data.pendencias.forEach((p, i) => {
        const cardH = 60;

        // Card branco com border + faixa esquerda vermelha
        doc.roundedRect(MARGIN, py, CONTENT_W, cardH, 6).fill(C.white);
        doc.lineWidth(1).rect(MARGIN, py, CONTENT_W, cardH).stroke(C.gray200);
        doc.rect(MARGIN, py, 4, cardH).fill(C.red500);

        // Número
        doc.fillColor(C.gray400).fontSize(9).font("Helvetica-Bold");
        doc.text(`#${String(i + 1).padStart(2, "0")}`, MARGIN + 18, py + 22);

        // Credor
        doc.fillColor(C.forest800).fontSize(12).font("Helvetica-Bold");
        doc.text(p.credor, MARGIN + 60, py + 16, { width: CONTENT_W - 220 });

        // Data
        doc.fillColor(C.gray500).fontSize(9).font("Helvetica");
        doc.text(
          p.data ? `Registrado em ${p.data}` : "Data de registro não disponível",
          MARGIN + 60,
          py + 35,
          { width: CONTENT_W - 220 }
        );

        // Valor
        doc.fillColor(C.red500).fontSize(15).font("Helvetica-Bold");
        doc.text(`R$ ${formatBRL(p.valor)}`, MARGIN + CONTENT_W - 150, py + 22, {
          width: 130,
          align: "right",
        });

        py += cardH + 8;
      });

      // Total
      py += 8;
      doc
        .moveTo(MARGIN, py)
        .lineTo(PAGE_W - MARGIN, py)
        .lineWidth(2)
        .strokeColor(C.forest800)
        .stroke();

      py += 14;
      doc.fillColor(C.forest800).fontSize(12).font("Helvetica-Bold");
      doc.text("TOTAL EM PENDÊNCIAS", MARGIN, py, { characterSpacing: 1 });
      doc.fillColor(C.red500).fontSize(20).font("Helvetica-Bold");
      doc.text(`R$ ${formatBRL(data.total_dividas)}`, MARGIN, py - 4, {
        width: CONTENT_W,
        align: "right",
      });

      py += 36;
      doc.fillColor(C.gray500).fontSize(9).font("Helvetica-Oblique");
      doc.text(
        `⚠ Valores podem sofrer atualização por juros, multas e correções diárias. Esta consulta foi realizada em ${dataStr} às ${horaStr}.`,
        MARGIN,
        py,
        { width: CONTENT_W, lineGap: 3 }
      );

      drawFooter(doc, dataStr);
    }

    // ════════════════ PÁGINA 4 — SOLUÇÃO LNB ═════════════
    doc.addPage({ size: "A4", margin: 0 });
    drawHeader(doc, dataStr, "RECOMENDAÇÃO");

    let sy = 80;

    if (data.tem_pendencia) {
      drawSectionHeader(
        doc,
        data.pendencias && data.pendencias.length > 0 ? "5. PRÓXIMOS PASSOS" : "4. PRÓXIMOS PASSOS",
        "Como limpar seu nome em até 20 dias",
        MARGIN,
        sy
      );
      sy += 50;

      doc.fillColor(C.gray600).fontSize(10).font("Helvetica");
      doc.text(
        "Veja o passo a passo do processo da Limpa Nome Brazil. Sem negociar com credor, sem quitar dívida.",
        MARGIN,
        sy,
        { width: CONTENT_W, lineGap: 3 }
      );
      sy += 32;

      const passos = [
        {
          t: "Análise individual de cada pendência",
          d: "Nossa equipe técnica analisa cada um dos credores e a documentação registrada no seu CPF.",
        },
        {
          t: "Atuação direta junto aos órgãos",
          d: "Atuamos legalmente junto a Serasa, SPC e Boa Vista para regularizar os registros — sem você precisar negociar com cada credor.",
        },
        {
          t: "Acompanhamento em tempo real",
          d: "Você recebe atualizações por WhatsApp e email a cada etapa. Pode acompanhar tudo no painel online.",
        },
        {
          t: "Nome limpo em até 20 dias úteis",
          d: "Ao final do processo, seu CPF volta a estar limpo nos 3 principais bureaus de crédito.",
        },
        {
          t: "Blindagem de CPF inclusa por 12 meses",
          d: "Monitoramos seu CPF diariamente e alertamos imediatamente se aparecer qualquer nova pendência.",
        },
      ];

      passos.forEach((p, i) => {
        // Bolinha número
        doc.circle(MARGIN + 14, sy + 10, 12).fill(C.brand500);
        doc.fillColor(C.white).fontSize(11).font("Helvetica-Bold");
        doc.text(`${i + 1}`, MARGIN + 8, sy + 5, { width: 12, align: "center" });

        doc.fillColor(C.forest800).fontSize(11).font("Helvetica-Bold");
        doc.text(p.t, MARGIN + 36, sy + 2, { width: CONTENT_W - 36 });

        doc.fillColor(C.gray600).fontSize(9).font("Helvetica");
        doc.text(p.d, MARGIN + 36, sy + 18, { width: CONTENT_W - 36, lineGap: 2 });

        sy += 50;
      });

      sy += 10;

      // Box solução grande
      const solY = sy;
      const solH = 200;
      doc.roundedRect(MARGIN, solY, CONTENT_W, solH, 10).fill(C.forest800);

      doc.fillColor(C.brand400).fontSize(9).font("Helvetica-Bold");
      doc.text("SOLUÇÃO RECOMENDADA", MARGIN + 24, solY + 22, { characterSpacing: 3 });

      doc.fillColor(C.white).fontSize(20).font("Helvetica-Bold");
      doc.text("Limpe seu nome agora", MARGIN + 24, solY + 38);
      doc.text("com a Limpa Nome Brazil", MARGIN + 24, solY + 60);

      doc.fillColor(C.sand).fontSize(10).font("Helvetica");
      doc.text(
        "Mais de 10 mil pessoas já voltaram a ter crédito conosco. Sem quitar dívida.",
        MARGIN + 24,
        solY + 88,
        { width: CONTENT_W - 48, lineGap: 2 }
      );

      // Linha + preço
      doc
        .moveTo(MARGIN + 24, solY + 130)
        .lineTo(PAGE_W - MARGIN - 24, solY + 130)
        .strokeColor(C.sand)
        .strokeOpacity(0.2)
        .stroke()
        .strokeOpacity(1);

      doc.fillColor(C.brand400).fontSize(9).font("Helvetica-Bold");
      doc.text("INVESTIMENTO", MARGIN + 24, solY + 145, { characterSpacing: 2 });

      doc.fillColor(C.white).fontSize(28).font("Helvetica-Bold");
      doc.text("R$ 480,01", MARGIN + 24, solY + 158);

      doc.fillColor(C.brand400).fontSize(9).font("Helvetica");
      doc.text("À vista · 12 meses de Blindagem inclusa", PAGE_W - MARGIN - 280, solY + 178, {
        width: 256,
        align: "right",
      });

      // CTA button
      const ctaY = solY + solH + 16;
      doc.roundedRect(MARGIN, ctaY, CONTENT_W, 40, 6).fill(C.brand500);
      doc.fillColor(C.white).fontSize(12).font("Helvetica-Bold");
      doc.text("ACESSE LIMPANOMEBRAZIL.COM.BR", MARGIN, ctaY + 14, {
        width: CONTENT_W,
        align: "center",
        characterSpacing: 2,
      });
    } else {
      // Box "Nome limpo"
      drawSectionHeader(doc, "RESULTADO POSITIVO", "Tudo certo com seu CPF", MARGIN, sy);
      sy += 50;

      doc.fillColor(C.gray600).fontSize(10).font("Helvetica");
      doc.text(
        "Não foram encontradas pendências em seu nome nos órgãos consultados.",
        MARGIN,
        sy,
        { width: CONTENT_W, lineGap: 3 }
      );
      sy += 32;

      const boxH = 160;
      doc.roundedRect(MARGIN, sy, CONTENT_W, boxH, 10).fill(C.emerald500);

      doc.fillColor(C.white).fillOpacity(0.85).fontSize(9).font("Helvetica-Bold");
      doc.text("NOME LIMPO", MARGIN + 24, sy + 22, { characterSpacing: 2 });
      doc.fillOpacity(1);

      doc.fillColor(C.white).fontSize(26).font("Helvetica-Bold");
      doc.text("Parabéns!", MARGIN + 24, sy + 40);

      doc.fillColor(C.white).fontSize(11).font("Helvetica");
      doc.text(
        "Seu CPF está limpo e sem pendências registradas em Serasa, SPC e Boa Vista. Continue mantendo as contas em dia para preservar e elevar seu score de crédito.",
        MARGIN + 24,
        sy + 78,
        { width: CONTENT_W - 48, lineGap: 3 }
      );
    }

    drawFooter(doc, dataStr);

    doc.end();
  });
}

function drawHeader(doc: any, dataStr: string, badge: string) {
  doc.rect(0, 0, 595.28, 50).fill(C.forest800);
  doc.fillColor(C.white).fontSize(14).font("Helvetica-Bold");
  doc.text("LNB", 50, 18);
  doc.fillColor(C.brand400).fontSize(8).font("Helvetica-Bold");
  doc.text("LIMPA NOME BRAZIL", 50, 36, { characterSpacing: 1 });

  doc.fillColor(C.brand400).fontSize(8).font("Helvetica-Bold");
  doc.text(`${badge} · ${dataStr.toUpperCase()}`, 595.28 - 50 - 250, 23, {
    width: 250,
    align: "right",
    characterSpacing: 1,
  });
}

function drawSectionHeader(doc: any, eyebrow: string, title: string, x: number, y: number) {
  doc.fillColor(C.brand500).fontSize(9).font("Helvetica-Bold");
  doc.text(eyebrow, x, y, { characterSpacing: 2 });
  doc.fillColor(C.forest800).fontSize(20).font("Helvetica-Bold");
  doc.text(title, x, y + 14);
}

function drawFooter(doc: any, _dataStr: string) {
  const PAGE_W = 595.28;
  const PAGE_H = 841.89;
  const fY = PAGE_H - 36;

  doc.rect(0, fY, PAGE_W, 36).fill(C.forest900);
  doc.fillColor(C.sand).fontSize(8).font("Helvetica");
  doc.text("Limpa Nome Brazil", 50, fY + 12, { continued: true });
  doc.font("Helvetica").text(" · CNPJ confidencial · LGPD compatível");

  // page number (pdfkit não tem auto-numbering simples, deixa estático)
  doc.fillColor(C.sand).fontSize(8);
  doc.text("limpanomebrazil.com.br", PAGE_W - 50 - 200, fY + 12, {
    width: 200,
    align: "right",
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
