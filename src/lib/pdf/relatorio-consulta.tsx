/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Document, Page, Text, View, StyleSheet, Image,
} from "@react-pdf/renderer";

/**
 * Relatório PDF profissional da Consulta de CPF — branding LNB.
 * 4 páginas: Capa · Dashboard · Pendências · Solução
 * Geração 100% server-side via @react-pdf/renderer.
 */

// Paleta LNB Brand Guide
const C = {
  forest900: "#0A1F1D",
  forest800: "#13312E",
  forest700: "#1F5D5D",
  forest600: "#2A7E7E",
  brand500: "#0298D9",
  brand400: "#33ABDF",
  brand100: "#CCE9F8",
  sand: "#DBD2C6",
  sandLight: "#F5F0E7",
  sandDark: "#A89B8B",
  black: "#000000",
  red500: "#DC2626",
  red100: "#FEE2E2",
  amber500: "#D97706",
  amber100: "#FEF3C7",
  emerald500: "#059669",
  emerald100: "#D1FAE5",
  gray50: "#F9FAFB",
  gray100: "#F3F4F6",
  gray200: "#E5E7EB",
  gray400: "#9CA3AF",
  gray500: "#6B7280",
  gray600: "#4B5563",
  gray700: "#374151",
  gray800: "#1F2937",
  gray900: "#111827",
  white: "#FFFFFF",
};

const SITE_URL = "https://limpanomebrazil.com.br";
const LOGO_URL = `${SITE_URL}/brand/lnb-logo.png`;

