/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Document, Page, Text, View, StyleSheet, Image,
} from "@react-pdf/renderer";

/**
 * Relatório PDF da Consulta de CPF — branding LNB.
 * Gera PDF server-side via @react-pdf/renderer (sem Chrome/Puppeteer).
 */

// Paleta LNB (Brand Guide)
const C = {
  forest: "#13312E",
  teal: "#1F5D5D",
  brand: "#0298D9",
  brand400: "#33ABDF",
  sand: "#DBD2C6",
  sandLight: "#F5F0E7",
  black: "#000000",
  red: "#DC2626",
  amber: "#D97706",
  emerald: "#059669",
  gray100: "#F3F4F6",
  gray500: "#6B7280",
  gray700: "#374151",
  gray800: "#1F2937",
  white: "#FFFFFF",
};

const styles = StyleSheet.create({
  page: {
    backgroundColor: C.white,
    padding: 0,
    fontSize: 10,
    color: C.gray800,
    fontFamily: "Helvetica",
  },
  // Header
  header: {
    backgroundColor: C.forest,
    color: C.white,
    paddingVertical: 24,
    paddingHorizontal: 36,
  },
  brandRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  brandText: { fontSize: 22, fontWeight: 700, letterSpacing: 1 },
  brandLnb: { color: C.brand },
  badge: {
    backgroundColor: C.brand,
    color: C.white,
    fontSize: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    fontWeight: 700,
    letterSpacing: 0.5,
  },
  headerSubtitle: { fontSize: 11, marginTop: 6, color: C.sand },

  // Content padding
  content: {
    paddingHorizontal: 36,
    paddingVertical: 24,
  },

  // Identificação
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: C.gray700,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  card: {
    backgroundColor: C.sandLight,
    borderRadius: 8,
    padding: 14,
    marginBottom: 14,
    borderLeftWidth: 3,
    borderLeftColor: C.brand,
  },
  identGrid: { flexDirection: "row", flexWrap: "wrap", gap: 0 },
  identItem: { width: "50%", marginBottom: 6 },
  identLabel: { fontSize: 8, color: C.gray500, textTransform: "uppercase", letterSpacing: 0.5 },
  identValue: { fontSize: 11, color: C.forest, fontWeight: 700, marginTop: 1 },

  // Score box
  scoreBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 18,
    borderRadius: 10,
    marginBottom: 16,
  },
  scoreLeft: { flex: 1 },
  scoreLabel: { fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 },
  scoreNumber: { fontSize: 56, fontWeight: 700, marginTop: 2, lineHeight: 1 },
  scoreFaixa: { fontSize: 10, fontWeight: 700, marginTop: 4 },
  scoreRight: { width: 110, alignItems: "flex-end" },

  // Stats row
  statsRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  stat: {
    flex: 1,
    backgroundColor: C.gray100,
    padding: 12,
    borderRadius: 8,
  },
  statLabel: { fontSize: 8, color: C.gray500, textTransform: "uppercase", letterSpacing: 0.5 },
  statValue: { fontSize: 18, color: C.forest, fontWeight: 700, marginTop: 2 },

  // Pendências
  pendItem: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.gray100,
  },
  pendItemAlt: { backgroundColor: C.sandLight },
  pendCredor: { flex: 2, fontSize: 10, color: C.gray800 },
  pendValor: { flex: 1, fontSize: 10, color: C.gray800, textAlign: "right", fontWeight: 700 },
  pendData: { flex: 1, fontSize: 9, color: C.gray500, textAlign: "right" },
  pendHeader: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: C.forest,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  pendHeaderText: { fontSize: 9, color: C.white, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 },

  // Solução
  solucao: {
    backgroundColor: C.forest,
    padding: 18,
    borderRadius: 10,
    marginTop: 16,
    color: C.white,
  },
  solucaoTitle: { color: C.brand, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 },
  solucaoH: { color: C.white, fontSize: 16, fontWeight: 700, marginTop: 4 },
  solucaoText: { color: C.sand, fontSize: 10, marginTop: 6, lineHeight: 1.5 },
  solucaoCta: {
    backgroundColor: C.brand,
    color: C.white,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
    fontSize: 10,
    fontWeight: 700,
    marginTop: 10,
    alignSelf: "flex-start",
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 18,
    left: 36,
    right: 36,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: C.gray100,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: { fontSize: 8, color: C.gray500 },
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
  if (score >= 700) return C.emerald;
  if (score >= 500) return C.amber;
  return C.red;
}

function scoreFaixa(score: number): string {
  if (score >= 700) return "BOM";
  if (score >= 500) return "REGULAR";
  if (score >= 300) return "BAIXO";
  return "MUITO BAIXO";
}

