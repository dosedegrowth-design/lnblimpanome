/**
 * Catálogo central de planos LNB.
 * Espelha PRECOS de /api/site/checkout pra evitar drift.
 *
 * REGRA DE NEGÓCIO:
 * - "consulta" é o gateway obrigatório (R$ 19,99) — descobre se tem o que limpar
 * - "limpeza_desconto" só pode ser comprada APÓS consulta paga COM pendência
 * - Blindagem é INCLUSA por 12 meses no pacote de limpeza (não é vendida solta)
 */
import type { LucideIcon } from "lucide-react";
import { FileSearch, Sparkles } from "lucide-react";

export type PlanoTipo = "consulta" | "limpeza_desconto";

export interface Plano {
  tipo: PlanoTipo;
  nome: string;
  preco: number;
  precoLabel: string;
  badge?: string;
  destaque?: boolean;
  resumo: string;
  beneficios: string[];
  ctaLabel: string;
  icon: LucideIcon;
  rota: string;
  /** Exige consulta paga prévia com pendência? */
  requerConsulta?: boolean;
}

export const PLANOS: Record<PlanoTipo, Plano> = {
  consulta: {
    tipo: "consulta",
    nome: "Consulta CPF",
    preco: 19.99,
    precoLabel: "R$ 19,99",
    badge: "Primeiro passo obrigatório",
    resumo: "Descubra se você tem nome sujo, score, dívidas e credores",
    beneficios: [
      "Score de crédito atualizado",
      "Lista completa de pendências e credores",
      "Valor total de débitos",
      "Relatório PDF + WhatsApp + email",
      "Resultado em minutos",
    ],
    ctaLabel: "Consultar agora",
    icon: FileSearch,
    rota: "/consultar",
  },
  limpeza_desconto: {
    tipo: "limpeza_desconto",
    nome: "Limpeza + Blindagem 12 meses",
    preco: 480.01,
    precoLabel: "R$ 480,01",
    badge: "Solução completa",
    destaque: true,
    resumo: "Limpa seu nome em até 20 dias úteis · sem quitar dívida",
    beneficios: [
      "Limpeza completa em até 20 dias úteis",
      "Você não precisa quitar a dívida",
      "Blindagem de CPF 12 meses inclusa",
      "Painel online pra acompanhar o processo",
      "Consultor dedicado",
      "Atualizações por WhatsApp e email",
    ],
    ctaLabel: "Limpar meu nome",
    icon: Sparkles,
    rota: "/contratar?plano=limpeza_desconto",
    requerConsulta: true,
  },
};

export function getPlano(tipo: PlanoTipo): Plano {
  return PLANOS[tipo];
}

export function isPlanoTipo(value: string): value is PlanoTipo {
  return value === "consulta" || value === "limpeza_desconto";
}