const styles = StyleSheet.create({
  // ─── Page base ──────────────────────────────────────
  page: {
    backgroundColor: C.white,
    fontSize: 10,
    color: C.gray800,
    fontFamily: "Helvetica",
  },

  // ─── CAPA ───────────────────────────────────────────
  capa: {
    flex: 1,
    backgroundColor: C.forest800,
    color: C.white,
    padding: 50,
    flexDirection: "column",
    justifyContent: "space-between",
  },
  capaTopo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  capaLogo: { width: 140, height: 56, objectFit: "contain" },
  capaSeloAuth: {
    backgroundColor: C.brand500,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: 1,
  },
  capaCentro: { marginVertical: 60 },
  capaEyebrow: {
    fontSize: 11,
    color: C.brand400,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 4,
    marginBottom: 14,
  },
  capaTitulo: {
    fontSize: 42,
    fontWeight: 700,
    color: C.white,
    lineHeight: 1.05,
    marginBottom: 16,
  },
  capaSubtitulo: {
    fontSize: 13,
    color: C.sand,
    lineHeight: 1.6,
    maxWidth: 380,
  },
  capaInfoBox: {
    marginTop: 50,
    padding: 22,
    backgroundColor: "rgba(2, 152, 217, 0.12)",
    borderLeftWidth: 4,
    borderLeftColor: C.brand500,
    borderRadius: 4,
  },
  capaInfoLabel: {
    fontSize: 8,
    color: C.brand400,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  capaInfoValue: {
    fontSize: 18,
    color: C.white,
    fontWeight: 700,
    marginTop: 4,
  },
  capaRodape: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: "rgba(219, 210, 198, 0.25)",
  },
  capaMeta: {
    fontSize: 9,
    color: C.sand,
    lineHeight: 1.6,
  },
  capaMetaBold: { fontWeight: 700, color: C.white },

  // ─── PÁGINA conteúdo ────────────────────────────────
  conteudo: {
    paddingHorizontal: 40,
    paddingVertical: 30,
    paddingBottom: 60,
  },

  // ─── HEADER páginas internas ────────────────────────
  pageHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 40,
    paddingVertical: 14,
    backgroundColor: C.forest800,
    color: C.white,
  },
  pageHeaderLogo: { width: 80, height: 28, objectFit: "contain" },
  pageHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  pageHeaderBadge: {
    fontSize: 8,
    color: C.brand400,
    fontWeight: 700,
    letterSpacing: 1,
  },

  // ─── Section title ──────────────────────────────────
  sectionEyebrow: {
    fontSize: 9,
    color: C.brand500,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 700,
    color: C.forest800,
    lineHeight: 1.2,
    marginBottom: 6,
  },
  sectionSub: {
    fontSize: 11,
    color: C.gray600,
    lineHeight: 1.5,
    marginBottom: 18,
  },

  // ─── Cards/blocks ───────────────────────────────────
  divider: {
    height: 1,
    backgroundColor: C.gray200,
    marginVertical: 18,
  },

  // ─── Identificação card ─────────────────────────────
  identCard: {
    backgroundColor: C.sandLight,
    borderRadius: 6,
    padding: 18,
    marginBottom: 16,
  },
  identGrid: { flexDirection: "row", flexWrap: "wrap" },
  identItem: { width: "50%", marginBottom: 10 },
  identLabel: {
    fontSize: 7,
    color: C.gray500,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  identValue: {
    fontSize: 12,
    color: C.forest800,
    fontWeight: 700,
    marginTop: 2,
  },

  // ─── SCORE: layout 2 colunas ─────────────────────────
  scoreSection: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 16,
  },
  scoreLeft: {
    width: 200,
    padding: 18,
    backgroundColor: C.gray50,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreRight: { flex: 1, justifyContent: "center" },
  scoreLegenda: { fontSize: 9, color: C.gray600, lineHeight: 1.6 },
  scoreFaixaItem: { flexDirection: "row", alignItems: "center", marginBottom: 5 },
  scoreFaixaCor: { width: 10, height: 10, borderRadius: 2, marginRight: 8 },
  scoreFaixaText: { fontSize: 9, color: C.gray700 },

  // ─── STATS row ──────────────────────────────────────
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 18 },
  stat: {
    flex: 1,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.gray200,
    borderRadius: 8,
    padding: 14,
  },
  statLabel: {
    fontSize: 8,
    color: C.gray500,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  statValue: {
    fontSize: 22,
    fontWeight: 700,
    marginTop: 4,
    color: C.forest800,
  },
  statSub: { fontSize: 9, color: C.gray500, marginTop: 2 },

  // ─── Status badge ───────────────────────────────────
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: 1,
    alignSelf: "flex-start",
    textTransform: "uppercase",
  },

  // ─── Pendências (cards individuais) ─────────────────
  pendCard: {
    flexDirection: "row",
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.gray200,
    borderLeftWidth: 4,
    borderLeftColor: C.red500,
    borderRadius: 6,
    padding: 14,
    marginBottom: 8,
  },
  pendNum: {
    fontSize: 9,
    fontWeight: 700,
    color: C.gray400,
    marginRight: 12,
    width: 22,
  },
  pendBody: { flex: 1 },
  pendCredor: {
    fontSize: 11,
    fontWeight: 700,
    color: C.forest800,
    marginBottom: 2,
  },
  pendData: { fontSize: 9, color: C.gray500 },
  pendValor: {
    fontSize: 14,
    fontWeight: 700,
    color: C.red500,
  },

  // ─── SOLUÇÃO LNB box ────────────────────────────────
  solucao: {
    backgroundColor: C.forest800,
    borderRadius: 10,
    padding: 28,
    marginTop: 20,
    color: C.white,
    overflow: "hidden",
  },
  solucaoEyebrow: {
    fontSize: 9,
    color: C.brand400,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 3,
    marginBottom: 8,
  },
  solucaoTitulo: {
    fontSize: 24,
    fontWeight: 700,
    color: C.white,
    lineHeight: 1.2,
    marginBottom: 12,
  },
  solucaoTexto: {
    fontSize: 11,
    color: C.sand,
    lineHeight: 1.7,
    marginBottom: 18,
  },
  solucaoLista: { marginBottom: 20 },
  solucaoItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  solucaoCheck: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: C.brand500,
    marginRight: 10,
    marginTop: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  solucaoCheckText: { color: C.white, fontSize: 9, fontWeight: 700 },
  solucaoItemText: { fontSize: 11, color: C.white, flex: 1, lineHeight: 1.5 },
  solucaoPreco: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 8,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: "rgba(219, 210, 198, 0.2)",
  },
  solucaoPrecoLabel: {
    fontSize: 9,
    color: C.brand400,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 2,
    marginRight: 12,
  },
  solucaoPrecoValor: {
    fontSize: 28,
    fontWeight: 700,
    color: C.white,
  },
  solucaoCta: {
    backgroundColor: C.brand500,
    color: C.white,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 700,
    marginTop: 16,
    alignSelf: "flex-start",
    letterSpacing: 1,
  },

  // ─── Como funciona (passos) ─────────────────────────
  passo: {
    flexDirection: "row",
    marginBottom: 14,
    alignItems: "flex-start",
  },
  passoNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.brand500,
    color: C.white,
    fontSize: 12,
    fontWeight: 700,
    textAlign: "center",
    paddingTop: 6,
    marginRight: 14,
  },
  passoBody: { flex: 1 },
  passoTitulo: {
    fontSize: 11,
    fontWeight: 700,
    color: C.forest800,
    marginBottom: 3,
  },
  passoDesc: {
    fontSize: 10,
    color: C.gray600,
    lineHeight: 1.5,
  },

  // ─── Box "Nome limpo" (sem pendência) ────────────────
  boxNomeLimpo: {
    backgroundColor: C.emerald500,
    borderRadius: 10,
    padding: 28,
    marginTop: 16,
    color: C.white,
  },
  boxNomeLimpoEyebrow: {
    fontSize: 9,
    color: "rgba(255,255,255,0.85)",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 6,
  },
  boxNomeLimpoTitulo: {
    fontSize: 22,
    fontWeight: 700,
    color: C.white,
    marginBottom: 10,
  },
  boxNomeLimpoTexto: {
    fontSize: 11,
    color: "rgba(255,255,255,0.95)",
    lineHeight: 1.6,
  },

  // ─── Footer ─────────────────────────────────────────
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 40,
    paddingVertical: 12,
    backgroundColor: C.forest900,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerLeft: { fontSize: 8, color: C.sand, lineHeight: 1.4 },
  footerRight: {
    fontSize: 8,
    color: C.sand,
    textAlign: "right",
  },
  footerBold: { fontWeight: 700, color: C.white },

  // ─── Watermark autenticidade ────────────────────────
  watermarkBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.sandLight,
    padding: 14,
    borderRadius: 6,
    marginTop: 18,
  },
  watermarkSelo: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: C.brand500,
    color: C.white,
    fontSize: 14,
    fontWeight: 700,
    textAlign: "center",
    paddingTop: 17,
    marginRight: 14,
  },
  watermarkBody: { flex: 1 },
  watermarkTitulo: { fontSize: 10, fontWeight: 700, color: C.forest800 },
  watermarkText: { fontSize: 8, color: C.gray600, marginTop: 2, lineHeight: 1.4 },
});

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

