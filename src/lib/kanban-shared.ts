/**
 * Tipos e funcoes puras de KANBAN — podem ser usadas em client OU server.
 *
 * NAO importa nada de server-only (sem next/headers, sem Supabase).
 * Pra leitura do banco veja src/lib/kanban.ts (server-only).
 */

export type EtapaCor = "brand" | "amber" | "emerald" | "violet" | "red" | "gray" | "forest";

export interface Etapa {
  codigo: string;
  nome: string;
  emoji: string;
  cor: EtapaCor;
  descricao: string | null;
  ordem: number;
  ativo: boolean;
}

export interface Tag {
  codigo: string;
  nome: string;
  cor: EtapaCor;
  emoji: string;
  produto_codigo: string | null;
  ordem: number;
  ativo: boolean;
  processos_count: number;
}

export const FALLBACK_ETAPAS: Etapa[] = [
  { codigo: "iniciado",     nome: "Iniciado",      emoji: "🟦", cor: "brand",   descricao: "Pagamento confirmado",              ordem: 10,  ativo: true },
  { codigo: "pago",         nome: "Pago",          emoji: "💳", cor: "brand",   descricao: "Pagamento confirmado",              ordem: 20,  ativo: true },
  { codigo: "documentacao", nome: "Documentacao",  emoji: "📄", cor: "amber",   descricao: "Coletando documentos",              ordem: 30,  ativo: true },
  { codigo: "analise",      nome: "Em analise",    emoji: "🔍", cor: "violet",  descricao: "Equipe analisando o caso",          ordem: 40,  ativo: true },
  { codigo: "execucao",     nome: "Em execucao",   emoji: "⚡", cor: "forest",  descricao: "Executando junto aos orgaos",       ordem: 50,  ativo: true },
  { codigo: "executada",    nome: "Executada",     emoji: "🔍", cor: "amber",   descricao: "Consulta realizada",                ordem: 60,  ativo: true },
  { codigo: "entregue",     nome: "Entregue",      emoji: "📨", cor: "emerald", descricao: "Relatorio enviado pro cliente",     ordem: 70,  ativo: true },
  { codigo: "finalizado",   nome: "Finalizado",    emoji: "✅", cor: "emerald", descricao: "Processo concluido",                ordem: 80,  ativo: true },
  { codigo: "ativada",      nome: "Ativada",       emoji: "🛡️", cor: "brand",   descricao: "Blindagem ativada",                 ordem: 90,  ativo: true },
  { codigo: "monitorando",  nome: "Monitorando",   emoji: "👁️", cor: "emerald", descricao: "Verificacoes automaticas ativas",  ordem: 100, ativo: true },
  { codigo: "alerta",       nome: "Alerta",        emoji: "⚠️", cor: "red",     descricao: "Pendencia detectada",              ordem: 110, ativo: true },
  { codigo: "encerrada",    nome: "Encerrada",     emoji: "🔚", cor: "gray",    descricao: "Cliente cancelou",                 ordem: 120, ativo: true },
];

export const FALLBACK_TAGS: Tag[] = [
  { codigo: "consulta_cpf",  nome: "Consulta CPF",   cor: "brand",   emoji: "🔍",  produto_codigo: "consulta_cpf",  ordem: 10, ativo: true, processos_count: 0 },
  { codigo: "consulta_cnpj", nome: "Consulta CNPJ",  cor: "violet",  emoji: "🏢",  produto_codigo: "consulta_cnpj", ordem: 20, ativo: true, processos_count: 0 },
  { codigo: "limpeza_cpf",   nome: "Limpeza CPF",    cor: "emerald", emoji: "✨",  produto_codigo: "limpeza_cpf",   ordem: 30, ativo: true, processos_count: 0 },
  { codigo: "limpeza_cnpj",  nome: "Limpeza CNPJ",   cor: "forest",  emoji: "🏛️", produto_codigo: "limpeza_cnpj",  ordem: 40, ativo: true, processos_count: 0 },
  { codigo: "blindagem",     nome: "Blindagem",      cor: "amber",   emoji: "🛡️", produto_codigo: "blindagem",     ordem: 50, ativo: true, processos_count: 0 },
];

export function findEtapa(lista: Etapa[], codigo: string | null | undefined): Etapa | null {
  if (!codigo) return null;
  return lista.find((e) => e.codigo === codigo) || null;
}

export function findTag(lista: Tag[], codigo: string | null | undefined): Tag | null {
  if (!codigo) return null;
  return lista.find((t) => t.codigo === codigo) || null;
}

export function getProximaEtapa(lista: Etapa[], etapaCodigoAtual: string): Etapa | null {
  const idx = lista.findIndex((e) => e.codigo === etapaCodigoAtual);
  if (idx === -1 || idx === lista.length - 1) return null;
  return lista[idx + 1];
}

export function getEtapasParaTag(lista: Etapa[], tagCodigo: string | null | undefined): Etapa[] {
  if (!tagCodigo) return lista;
  const mapa: Record<string, string[]> = {
    blindagem:     ["ativada", "monitorando", "alerta", "encerrada"],
    consulta_cpf:  ["pago", "executada", "entregue", "finalizado", "encerrada"],
    consulta_cnpj: ["pago", "executada", "entregue", "finalizado", "encerrada"],
    limpeza_cpf:   ["iniciado", "documentacao", "analise", "execucao", "finalizado", "encerrada"],
    limpeza_cnpj:  ["iniciado", "documentacao", "analise", "execucao", "finalizado", "encerrada"],
  };
  const codigos = mapa[tagCodigo];
  if (!codigos) return lista;
  return lista.filter((e) => codigos.includes(e.codigo));
}

export const COR_CLASSES: Record<EtapaCor, { bg: string; text: string; border: string }> = {
  brand:   { bg: "bg-brand-50",   text: "text-brand-700",   border: "border-brand-200" },
  amber:   { bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200" },
  emerald: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  violet:  { bg: "bg-violet-50",  text: "text-violet-700",  border: "border-violet-200" },
  red:     { bg: "bg-red-50",     text: "text-red-700",     border: "border-red-200" },
  gray:    { bg: "bg-gray-100",   text: "text-gray-700",    border: "border-gray-300" },
  forest:  { bg: "bg-forest-50",  text: "text-forest-700",  border: "border-forest-200" },
};

export function corClasses(cor: EtapaCor): { bg: string; text: string; border: string } {
  return COR_CLASSES[cor] || COR_CLASSES.gray;
}
