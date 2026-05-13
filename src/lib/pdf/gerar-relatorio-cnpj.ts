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

// Paleta LNB (mesma do PDF CPF pra consistência visual)
const C = {
  forest800: "#13312E",
  brand500: "#0298D9",
  brand400: "#33ABDF",
  sand: "#DBD2C6",
  red500: "#DC2626",
  amber500: "#D97706",
  emerald500: "#059669",
  emerald100: "#D1FAE5",
  gray50: "#F9FAFB",
  gray100: "#F3F4F6",
  gray200: "#E5E7EB",
  gray300: "#D1D5DB",
  gray500: "#6B7280",
  gray600: "#4B5563",
  gray700: "#374151",
  white: "#FFFFFF",
};

export interface RelatorioCNPJInput {
  cnpj: string;
  razao_social: string;
  nome_fantasia?: string;
  situacao_cadastral?: string;
  data_abertura?: string;
  capital_social?: number;
  cnae_principal?: string;
  endereco?: string;
  socios?: Array<{ nome: string; cpf: string; qualificacao: string }>;
  // Responsável (sócio admin) — score + pendências
  nome_responsavel?: string;
  cpf_responsavel?: string;
  email?: string;
  telefone?: string;
  score?: number;
  // Multi-bureau (novo)
  score_serasa?: number;
  score_boa_vista?: number;
  probabilidade_pagamento?: string;
  data_nascimento_responsavel?: string;
  situacao_receita_responsavel?: string;
  qtd_protestos?: number;
  qtd_cheques_sem_fundo?: number;
  // Resumo agregado
  tem_pendencia: boolean;
  qtd_pendencias: number;
  total_dividas: number;
  pendencias?: Array<{ credor: string; valor: number; data?: string }>;
  data_consulta?: string;
}

