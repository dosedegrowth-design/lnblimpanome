/* eslint-disable @typescript-eslint/no-explicit-any */
import PDFDocument from "pdfkit";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const BUCKET = "lnb-relatorios";

function createStorageClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ─── Paleta sóbria executiva ─────────────────────────────
const C = {
  forest900: "#0A1F1D",
  forest800: "#13312E",
  forest700: "#1F5D5D",
  brand500: "#0298D9",
  red500: "#DC2626",
  red50: "#FEF2F2",
  amber500: "#D97706",
  amber50: "#FFFBEB",
  emerald500: "#059669",
  emerald50: "#ECFDF5",
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
  data_nascimento?: string;
  situacao_receita?: string;
  // Scores das DUAS fontes
  score_serasa?: number;
  score_boa_vista?: number;
  score?: number; // backward-compat (usa Serasa preferencialmente, senão BV)
  probabilidade_pagamento?: string; // ex: "59,25%"
  // Pendências agregadas
  tem_pendencia: boolean;
  qtd_pendencias: number;
  total_dividas: number;
  qtd_protestos?: number;
  qtd_cheques_sem_fundo?: number;
  pendencias?: Array<{ credor: string; valor: number; data?: string; origem?: string }>;
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
  if (score >= 701) return C.emerald500;
  if (score >= 501) return C.amber500;
  if (score >= 301) return C.amber500;
  return C.red500;
}

function scoreFaixa(score: number): string {
  if (score >= 851) return "ÓTIMO";
  if (score >= 701) return "BOM";
  if (score >= 501) return "REGULAR";
  if (score >= 301) return "BAIXO";
  return "MUITO BAIXO";
}

function scoreSubtexto(faixa: string, temPend: boolean): string {
  if (faixa === "ÓTIMO") return "perfil excelente";
  if (faixa === "BOM") return "perfil confiável";
  if (faixa === "REGULAR") return "atenção";
  if (faixa === "BAIXO") return temPend ? "ação necessária" : "construindo histórico";
  return temPend ? "ação necessária" : "pouco histórico";
}

/**
 * Layout executivo denso em 1 página A4.
 * Estrutura:
 *  [HEADER 50] LNB | RELATÓRIO DE CONSULTA DE CPF | data
 *  [DADOS 70] Nome / CPF / Data Nascimento / Situação RF / Email / Telefone
 *  [SCORES 110] Serasa Score + Boa Vista Score lado a lado
 *  [STATUS 50] Faixa "NOME LIMPO" / "POSSUI PENDÊNCIAS"
 *  [RESUMO 70] 4 cards: pendências, protestos, cheques, total dívidas
 *  [DETALHES] Tabela de pendências (se houver) OU bloco educativo "como construir score"
 *  [FOOTER] Protocolo + Fontes + LGPD
 */