function scorePercent(score: number): number {
  return Math.max(0, Math.min(1, score / 1000));
}

// Barra horizontal de score (com ticks)
function ScoreBar({ score, color }: { score: number; color: string }) {
  const pct = Math.max(0, Math.min(1, score / 1000));
  return (
    <View style={{ width: "100%", marginTop: 8 }}>
      {/* Track + fill */}
      <View
        style={{
          height: 14,
          backgroundColor: C.gray200,
          borderRadius: 7,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            width: `${pct * 100}%`,
            height: 14,
            backgroundColor: color,
            borderRadius: 7,
          }}
        />
      </View>
      {/* Tick labels */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginTop: 6,
        }}
      >
        {["0", "300", "500", "700", "1000"].map((t) => (
          <Text key={t} style={{ fontSize: 7, color: C.gray500 }}>
            {t}
          </Text>
        ))}
      </View>
    </View>
  );
}

export function RelatorioConsultaPDF({ data }: { data: RelatorioInput }) {
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

  return (
    <Document
      title={`Relatório CPF ${formatCPF(data.cpf)} — LNB`}
      author="Limpa Nome Brazil"
      subject="Relatório de Consulta de CPF"
      keywords="CPF, score, Serasa, SPC, Boa Vista, limpa nome"
    >
      {/* ═══════════ PÁGINA 1 — CAPA ═══════════ */}
      <Page size="A4" style={styles.page}>
        <View style={styles.capa}>
          <View style={styles.capaTopo}>
            <Image src={LOGO_URL} style={styles.capaLogo} />
            <Text style={styles.capaSeloAuth}>DOCUMENTO AUTÊNTICO</Text>
          </View>

          <View style={styles.capaCentro}>
            <Text style={styles.capaEyebrow}>RELATÓRIO OFICIAL</Text>
            <Text style={styles.capaTitulo}>
              Consulta de CPF{"\n"}e Análise de{"\n"}Crédito
            </Text>
            <Text style={styles.capaSubtitulo}>
              Documento detalhado com score, pendências, credores e
              recomendações personalizadas para sua situação financeira.
            </Text>

            <View style={styles.capaInfoBox}>
              <Text style={styles.capaInfoLabel}>EMITIDO PARA</Text>
              <Text style={styles.capaInfoValue}>
                {data.nome || "Cliente Limpa Nome Brazil"}
              </Text>
              <View style={{ height: 12 }} />
              <Text style={styles.capaInfoLabel}>CPF</Text>
              <Text style={styles.capaInfoValue}>{formatCPF(data.cpf)}</Text>
            </View>
          </View>

          <View style={styles.capaRodape}>
            <View>
              <Text style={styles.capaMeta}>
                <Text style={styles.capaMetaBold}>Data:</Text> {dataStr} às {horaStr}
              </Text>
              <Text style={styles.capaMeta}>
                <Text style={styles.capaMetaBold}>Protocolo:</Text> {protocolo}
              </Text>
              <Text style={styles.capaMeta}>
                <Text style={styles.capaMetaBold}>Fonte:</Text> Boa Vista SCPC · Serasa Experian · SPC Brasil
              </Text>
            </View>
            <View>
              <Text style={[styles.capaMeta, { textAlign: "right" }]}>
                limpanomebrazil.com.br
              </Text>
              <Text style={[styles.capaMeta, { textAlign: "right" }]}>
                +55 11 99744-0101
              </Text>
              <Text style={[styles.capaMeta, { textAlign: "right" }]}>
                contato@limpanomebrazil.com.br
              </Text>
            </View>
          </View>
        </View>
      </Page>

      {/* ═══════════ PÁGINA 2 — DASHBOARD (Identificação + Score + Stats) ═══════════ */}
      <Page size="A4" style={styles.page}>
        <View style={styles.pageHeader}>
          <Image src={LOGO_URL} style={styles.pageHeaderLogo} />
          <View style={styles.pageHeaderRight}>
            <Text style={styles.pageHeaderBadge}>RELATÓRIO · {dataStr}</Text>
          </View>
        </View>

        <View style={styles.conteudo}>
          <Text style={styles.sectionEyebrow}>1. IDENTIFICAÇÃO</Text>
          <Text style={styles.sectionTitle}>Dados do consultado</Text>
          <Text style={styles.sectionSub}>
            Informações obtidas durante a consulta junto aos órgãos de proteção ao crédito.
          </Text>

          <View style={styles.identCard}>
            <View style={styles.identGrid}>
              <View style={styles.identItem}>
                <Text style={styles.identLabel}>Nome</Text>
                <Text style={styles.identValue}>{data.nome || "—"}</Text>
              </View>
              <View style={styles.identItem}>
                <Text style={styles.identLabel}>CPF</Text>
                <Text style={styles.identValue}>{formatCPF(data.cpf)}</Text>
              </View>
              {data.email && (
                <View style={styles.identItem}>
                  <Text style={styles.identLabel}>E-mail</Text>
                  <Text style={styles.identValue}>{data.email}</Text>
                </View>
              )}
              {data.telefone && (
                <View style={styles.identItem}>
                  <Text style={styles.identLabel}>Telefone</Text>
                  <Text style={styles.identValue}>{data.telefone}</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionEyebrow}>2. SCORE DE CRÉDITO</Text>
          <Text style={styles.sectionTitle}>
            Sua pontuação: <Text style={{ color: corScore }}>{sc}</Text>
          </Text>
          <Text style={styles.sectionSub}>
            O score varia de 0 a 1000 e indica a probabilidade de você pagar suas contas em dia.
          </Text>

          <View
            style={{
              backgroundColor: C.gray50,
              borderRadius: 8,
              padding: 22,
              marginBottom: 16,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-end",
                justifyContent: "space-between",
              }}
            >
              <View>
                <Text style={[styles.identLabel, { color: C.gray500 }]}>SEU SCORE</Text>
                <Text
                  style={{
                    fontSize: 56,
                    fontWeight: 700,
                    color: corScore,
                    lineHeight: 1,
                    marginTop: 4,
                  }}
                >
                  {sc}
                </Text>
                <Text style={{ fontSize: 10, color: C.gray500, marginTop: 4 }}>
                  de 1000 pontos
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: corScore + "22",
                  paddingVertical: 8,
                  paddingHorizontal: 16,
                  borderRadius: 6,
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: corScore,
                    letterSpacing: 1,
                  }}
                >
                  {faixa}
                </Text>
              </View>
            </View>

            <ScoreBar score={sc} color={corScore} />

            <View style={{ flexDirection: "row", marginTop: 18, gap: 14 }}>
              {[
                { c: C.red500, t: "0–299", l: "Muito baixo" },
                { c: C.amber500, t: "300–499", l: "Baixo" },
                { c: C.amber500, t: "500–699", l: "Regular" },
                { c: C.emerald500, t: "700–1000", l: "Bom" },
              ].map((f, i) => (
                <View key={i} style={{ flexDirection: "row", alignItems: "center" }}>
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: f.c,
                      marginRight: 5,
                    }}
                  />
                  <Text style={{ fontSize: 8, color: C.gray700 }}>
                    <Text style={{ fontWeight: 700 }}>{f.t}</Text> {f.l}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionEyebrow}>3. RESUMO DE PENDÊNCIAS</Text>
          <Text style={styles.sectionTitle}>Situação atual do CPF</Text>
          <Text style={styles.sectionSub}>
            Visão consolidada das ocorrências registradas em seu nome.
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Pendências</Text>
              <Text
                style={[
                  styles.statValue,
                  { color: data.tem_pendencia ? C.red500 : C.emerald500 },
                ]}
              >
                {data.qtd_pendencias}
              </Text>
              <Text style={styles.statSub}>
                {data.qtd_pendencias === 1 ? "registro encontrado" : "registros encontrados"}
              </Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Total em dívidas</Text>
              <Text
                style={[
                  styles.statValue,
                  { color: data.tem_pendencia ? C.red500 : C.gray800 },
                ]}
              >
                R$ {formatBRL(data.total_dividas)}
              </Text>
              <Text style={styles.statSub}>somatório dos credores</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Status</Text>
              <Text
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: data.tem_pendencia ? C.red100 : C.emerald100,
                    color: data.tem_pendencia ? C.red500 : C.emerald500,
                    marginTop: 6,
                    fontSize: 10,
                  },
                ]}
              >
                {data.tem_pendencia ? "● NEGATIVADO" : "● NOME LIMPO"}
              </Text>
              <Text style={styles.statSub}>
                {data.tem_pendencia ? "Ação recomendada" : "Tudo certo"}
              </Text>
            </View>
          </View>

          <View style={styles.watermarkBox}>
            <Text style={styles.watermarkSelo}>LNB</Text>
            <View style={styles.watermarkBody}>
              <Text style={styles.watermarkTitulo}>Documento autenticado pela Limpa Nome Brazil</Text>
              <Text style={styles.watermarkText}>
                Protocolo {protocolo} · Verifique a autenticidade em
                limpanomebrazil.com.br/conta/dashboard usando seu CPF e senha.
              </Text>
            </View>
          </View>
        </View>

        {/* Footer fixo */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerLeft}>
            <Text style={styles.footerBold}>Limpa Nome Brazil</Text> · CNPJ confidencial · LGPD compatível
          </Text>
          <Text
            style={styles.footerRight}
            render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
          />
        </View>
      </Page>

      {/* ═══════════ PÁGINA 3 — DETALHE PENDÊNCIAS (se houver) ═══════════ */}
      {data.tem_pendencia && data.pendencias && data.pendencias.length > 0 && (
        <Page size="A4" style={styles.page}>
          <View style={styles.pageHeader}>
            <Image src={LOGO_URL} style={styles.pageHeaderLogo} />
            <View style={styles.pageHeaderRight}>
              <Text style={styles.pageHeaderBadge}>DETALHAMENTO · {dataStr}</Text>
            </View>
          </View>

          <View style={styles.conteudo}>
            <Text style={styles.sectionEyebrow}>4. CREDORES E VALORES</Text>
            <Text style={styles.sectionTitle}>Detalhamento das pendências</Text>
            <Text style={styles.sectionSub}>
              Lista completa de cada registro de débito identificado. Os valores estão
              consolidados ao momento da consulta.
            </Text>

            {data.pendencias.map((p, i) => (
              <View key={i} style={styles.pendCard}>
                <Text style={styles.pendNum}>#{String(i + 1).padStart(2, "0")}</Text>
                <View style={styles.pendBody}>
                  <Text style={styles.pendCredor}>{p.credor}</Text>
                  <Text style={styles.pendData}>
                    {p.data ? `Registrado em ${p.data}` : "Data de registro não disponível"}
                  </Text>
                </View>
                <Text style={styles.pendValor}>R$ {formatBRL(p.valor)}</Text>
              </View>
            ))}

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 12,
                paddingTop: 14,
                borderTopWidth: 2,
                borderTopColor: C.forest800,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: 700, color: C.forest800 }}>
                TOTAL EM PENDÊNCIAS
              </Text>
              <Text style={{ fontSize: 18, fontWeight: 700, color: C.red500 }}>
                R$ {formatBRL(data.total_dividas)}
              </Text>
            </View>

            <Text
              style={{
                fontSize: 9,
                color: C.gray500,
                lineHeight: 1.6,
                marginTop: 14,
                fontStyle: "italic",
              }}
            >
              ⚠ Valores podem sofrer atualização por juros, multas e correções diárias.
              Esta consulta foi realizada em {dataStr} às {horaStr}.
            </Text>
          </View>

          <View style={styles.footer} fixed>
            <Text style={styles.footerLeft}>
              <Text style={styles.footerBold}>Limpa Nome Brazil</Text> · CNPJ confidencial · LGPD compatível
            </Text>
            <Text
              style={styles.footerRight}
              render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
            />
          </View>
        </Page>
      )}

      {/* ═══════════ PÁGINA 4 — SOLUÇÃO LNB ═══════════ */}
      <Page size="A4" style={styles.page}>
        <View style={styles.pageHeader}>
          <Image src={LOGO_URL} style={styles.pageHeaderLogo} />
          <View style={styles.pageHeaderRight}>
            <Text style={styles.pageHeaderBadge}>RECOMENDAÇÃO · {dataStr}</Text>
          </View>
        </View>

        <View style={styles.conteudo}>
          {data.tem_pendencia ? (
            <>
              <Text style={styles.sectionEyebrow}>
                {data.pendencias && data.pendencias.length > 0 ? "5. PRÓXIMOS PASSOS" : "4. PRÓXIMOS PASSOS"}
              </Text>
              <Text style={styles.sectionTitle}>Como limpar seu nome em até 20 dias</Text>
              <Text style={styles.sectionSub}>
                Veja o passo a passo do processo da Limpa Nome Brazil. Sem
                negociar com credor, sem quitar dívida.
              </Text>

              {[
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
                  d: "Você recebe atualizações por WhatsApp e email a cada etapa concluída. Pode acompanhar tudo no painel online.",
                },
                {
                  t: "Nome limpo em até 20 dias úteis",
                  d: "Ao final do processo, seu CPF volta a estar limpo nos 3 principais bureaus de crédito.",
                },
                {
                  t: "Blindagem de CPF inclusa por 12 meses",
                  d: "Monitoramos seu CPF diariamente e alertamos imediatamente se aparecer qualquer nova pendência.",
                },
              ].map((p, i) => (
                <View key={i} style={styles.passo}>
                  <Text style={styles.passoNum}>{i + 1}</Text>
                  <View style={styles.passoBody}>
                    <Text style={styles.passoTitulo}>{p.t}</Text>
                    <Text style={styles.passoDesc}>{p.d}</Text>
                  </View>
                </View>
              ))}

              <View style={styles.solucao}>
                <Text style={styles.solucaoEyebrow}>SOLUÇÃO RECOMENDADA</Text>
                <Text style={styles.solucaoTitulo}>
                  Limpe seu nome agora{"\n"}com a Limpa Nome Brazil
                </Text>
                <Text style={styles.solucaoTexto}>
                  Mais de 10 mil pessoas já voltaram a ter crédito conosco.
                  Você não precisa quitar a dívida, não precisa negociar.
                  A gente cuida de tudo.
                </Text>

                <View style={styles.solucaoLista}>
                  {[
                    "Limpeza completa em até 20 dias úteis",
                    "Sem você precisar quitar a dívida",
                    "Blindagem de CPF inclusa (12 meses)",
                    "Painel online pra acompanhar",
                    "Consultor dedicado",
                  ].map((s, i) => (
                    <View key={i} style={styles.solucaoItem}>
                      <View style={styles.solucaoCheck}>
                        <Text style={styles.solucaoCheckText}>✓</Text>
                      </View>
                      <Text style={styles.solucaoItemText}>{s}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.solucaoPreco}>
                  <Text style={styles.solucaoPrecoLabel}>INVESTIMENTO</Text>
                  <Text style={styles.solucaoPrecoValor}>R$ 480,01</Text>
                </View>
                <Text style={{ fontSize: 9, color: C.brand400, marginTop: 4 }}>
                  À vista · com 12 meses de Blindagem inclusa · desconto da consulta já aplicado
                </Text>

                <Text style={styles.solucaoCta}>
                  ACESSE LIMPANOMEBRAZIL.COM.BR
                </Text>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.sectionEyebrow}>RESULTADO POSITIVO</Text>
              <Text style={styles.sectionTitle}>Tudo certo com seu CPF</Text>
              <Text style={styles.sectionSub}>
                Não foram encontradas pendências em seu nome nos órgãos consultados.
              </Text>

              <View style={styles.boxNomeLimpo}>
                <Text style={styles.boxNomeLimpoEyebrow}>NOME LIMPO</Text>
                <Text style={styles.boxNomeLimpoTitulo}>Parabéns!</Text>
                <Text style={styles.boxNomeLimpoTexto}>
                  Seu CPF está limpo e sem pendências registradas em
                  Serasa, SPC e Boa Vista. Continue mantendo as contas em dia
                  para preservar e elevar seu score de crédito.
                </Text>
              </View>

              <View style={{ marginTop: 24 }}>
                <Text style={styles.sectionEyebrow}>RECOMENDAÇÃO</Text>
                <Text style={[styles.sectionTitle, { fontSize: 18 }]}>
                  Mantenha seu nome blindado
                </Text>
                <Text style={styles.sectionSub}>
                  Mesmo com nome limpo, novas pendências podem aparecer sem que
                  você perceba — fraudes, cadastros indevidos, contas em
                  atraso.
                </Text>

                {[
                  "Monitoramento diário do seu CPF",
                  "Alerta imediato no WhatsApp e email",
                  "Análise mensal de score",
                  "Cancele quando quiser",
                ].map((b, i) => (
                  <View key={i} style={styles.passo}>
                    <Text style={[styles.passoNum, { backgroundColor: C.emerald500 }]}>
                      ✓
                    </Text>
                    <View style={styles.passoBody}>
                      <Text style={styles.passoTitulo}>{b}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerLeft}>
            <Text style={styles.footerBold}>Limpa Nome Brazil</Text> · CNPJ confidencial · LGPD compatível
          </Text>
          <Text
            style={styles.footerRight}
            render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