export function RelatorioConsultaPDF({ data }: { data: RelatorioInput }) {
  const dataStr =
    data.data_consulta ||
    new Date().toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

  const sc = data.score ?? 0;
  const corScore = scoreColor(sc);
  const faixa = scoreFaixa(sc);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <Text style={styles.brandText}>
              <Text style={styles.brandLnb}>LNB</Text>
              {" "}
              <Text>· LIMPA NOME BRAZIL</Text>
            </Text>
            <Text style={styles.badge}>RELATÓRIO DE CONSULTA</Text>
          </View>
          <Text style={styles.headerSubtitle}>
            Consulta realizada em {dataStr} · 100% digital · LGPD compatível
          </Text>
        </View>

        <View style={styles.content}>
          {/* IDENTIFICAÇÃO */}
          <Text style={styles.sectionTitle}>Identificação</Text>
          <View style={styles.card}>
            <View style={styles.identGrid}>
              <View style={styles.identItem}>
                <Text style={styles.identLabel}>CPF</Text>
                <Text style={styles.identValue}>{formatCPF(data.cpf)}</Text>
              </View>
              {data.nome && (
                <View style={styles.identItem}>
                  <Text style={styles.identLabel}>Nome</Text>
                  <Text style={styles.identValue}>{data.nome}</Text>
                </View>
              )}
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

          {/* SCORE */}
          {data.score != null && (
            <>
              <Text style={styles.sectionTitle}>Score de crédito</Text>
              <View style={[styles.scoreBox, { backgroundColor: corScore + "15" }]}>
                <View style={styles.scoreLeft}>
                  <Text style={[styles.scoreLabel, { color: corScore }]}>SEU SCORE</Text>
                  <Text style={[styles.scoreNumber, { color: corScore }]}>{data.score}</Text>
                  <Text style={[styles.scoreFaixa, { color: corScore }]}>{faixa}</Text>
                </View>
                <View style={styles.scoreRight}>
                  <Text style={{ fontSize: 8, color: C.gray500, textAlign: "right" }}>
                    Faixas:{"\n"}
                    0–299 Muito baixo{"\n"}
                    300–499 Baixo{"\n"}
                    500–699 Regular{"\n"}
                    700–1000 Bom
                  </Text>
                </View>
              </View>
            </>
          )}

          {/* RESUMO PENDÊNCIAS */}
          <Text style={styles.sectionTitle}>Resumo de pendências</Text>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Pendências</Text>
              <Text style={styles.statValue}>{data.qtd_pendencias}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Total em dívidas</Text>
              <Text style={styles.statValue}>R$ {formatBRL(data.total_dividas)}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Status</Text>
              <Text
                style={[
                  styles.statValue,
                  { color: data.tem_pendencia ? C.red : C.emerald, fontSize: 14 },
                ]}
              >
                {data.tem_pendencia ? "NEGATIVADO" : "NOME LIMPO"}
              </Text>
            </View>
          </View>

          {/* LISTA PENDÊNCIAS */}
          {data.tem_pendencia && data.pendencias && data.pendencias.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Detalhamento</Text>
              <View style={styles.pendHeader}>
                <Text style={[styles.pendHeaderText, { flex: 2 }]}>Credor</Text>
                <Text style={[styles.pendHeaderText, { flex: 1, textAlign: "right" }]}>Valor</Text>
                <Text style={[styles.pendHeaderText, { flex: 1, textAlign: "right" }]}>Data</Text>
              </View>
              {data.pendencias.map((p, i) => (
                <View
                  key={i}
                  style={[styles.pendItem, i % 2 === 0 ? styles.pendItemAlt : {}]}
                >
                  <Text style={styles.pendCredor}>{p.credor}</Text>
                  <Text style={styles.pendValor}>R$ {formatBRL(p.valor)}</Text>
                  <Text style={styles.pendData}>{p.data || "—"}</Text>
                </View>
              ))}
            </>
          )}

          {/* SOLUÇÃO LNB */}
          {data.tem_pendencia ? (
            <View style={styles.solucao}>
              <Text style={styles.solucaoTitle}>SOLUÇÃO LNB</Text>
              <Text style={styles.solucaoH}>
                Limpamos seu nome em até 20 dias úteis
              </Text>
              <Text style={styles.solucaoText}>
                Sem você precisar quitar a dívida, sem negociar com cada credor.
                Nossa equipe cuida de tudo. Com Blindagem de CPF inclusa por 12 meses.
              </Text>
              <Text style={styles.solucaoCta}>
                R$ 480,01 · ACESSE limpanomebrazil.com.br
              </Text>
            </View>
          ) : (
            <View style={[styles.solucao, { backgroundColor: C.emerald }]}>
              <Text style={styles.solucaoTitle}>NOME LIMPO</Text>
              <Text style={styles.solucaoH}>Parabéns! Seu CPF está limpo</Text>
              <Text style={styles.solucaoText}>
                Não encontramos pendências no seu CPF. Continue mantendo as contas
                em dia pra preservar seu score.
              </Text>
            </View>
          )}
        </View>

        {/* FOOTER */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            Limpa Nome Brazil · contato@limpanomebrazil.com.br · WhatsApp (11) 99744-0101
          </Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