function formatCNPJ(c: string): string {
  const x = c.replace(/\D/g, "");
  if (x.length !== 14) return c;
  return `${x.slice(0, 2)}.${x.slice(2, 5)}.${x.slice(5, 8)}/${x.slice(8, 12)}-${x.slice(12)}`;
}
function formatCPF(c: string): string {
  const x = c.replace(/\D/g, "");
  if (x.length !== 11) return c;
  return `${x.slice(0, 3)}.${x.slice(3, 6)}.${x.slice(6, 9)}-${x.slice(9)}`;
}
function formatBRL(v: number): string {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function scoreColor(s: number) {
  if (s >= 700) return C.emerald500;
  if (s >= 500) return C.amber500;
  if (s >= 300) return C.amber500;
  return C.red500;
}
function scoreFaixa(s: number) {
  if (s >= 700) return "BOM";
  if (s >= 500) return "REGULAR";
  if (s >= 300) return "BAIXO";
  return "MUITO BAIXO";
}

async function montarPdfCNPJ(data: RelatorioCNPJInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 0,
      info: {
        Title: `Relatório CNPJ ${formatCNPJ(data.cnpj)} — LNB`,
        Author: "Limpa Nome Brazil",
        Subject: "Relatório de Consulta de CNPJ",
        Keywords: "CNPJ, empresa, Receita Federal, score, Serasa, Boa Vista",
      },
    });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const PAGE_W = 595.28;
    const PAGE_H = 841.89;
    const M = 40;
    const W = PAGE_W - M * 2;

    const dataStr =
      data.data_consulta ||
      new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
    const horaStr = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const sc = data.score ?? 0;
    const corScore = scoreColor(sc);
    const faixa = scoreFaixa(sc);
    const protocolo = `LNB-PJ-${data.cnpj.replace(/\D/g, "").slice(-6)}-${Date.now().toString().slice(-6)}`;

    // HEADER
    const HEADER_H = 56;
    doc.rect(0, 0, PAGE_W, HEADER_H).fill(C.forest800);
    doc.fillColor(C.white).fontSize(15).font("Helvetica-Bold");
    doc.text("LNB", M, 16);
    doc.fillColor(C.brand400).fontSize(7).font("Helvetica-Bold");
    doc.text("LIMPA NOME BRAZIL", M, 36, { characterSpacing: 1.5 });
    doc.fillColor(C.white).fontSize(10).font("Helvetica-Bold");
    doc.text("RELATÓRIO DE CONSULTA DE CNPJ", PAGE_W - M - 280, 19, {
      width: 280,
      align: "right",
      characterSpacing: 1,
    });
    doc.fillColor(C.sand).fontSize(8).font("Helvetica");
    doc.text(`Emitido em ${dataStr} às ${horaStr}`, PAGE_W - M - 280, 36, { width: 280, align: "right" });

    let y = HEADER_H + 20;

    // DADOS DA EMPRESA
    doc.fillColor(C.gray500).fontSize(8).font("Helvetica-Bold");
    doc.text("DADOS DA EMPRESA", M, y, { characterSpacing: 1.5 });
    y += 12;
    doc.moveTo(M, y).lineTo(M + W, y).lineWidth(0.5).strokeColor(C.gray200).stroke();
    y += 8;

    // Razão social (full width)
    doc.fillColor(C.gray500).fontSize(7).font("Helvetica");
    doc.text("RAZÃO SOCIAL", M, y, { characterSpacing: 1 });
    doc.fillColor(C.forest800).fontSize(11).font("Helvetica-Bold");
    doc.text(data.razao_social || "—", M, y + 9, { width: W });
    y += 26;

    if (data.nome_fantasia && data.nome_fantasia !== data.razao_social) {
      doc.fillColor(C.gray500).fontSize(7).font("Helvetica");
      doc.text("NOME FANTASIA", M, y, { characterSpacing: 1 });
      doc.fillColor(C.forest800).fontSize(10).font("Helvetica-Bold");
      doc.text(data.nome_fantasia, M, y + 9, { width: W });
      y += 24;
    }

    // 3 colunas: CNPJ / Situação / Data abertura
    const colW = (W - 20) / 3;
    const cols: Array<[string, string]> = [
      ["CNPJ", formatCNPJ(data.cnpj)],
      ["SITUAÇÃO", data.situacao_cadastral || "—"],
      ["ABERTURA", data.data_abertura || "—"],
    ];
    cols.forEach((item, i) => {
      const cx = M + i * (colW + 10);
      doc.fillColor(C.gray500).fontSize(7).font("Helvetica");
      doc.text(item[0], cx, y, { characterSpacing: 1 });
      doc.fillColor(C.forest800).fontSize(9).font("Helvetica-Bold");
      doc.text(item[1], cx, y + 9, { width: colW });
    });
    y += 26;

    // Capital social + CNAE em 2 colunas
    const halfW = W / 2;
    const cols2: Array<[string, string]> = [
      ["CAPITAL SOCIAL", data.capital_social ? `R$ ${formatBRL(data.capital_social)}` : "—"],
      ["CNAE PRINCIPAL", data.cnae_principal || "—"],
    ];
    cols2.forEach((item, i) => {
      const cx = M + i * halfW;
      doc.fillColor(C.gray500).fontSize(7).font("Helvetica");
      doc.text(item[0], cx, y, { characterSpacing: 1 });
      doc.fillColor(C.forest800).fontSize(9).font("Helvetica-Bold");
      doc.text(item[1], cx, y + 9, { width: halfW - 12 });
    });
    y += 24;

    // Endereço (full width, opcional)
    if (data.endereco) {
      doc.fillColor(C.gray500).fontSize(7).font("Helvetica");
      doc.text("ENDEREÇO", M, y, { characterSpacing: 1 });
      doc.fillColor(C.forest800).fontSize(9).font("Helvetica");
      doc.text(data.endereco, M, y + 9, { width: W, height: 20, ellipsis: true });
      y += 26;
    }

    // SÓCIOS (até 3)
    if (data.socios && data.socios.length > 0) {
      doc.fillColor(C.gray500).fontSize(8).font("Helvetica-Bold");
      doc.text("QUADRO SOCIETÁRIO", M, y, { characterSpacing: 1.5 });
      y += 12;
      doc.moveTo(M, y).lineTo(M + W, y).lineWidth(0.5).strokeColor(C.gray200).stroke();
      y += 8;

      const maxSocios = 3;
      data.socios.slice(0, maxSocios).forEach((s) => {
        doc.fillColor(C.forest800).fontSize(9).font("Helvetica-Bold");
        doc.text(s.nome || "—", M, y, { width: W * 0.55 });
        if (s.qualificacao) {
          doc.fillColor(C.gray600).fontSize(8).font("Helvetica");
          doc.text(s.qualificacao, M + W * 0.55, y, { width: W * 0.45, align: "right" });
        }
        if (s.cpf) {
          doc.fillColor(C.gray500).fontSize(7).font("Helvetica");
          doc.text(`CPF: ${formatCPF(s.cpf)}`, M, y + 11);
        }
        y += 22;
      });

      if (data.socios.length > maxSocios) {
        doc.fillColor(C.gray500).fontSize(7).font("Helvetica-Oblique");
        doc.text(`+ ${data.socios.length - maxSocios} sócio(s) — detalhamento completo na área online`, M, y, { width: W });
        y += 12;
      }
      y += 4;
    }

    // RESPONSÁVEL — ANÁLISE FINANCEIRA (do sócio admin)
    doc.fillColor(C.gray500).fontSize(8).font("Helvetica-Bold");
    doc.text("ANÁLISE FINANCEIRA DO RESPONSÁVEL", M, y, { characterSpacing: 1.5 });
    y += 12;
    doc.moveTo(M, y).lineTo(M + W, y).lineWidth(0.5).strokeColor(C.gray200).stroke();
    y += 6;

    if (data.nome_responsavel) {
      doc.fillColor(C.gray600).fontSize(8).font("Helvetica");
      doc.text(
        `${data.nome_responsavel}${data.cpf_responsavel ? ` · CPF ${formatCPF(data.cpf_responsavel)}` : ""}`,
        M, y, { width: W }
      );
      y += 14;
    }

    // 4 boxes Score/Faixa/Pendências/Total
    const boxW = (W - 24) / 4;
    const boxH = 56;
    const boxes = [
      { label: "SCORE", value: `${sc}`, sub: "de 1000", color: corScore, big: true },
      { label: "FAIXA", value: faixa, sub: faixa === "BOM" ? "ótimo" : faixa === "REGULAR" ? "atenção" : "ação", color: corScore },
      { label: "PENDÊNCIAS", value: String(data.qtd_pendencias), sub: data.qtd_pendencias === 1 ? "registro" : "registros", color: data.tem_pendencia ? C.red500 : C.emerald500, big: true },
      { label: "TOTAL", value: `R$ ${formatBRL(data.total_dividas)}`, sub: data.tem_pendencia ? "consolidado" : "sem dívidas", color: data.tem_pendencia ? C.red500 : C.emerald500 },
    ];
    boxes.forEach((b, i) => {
      const bx = M + i * (boxW + 8);
      doc.rect(bx, y, boxW, boxH).fill(C.gray50);
      doc.rect(bx, y, 3, boxH).fill(b.color);
      doc.fillColor(C.gray500).fontSize(7).font("Helvetica-Bold");
      doc.text(b.label, bx + 10, y + 7, { characterSpacing: 1, width: boxW - 14 });
      const fs = b.big ? 18 : b.value.length > 10 ? 11 : 14;
      doc.fillColor(b.color).fontSize(fs).font("Helvetica-Bold");
      doc.text(b.value, bx + 10, y + 18, { width: boxW - 14 });
      doc.fillColor(C.gray500).fontSize(7).font("Helvetica");
      doc.text(b.sub, bx + 10, y + boxH - 12, { width: boxW - 14 });
    });
    y += boxH + 16;

    // PENDÊNCIAS
    if (data.tem_pendencia && data.pendencias && data.pendencias.length > 0) {
      doc.fillColor(C.gray500).fontSize(8).font("Helvetica-Bold");
      doc.text("PENDÊNCIAS REGISTRADAS", M, y, { characterSpacing: 1.5 });
      y += 12;

      doc.rect(M, y, W, 20).fill(C.forest800);
      doc.fillColor(C.white).fontSize(8).font("Helvetica-Bold");
      doc.text("#", M + 8, y + 6, { width: 18 });
      doc.text("CREDOR", M + 32, y + 6, { width: W * 0.5 });
      doc.text("DATA", M + W * 0.62, y + 6, { width: W * 0.18 });
      doc.text("VALOR", M + W * 0.8, y + 6, { width: W * 0.18 - 8, align: "right" });
      y += 20;

      const maxRows = 5;
      const rows = data.pendencias.slice(0, maxRows);
      rows.forEach((p, i) => {
        const rh = 20;
        if (i % 2 === 0) doc.rect(M, y, W, rh).fill(C.gray50);
        doc.fillColor(C.gray500).fontSize(8).font("Helvetica");
        doc.text(`${String(i + 1).padStart(2, "0")}`, M + 8, y + 6, { width: 18 });
        doc.fillColor(C.forest800).fontSize(9).font("Helvetica-Bold");
        doc.text(p.credor, M + 32, y + 6, { width: W * 0.5 - 8, ellipsis: true });
        doc.fillColor(C.gray600).fontSize(8).font("Helvetica");
        doc.text(p.data || "—", M + W * 0.62, y + 6, { width: W * 0.18 });
        doc.fillColor(C.red500).fontSize(9).font("Helvetica-Bold");
        doc.text(`R$ ${formatBRL(p.valor)}`, M + W * 0.8, y + 6, { width: W * 0.18 - 8, align: "right" });
        y += rh;
      });

      if (data.pendencias.length > maxRows) {
        doc.rect(M, y, W, 16).fill(C.gray100);
        doc.fillColor(C.gray600).fontSize(7).font("Helvetica-Oblique");
        doc.text(`+ ${data.pendencias.length - maxRows} adicional(is) na área online`, M + 10, y + 4, { width: W - 20, align: "center" });
        y += 16;
      }

      doc.rect(M, y, W, 22).fill(C.forest800);
      doc.fillColor(C.white).fontSize(9).font("Helvetica-Bold");
      doc.text("TOTAL", M + 10, y + 7, { characterSpacing: 1 });
      doc.fillColor(C.brand400).fontSize(12).font("Helvetica-Bold");
      doc.text(`R$ ${formatBRL(data.total_dividas)}`, M, y + 6, { width: W - 12, align: "right" });
      y += 26;
    } else if (!data.tem_pendencia) {
      doc.rect(M, y, W, 44).fill(C.emerald100);
      doc.rect(M, y, 3, 44).fill(C.emerald500);
      doc.fillColor(C.emerald500).fontSize(11).font("Helvetica-Bold");
      doc.text("✓ RESPONSÁVEL SEM PENDÊNCIAS", M + 14, y + 10, { characterSpacing: 1 });
      doc.fillColor(C.gray700).fontSize(9).font("Helvetica");
      doc.text("Empresa apta a obter crédito normalmente.", M + 14, y + 26, { width: W - 28 });
      y += 50;
    }

    // CTA Limpeza CNPJ
    if (data.tem_pendencia && y < PAGE_H - 130) {
      y += 8;
      const ctaH = 72;
      doc.rect(M, y, W, ctaH).fill(C.forest800);
      doc.fillColor(C.brand400).fontSize(7).font("Helvetica-Bold");
      doc.text("RECOMENDAÇÃO", M + 14, y + 10, { characterSpacing: 1.5 });
      doc.fillColor(C.white).fontSize(12).font("Helvetica-Bold");
      doc.text("Limpe o nome da empresa e do sócio em até 20 dias úteis", M + 14, y + 22);
      doc.fillColor(C.sand).fontSize(8).font("Helvetica");
      doc.text("Sem quitar dívida · Sem negociar credor · Monitoramento 12 meses bônus", M + 14, y + 38, { width: W - 180 });
      doc.fillColor(C.brand400).fontSize(7).font("Helvetica-Bold");
      doc.text("INVESTIMENTO", M + 14, y + 54, { characterSpacing: 1 });
      doc.fillColor(C.white).fontSize(13).font("Helvetica-Bold");
      doc.text("R$ 580,01", M + 84, y + 51);
      const cbW = 130;
      const cbX = M + W - cbW - 14;
      doc.rect(cbX, y + 18, cbW, 36).fill(C.brand500);
      doc.fillColor(C.white).fontSize(8).font("Helvetica-Bold");
      doc.text("ACESSE", cbX, y + 24, { width: cbW, align: "center", characterSpacing: 1.5 });
      doc.fillColor(C.white).fontSize(10).font("Helvetica-Bold");
      doc.text("limpanomebrazil.com.br", cbX, y + 38, { width: cbW, align: "center" });
      y += ctaH + 6;
    }

    // FOOTER
    const FOOTER_Y = PAGE_H - 50;
    doc.moveTo(M, FOOTER_Y).lineTo(M + W, FOOTER_Y).lineWidth(0.5).strokeColor(C.gray300).stroke();
    doc.fillColor(C.gray500).fontSize(7).font("Helvetica");
    doc.text(`Protocolo: ${protocolo}`, M, FOOTER_Y + 8);
    doc.text("Fonte: Receita Federal + Boa Vista SCPC + Serasa Experian", M, FOOTER_Y + 20);
    doc.text("Documento autenticado · LGPD compatível", M, FOOTER_Y + 32);
    doc.fillColor(C.forest800).fontSize(8).font("Helvetica-Bold");
    doc.text("limpanomebrazil.com.br", PAGE_W - M - 200, FOOTER_Y + 8, { width: 200, align: "right" });
    doc.fillColor(C.gray600).fontSize(7).font("Helvetica");
    doc.text("contato@limpanomebrazil.com.br", PAGE_W - M - 200, FOOTER_Y + 20, { width: 200, align: "right" });
    doc.text("WhatsApp (11) 99744-0101", PAGE_W - M - 200, FOOTER_Y + 32, { width: 200, align: "right" });

    doc.end();
  });
}

export async function gerarESalvarRelatorioCNPJ(
  data: RelatorioCNPJInput
): Promise<{ ok: true; pdfUrl: string; path: string } | { ok: false; error: string }> {
  try {
    const buffer = await montarPdfCNPJ(data);
    const cnpjClean = data.cnpj.replace(/\D/g, "");
    const ts = Date.now();
    const path = `consultas-cnpj/${cnpjClean}/${ts}-relatorio.pdf`;

    const supa = createStorageClient();
    const { error: upErr } = await supa.storage.from(BUCKET).upload(path, buffer, {
      contentType: "application/pdf",
      upsert: true,
    });
    if (upErr) return { ok: false, error: `Upload falhou: ${upErr.message}` };

    const { data: urlData } = supa.storage.from(BUCKET).getPublicUrl(path);
    return { ok: true, pdfUrl: urlData.publicUrl, path };
  } catch (e) {
    const errMsg = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    console.error("[pdf-cnpj] erro:", errMsg);
    return { ok: false, error: errMsg };
  }
}

export { montarPdfCNPJ };