async function montarPdf(data: RelatorioInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 0,
      info: {
        Title: `Relatório CPF ${formatCPF(data.cpf)} — LNB`,
        Author: "Limpa Nome Brazil",
        Subject: "Relatório de Consulta de CPF — Serasa Experian + Boa Vista SCPC",
        Keywords: "CPF, Score, Serasa, Boa Vista, SPC, Pendências",
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const PAGE_W = 595.28;
    const PAGE_H = 841.89;
    const M = 36;
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

    const scoreS = data.score_serasa ?? data.score ?? null;
    const scoreBV = data.score_boa_vista ?? null;
    const protocolo = `LNB-${data.cpf.replace(/\D/g, "").slice(-6)}-${Date.now().toString().slice(-6)}`;

    let y = 0;

    // ─── HEADER (faixa fina forest, 44px) ──────────────────
    doc.rect(0, 0, PAGE_W, 44).fill(C.forest800);
    doc.fillColor(C.white).fontSize(13).font("Helvetica-Bold").text("LNB", M, 14);
    doc
      .fontSize(7)
      .font("Helvetica")
      .fillColor(C.brand500)
      .text("LIMPA NOME BRAZIL", M, 28, { characterSpacing: 1.2 });

    doc
      .fillColor(C.white)
      .fontSize(11)
      .font("Helvetica-Bold")
      .text("RELATÓRIO DE CONSULTA DE CPF", M, 14, { width: W, align: "right" });
    doc
      .fontSize(8)
      .font("Helvetica")
      .fillColor(C.gray300)
      .text(`Emitido em ${dataStr} às ${horaStr}`, M, 28, { width: W, align: "right" });

    y = 44 + 14;

    // ─── DADOS DO CONSULTADO (3 colunas) ───────────────────
    doc
      .fillColor(C.gray500)
      .fontSize(7)
      .font("Helvetica-Bold")
      .text("DADOS DO CONSULTADO", M, y, { characterSpacing: 0.8 });
    y += 10;
    doc.strokeColor(C.gray200).lineWidth(0.5).moveTo(M, y).lineTo(PAGE_W - M, y).stroke();
    y += 10;

    const colW = W / 3;
    const drawField = (col: number, row: number, label: string, value: string) => {
      const x = M + col * colW;
      const yy = y + row * 30;
      doc.fillColor(C.gray400).fontSize(6.5).font("Helvetica").text(label.toUpperCase(), x, yy, {
        characterSpacing: 0.5,
      });
      doc.fillColor(C.forest800).fontSize(9).font("Helvetica-Bold").text(value || "—", x, yy + 9, {
        width: colW - 8,
        ellipsis: true,
      });
    };

    drawField(0, 0, "Nome", data.nome || "—");
    drawField(1, 0, "CPF", formatCPF(data.cpf));
    drawField(2, 0, "Data nascimento", data.data_nascimento || "—");
    drawField(0, 1, "Situação Receita Federal", data.situacao_receita || "—");
    drawField(1, 1, "Email", data.email || "—");
    drawField(2, 1, "Telefone", data.telefone || "—");

    y += 60 + 6;

    // ─── ANÁLISE DE CRÉDITO (Score Serasa + Boa Vista) ─────
    doc
      .fillColor(C.gray500)
      .fontSize(7)
      .font("Helvetica-Bold")
      .text("ANÁLISE DE CRÉDITO MULTI-BUREAU", M, y, { characterSpacing: 0.8 });
    y += 10;
    doc.strokeColor(C.gray200).lineWidth(0.5).moveTo(M, y).lineTo(PAGE_W - M, y).stroke();
    y += 10;

    const cardW = (W - 10) / 2;
    const cardH = 100;
    const PAD = 14;

    const drawScoreCard = (
      x: number,
      labelBureau: string,
      score: number | null,
      sublabel: string
    ) => {
      const sc = score ?? 0;
      const cor = score !== null ? scoreColor(sc) : C.gray400;
      const fx = score !== null ? scoreFaixa(sc) : "—";
      const sub = score !== null ? scoreSubtexto(fx, data.tem_pendencia) : "indisponível";

      // Card com borda
      doc.roundedRect(x, y, cardW, cardH, 4).strokeColor(C.gray200).lineWidth(0.5).stroke();

      // Label bureau (canto sup esquerdo)
      doc
        .fillColor(C.gray600)
        .fontSize(8)
        .font("Helvetica-Bold")
        .text(labelBureau.toUpperCase(), x + PAD, y + 10, {
          characterSpacing: 0.7,
          width: cardW - PAD * 2,
        });
      // Sublabel (logo abaixo)
      doc
        .fillColor(C.gray400)
        .fontSize(7)
        .font("Helvetica")
        .text(sublabel, x + PAD, y + 21, { width: cardW - PAD * 2 });

      // Score grande à esquerda
      if (score !== null) {
        doc.fillColor(cor).fontSize(34).font("Helvetica-Bold").text(`${score}`, x + PAD, y + 36, {
          width: 90,
          lineBreak: false,
        });
        doc
          .fillColor(C.gray500)
          .fontSize(8)
          .font("Helvetica")
          .text("/ 1000", x + PAD + 68, y + 56, { lineBreak: false });

        // Bloco faixa+sub à DIREITA do score (dentro do card)
        const rightX = x + PAD + 100;
        const rightW = cardW - PAD * 2 - 100;
        doc
          .fillColor(cor)
          .fontSize(11)
          .font("Helvetica-Bold")
          .text(fx, rightX, y + 40, { width: rightW, align: "right", lineBreak: false });
        doc
          .fillColor(C.gray500)
          .fontSize(7)
          .font("Helvetica")
          .text(sub, rightX, y + 55, { width: rightW, align: "right", lineBreak: false });

        // Barra de progresso (parte inferior do card)
        const barY = y + cardH - 22;
        const barW = cardW - PAD * 2;
        doc.rect(x + PAD, barY, barW, 5).fill(C.gray100);
        const pct = Math.min(1, sc / 1000);
        doc.rect(x + PAD, barY, barW * pct, 5).fill(cor);
        // Escala 0 / 1000
        doc.fillColor(C.gray400).fontSize(6).font("Helvetica").text("0", x + PAD, barY + 8, { lineBreak: false });
        doc.text("1000", x + PAD, barY + 8, { width: barW, align: "right", lineBreak: false });
      } else {
        doc
          .fillColor(C.gray400)
          .fontSize(13)
          .font("Helvetica")
          .text("Não disponível", x + PAD, y + 46, { width: cardW - PAD * 2 });
      }
    };

    drawScoreCard(M, "Serasa Experian", scoreS, "Score Serasa - 6 meses");
    drawScoreCard(M + cardW + 10, "Boa Vista SCPC", scoreBV, "Score Positivo PF");

    y += cardH + 10;

    // ─── STATUS DO CPF ──────────────────────────────────────
    const statusCorFundo = data.tem_pendencia ? C.red50 : C.emerald50;
    const statusCorTexto = data.tem_pendencia ? C.red500 : C.emerald500;
    const statusTitulo = data.tem_pendencia ? "POSSUI PENDÊNCIAS" : "NOME LIMPO";
    const statusSub = data.tem_pendencia
      ? `Foram encontradas ${data.qtd_pendencias} ocorrência(s) financeira(s) registrada(s) nas bases consultadas.`
      : "Não foram encontradas pendências, protestos ou cheques sem fundo nas bases consultadas.";

    const statusH = 42;
    doc.roundedRect(M, y, W, statusH, 4).fill(statusCorFundo);
    doc.fillColor(statusCorTexto).fontSize(12).font("Helvetica-Bold").text(statusTitulo, M + 14, y + 9);
    doc.fillColor(C.gray700).fontSize(8).font("Helvetica").text(statusSub, M + 14, y + 24, {
      width: W - 28,
    });
    y += statusH + 12;

    // ─── RESUMO DE OCORRÊNCIAS (4 cards) ────────────────────
    const resumoH = 44;
    const colCount = 4;
    const colWidth = (W - 6 * (colCount - 1)) / colCount;
    const items: Array<{ label: string; value: string; cor: string }> = [
      {
        label: "PENDÊNCIAS",
        value: String(data.qtd_pendencias),
        cor: data.qtd_pendencias > 0 ? C.red500 : C.emerald500,
      },
      {
        label: "PROTESTOS",
        value: String(data.qtd_protestos ?? 0),
        cor: (data.qtd_protestos ?? 0) > 0 ? C.red500 : C.emerald500,
      },
      {
        label: "CHEQUES SEM FUNDO",
        value: String(data.qtd_cheques_sem_fundo ?? 0),
        cor: (data.qtd_cheques_sem_fundo ?? 0) > 0 ? C.red500 : C.emerald500,
      },
      {
        label: "TOTAL DÍVIDAS",
        value: `R$ ${formatBRL(data.total_dividas)}`,
        cor: data.total_dividas > 0 ? C.red500 : C.emerald500,
      },
    ];

    items.forEach((it, i) => {
      const x = M + i * (colWidth + 6);
      doc.roundedRect(x, y, colWidth, resumoH, 3).strokeColor(C.gray200).lineWidth(0.5).stroke();
      doc.fillColor(C.gray500).fontSize(6).font("Helvetica-Bold").text(it.label, x + 8, y + 8, {
        width: colWidth - 16,
        characterSpacing: 0.4,
      });
      doc.fillColor(it.cor).fontSize(14).font("Helvetica-Bold").text(it.value, x + 8, y + 20, {
        width: colWidth - 16,
      });
    });
    y += resumoH + 12;

    // ─── DETALHAMENTO ───────────────────────────────────────
    if (data.tem_pendencia && data.pendencias && data.pendencias.length > 0) {
      // Tabela de pendências
      doc
        .fillColor(C.gray500)
        .fontSize(7)
        .font("Helvetica-Bold")
        .text("DETALHAMENTO DAS PENDÊNCIAS", M, y, { characterSpacing: 0.8 });
      y += 10;
      doc.strokeColor(C.gray200).lineWidth(0.5).moveTo(M, y).lineTo(PAGE_W - M, y).stroke();
      y += 6;

      // Header
      doc.rect(M, y, W, 16).fill(C.gray50);
      doc.fillColor(C.gray700).fontSize(7).font("Helvetica-Bold");
      doc.text("CREDOR", M + 8, y + 5, { width: W * 0.45, characterSpacing: 0.4 });
      doc.text("DATA", M + W * 0.5, y + 5, { width: W * 0.18, characterSpacing: 0.4 });
      doc.text("ORIGEM", M + W * 0.68, y + 5, { width: W * 0.14, characterSpacing: 0.4 });
      doc.text("VALOR", M + W * 0.82, y + 5, { width: W * 0.18 - 8, align: "right", characterSpacing: 0.4 });
      y += 18;

      // Rows (max 8 pra caber em 1 página)
      const rows = data.pendencias.slice(0, 8);
      rows.forEach((p, i) => {
        const rowH = 16;
        if (i % 2 === 1) doc.rect(M, y, W, rowH).fill(C.gray50);
        doc.fillColor(C.gray800).fontSize(8).font("Helvetica");
        doc.text(p.credor.slice(0, 38), M + 8, y + 4, { width: W * 0.45 });
        doc.text(p.data || "—", M + W * 0.5, y + 4, { width: W * 0.18 });
        doc.text(p.origem || "Serasa", M + W * 0.68, y + 4, { width: W * 0.14 });
        doc.fillColor(C.red500).font("Helvetica-Bold");
        doc.text(`R$ ${formatBRL(p.valor)}`, M + W * 0.82, y + 4, {
          width: W * 0.18 - 8,
          align: "right",
        });
        y += rowH;
      });

      if (data.pendencias.length > 8) {
        doc
          .fillColor(C.gray500)
          .fontSize(7)
          .font("Helvetica-Oblique")
          .text(`+ ${data.pendencias.length - 8} pendência(s) adicional(is) — solicite o detalhamento completo via WhatsApp.`, M, y + 4);
        y += 14;
      }
    } else {
      // Bloco "Análise de Perfil" — denso, profissional
      doc
        .fillColor(C.gray500)
        .fontSize(7)
        .font("Helvetica-Bold")
        .text("ANÁLISE DE PERFIL DE CRÉDITO", M, y, { characterSpacing: 0.8 });
      y += 10;
      doc.strokeColor(C.gray200).lineWidth(0.5).moveTo(M, y).lineTo(PAGE_W - M, y).stroke();
      y += 10;

      // Texto de análise contextual
      const scS = scoreS ?? 0;
      const faixaS = scoreFaixa(scS);
      let analise = "";
      if (faixaS === "MUITO BAIXO") {
        analise =
          "Seu perfil indica pouco histórico de crédito ativo. Isso é comum em pessoas jovens ou que não utilizam crédito com frequência. Não é uma penalização — é apenas a ausência de informação para o modelo estatístico avaliar seu comportamento financeiro.";
      } else if (faixaS === "BAIXO") {
        analise =
          "Seu score está em construção. Pequenas ações como pagar contas em dia, manter cadastro atualizado e ativar o Cadastro Positivo podem elevar seu score significativamente nos próximos 6 meses.";
      } else if (faixaS === "REGULAR") {
        analise =
          "Você tem um perfil de crédito intermediário. Bancos e financeiras já consideram seu perfil para concessão de crédito, mas com taxas e limites moderados. Continue mantendo as contas em dia para subir de faixa.";
      } else if (faixaS === "BOM") {
        analise =
          "Excelente! Você tem um perfil de crédito confiável. Bancos e financeiras costumam oferecer melhores condições de juros e limites para perfis como o seu.";
      } else {
        analise =
          "Perfil de crédito excepcional. Você está entre os melhores pagadores do Brasil — aproveite para negociar as melhores condições de crédito.";
      }
      doc.fillColor(C.gray700).fontSize(8.5).font("Helvetica").text(analise, M, y, {
        width: W,
        align: "justify",
        lineGap: 2,
      });
      y += 38;

      // Recomendações em 2 colunas
      doc
        .fillColor(C.gray500)
        .fontSize(7)
        .font("Helvetica-Bold")
        .text("RECOMENDAÇÕES PERSONALIZADAS", M, y, { characterSpacing: 0.8 });
      y += 10;
      doc.strokeColor(C.gray200).lineWidth(0.5).moveTo(M, y).lineTo(PAGE_W - M, y).stroke();
      y += 8;

      const recs = [
        {
          titulo: "Mantenha as contas em dia",
          desc: "Pagamentos pontuais são o principal fator do score Serasa e Boa Vista.",
        },
        {
          titulo: "Ative o Cadastro Positivo",
          desc: "Pagamentos em dia constroem histórico e elevam o score nas duas bases.",
        },
        {
          titulo: "Use crédito com moderação",
          desc: "Evite usar mais de 30% do limite de cartões e cheque especial.",
        },
        {
          titulo: "Mantenha cadastro atualizado",
          desc: "Telefone, e-mail e endereço atualizados aumentam a confiabilidade do perfil.",
        },
        {
          titulo: "Consulte seu CPF regularmente",
          desc: "Acompanhe o score e proteja-se contra fraudes e uso indevido do seu CPF.",
        },
        {
          titulo: "Negocie dívidas antes que virem restrição",
          desc: "Acordos prévios evitam negativação e preservam seu score.",
        },
      ];

      recs.forEach((r, i) => {
        const x = M + (i % 2) * (W / 2 + 6);
        const yy = y + Math.floor(i / 2) * 32;
        // Ícone bullet
        doc.circle(x + 4, yy + 5, 2).fill(C.brand500);
        doc.fillColor(C.forest800).fontSize(8.5).font("Helvetica-Bold").text(r.titulo, x + 14, yy, {
          width: W / 2 - 20,
        });
        doc.fillColor(C.gray600).fontSize(7).font("Helvetica").text(r.desc, x + 14, yy + 10, {
          width: W / 2 - 20,
        });
      });
      y += 100;
    }

    // ─── PROBABILIDADE PAGAMENTO (banner) ───────────────────
    if (data.probabilidade_pagamento) {
      const probH = 26;
      doc.roundedRect(M, y, W, probH, 3).fill(C.gray50);
      doc
        .fillColor(C.gray600)
        .fontSize(8)
        .font("Helvetica")
        .text("PROBABILIDADE DE PAGAMENTO EM 6 MESES", M + 12, y + 7, {
          characterSpacing: 0.5,
          lineBreak: false,
        });
      doc
        .fillColor(C.gray500)
        .fontSize(7)
        .font("Helvetica")
        .text("(modelo Serasa Experian)", M + 12, y + 16, { lineBreak: false });
      doc
        .fillColor(C.forest800)
        .fontSize(14)
        .font("Helvetica-Bold")
        .text(data.probabilidade_pagamento, M, y + 7, {
          width: W - 12,
          align: "right",
          lineBreak: false,
        });
      y += probH + 8;
    }

    // ─── FOOTER (selo de autenticação + fontes) ─────────────
    const footY = PAGE_H - 60;
    doc.rect(0, footY, PAGE_W, 60).fill(C.forest800);

    doc.fillColor(C.brand500).fontSize(7).font("Helvetica-Bold").text(
      `Protocolo: ${protocolo}`,
      M,
      footY + 12,
      { characterSpacing: 0.6 }
    );
    doc.fillColor(C.gray300).fontSize(6.5).font("Helvetica").text(
      "Fontes oficiais: Serasa Experian · Boa Vista SCPC · Receita Federal",
      M,
      footY + 24
    );
    doc.fillColor(C.gray400).fontSize(6).font("Helvetica").text(
      "Documento autenticado pela Limpa Nome Brazil · LGPD compatível (Lei 13.709/2018)",
      M,
      footY + 35
    );
    doc.text(
      "Os dados refletem as bases consultadas na data/hora de emissão e podem variar conforme atualização dos bureaus.",
      M,
      footY + 44
    );

    // Contato à direita
    doc.fillColor(C.white).fontSize(7).font("Helvetica-Bold").text(
      "limpanomebrazil.com.br",
      M,
      footY + 12,
      { width: W, align: "right" }
    );
    doc.fillColor(C.gray300).fontSize(6.5).font("Helvetica").text(
      "contato@limpanomebrazil.com.br",
      M,
      footY + 24,
      { width: W, align: "right" }
    );
    doc.text("WhatsApp (11) 99744-0101", M, footY + 35, { width: W, align: "right" });

    doc.end();
  });
}

export async function gerarESalvarRelatorio(
  input: RelatorioInput
): Promise<{ ok: true; pdfUrl: string; path: string } | { ok: false; error: string }> {
  try {
    const buffer = await montarPdf(input);
    const supa = createStorageClient();
    const path = `consultas/${input.cpf.replace(/\D/g, "")}/${Date.now()}-relatorio.pdf`;
    const { error: upErr } = await supa.storage.from(BUCKET).upload(path, buffer, {
      contentType: "application/pdf",
      upsert: true,
    });
    if (upErr) return { ok: false, error: `Upload falhou: ${upErr.message}` };
    const { data: urlData } = supa.storage.from(BUCKET).getPublicUrl(path);
    return { ok: true, pdfUrl: urlData.publicUrl, path };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[pdf-gerar] erro:", msg);
    return { ok: false, error: msg };
  }
}
