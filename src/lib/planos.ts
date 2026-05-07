/**
 * Catálogo central de planos LNB.
 * Espelha PRECOS de /api/site/checkout pra evitar drift.
 */
import type { LucideIcon } from "lucide-react";
import { FileSearch, ShieldCheck, Sparkles } from "lucide-react";

export type PlanoTipo = "consulta" | "blindagem" | "limpeza_desconto";

export interface Plano {
  tipo: PlanoTipo;
  nome: string;
  preco: number;
  precoLabel: string;
  recorrencia?: string;
  badge?: string;
  destaque?: boolean;
  resumo: string;
  beneficios: string[];
  ctaLabel: string;
  icon: LucideIcon;
  rota: string;
}

export const PLANOS: Record<PlanoTipo, Plano> = {
  consulta: {
    tipo: "consulta",
    nome: "Consulta CPF",
    preco: 19.99,
    precoLabel: "R$ 19,99",
    badge: "Primeiro passo",
    resumo: "Pix · cartão · resultado na hora",
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
  blindagem: {
    tipo: "blindagem",
    nome: "Blindagem mensal",
    preco: 29.90,
    precoLabel: "R$ 29,90",
    recorrencia: "/mês",
    badge: "Monitoramento contínuo",
    resumo: "Pra quem já tem o nome limpo e quer manter assim",
    beneficios: [
      "Monitoramento diário do seu CPF",
      "Alerta imediato no WhatsApp",
      "Análise mensal de crédito",
      "Relatório por email",
      "Cancele quando quiser",
    ],
    ctaLabel: "Ativar blindagem",
    icon: ShieldCheck,
    rota: "/contratar?plano=blindagem",
  },
  limpeza_desconto: {
    tipo: "limpeza_desconto",
    nome: "Limpeza + Blindagem",
    preco: 480.01,
    precoLabel: "R$ 480,01",
    badge: "Mais escolhido",
    destaque: true,
    resumo: "com desconto · já abate os R$ 19,99 da consulta",
    beneficios: [
      "Limpeza completa em até 20 dias úteis",
      "Você não precisa quitar a dívida",
      "Blindagem de CPF inclusa por 12 meses",
      "Painel online pra acompanhar o processo",
      "Consultor dedicado",
      "Atualizações por WhatsApp e email",
    ],
    ctaLabel: "Quero limpar meu nome",
    icon: Sparkles,
    rota: "/contratar?plano=limpeza_desconto",
  },
};

export function getPlano(tipo: PlanoTipo): Plano {
  return PLANOS[tipo];
}

export function isPlanoTipo(value: string): value is PlanoTipo {
  return value === "consulta" || value === "blindagem" || value === "limpeza_desconto";
}
