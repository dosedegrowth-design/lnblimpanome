/**
 * Definições de etapas + helpers UI dos processos LNB.
 */

export type TipoServico = "limpeza" | "blindagem" | "consulta";

export interface EtapaConfig {
  id: string;
  label: string;
  cor: "brand" | "amber" | "emerald" | "violet" | "red" | "gray" | "forest";
  emoji: string;
  descricao: string;
}

export const ETAPAS_LIMPEZA: EtapaConfig[] = [
  { id: "iniciado",     label: "Iniciado",      cor: "brand",   emoji: "🟦", descricao: "Pagamento confirmado, processo aberto" },
  { id: "documentacao", label: "Documentação",  cor: "amber",   emoji: "📄", descricao: "Coletando documentos necessários" },
  { id: "analise",      label: "Em análise",    cor: "violet",  emoji: "🔍", descricao: "Equipe técnica analisando o caso" },
  { id: "execucao",     label: "Em execução",   cor: "forest",  emoji: "⚡", descricao: "Limpeza junto aos órgãos" },
  { id: "finalizado",   label: "Finalizado",    cor: "emerald", emoji: "✅", descricao: "Nome limpo, comprovantes disponíveis" },
];

export const ETAPAS_BLINDAGEM: EtapaConfig[] = [
  { id: "ativada",     label: "Ativada",      cor: "brand",   emoji: "🛡️", descricao: "Blindagem recém ativada" },
  { id: "monitorando", label: "Monitorando",  cor: "emerald", emoji: "👁️", descricao: "Verificações automáticas ativas" },
  { id: "alerta",      label: "Alerta",       cor: "red",     emoji: "⚠️", descricao: "Pendência detectada" },
  { id: "encerrada",   label: "Encerrada",    cor: "gray",    emoji: "🔚", descricao: "Cliente cancelou" },
];

export const ETAPAS_CONSULTA: EtapaConfig[] = [
  { id: "pago",      label: "Pago",        cor: "brand",   emoji: "💳", descricao: "Pagamento confirmado" },
  { id: "executada", label: "Executada",   cor: "amber",   emoji: "🔍", descricao: "Consulta realizada na API" },
  { id: "entregue",  label: "Entregue",    cor: "emerald", emoji: "📨", descricao: "Relatório enviado pro cliente" },
];

export function getEtapas(tipo: TipoServico): EtapaConfig[] {
  switch (tipo) {
    case "limpeza":   return ETAPAS_LIMPEZA;
    case "blindagem": return ETAPAS_BLINDAGEM;
    case "consulta":  return ETAPAS_CONSULTA;
  }
}

export function getEtapa(tipo: TipoServico, etapaId: string): EtapaConfig | null {
  return getEtapas(tipo).find((e) => e.id === etapaId) || null;
}

export function getProximaEtapa(tipo: TipoServico, etapaAtual: string): EtapaConfig | null {
  const etapas = getEtapas(tipo);
  const idx = etapas.findIndex((e) => e.id === etapaAtual);
  if (idx === -1 || idx === etapas.length - 1) return null;
  return etapas[idx + 1];
}

export const TIPOS_LABEL: Record<TipoServico, string> = {
  limpeza:   "Limpeza de Nome",
  blindagem: "Blindagem de CPF",
  consulta:  "Consulta CPF",
};

// Tipos do banco
export interface ProcessoRow {
  id: string;
  cpf: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  tipo: TipoServico;
  etapa: string;
  responsavel_id: string | null;
  responsavel_nome?: string | null;
  prazo_dias: number | null;
  observacoes: string | null;
  finalizado_em: string | null;
  created_at: string;
  updated_at: string;
  dias_na_etapa?: number;
}

export interface EventoRow {
  id: string;
  processo_id: string;
  tipo: "etapa" | "mensagem" | "arquivo" | "sistema";
  etapa_anterior: string | null;
  etapa_nova: string | null;
  mensagem: string | null;
  visivel_cliente: boolean;
  notificou_email: boolean;
  notificou_wa: boolean;
  autor_id: string | null;
  autor_nome: string | null;
  created_at: string;
}

export interface ArquivoRow {
  id: string;
  processo_id: string;
  evento_id: string | null;
  tipo: "comprovante" | "relatorio" | "outro";
  nome_arquivo: string;
  caminho_storage: string;
  tamanho_bytes: number | null;
  mime_type: string | null;
  visivel_cliente: boolean;
  upload_por: string | null;
  created_at: string;
}
