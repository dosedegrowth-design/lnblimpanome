/**
 * Catálogo central de planos LNB.
 * Espelha PRECOS de /api/site/checkout pra evitar drift.
 *
 * REGRA DE NEGÓCIO:
 * - "consulta" / "consulta_cnpj" são gateways obrigatórios — descobrem se tem o que limpar
 * - "limpeza_desconto" / "limpeza_cnpj" só podem ser comprados APÓS consulta paga COM pendência
 * - Monitoramento 12 meses BÔNUS incluído na limpeza (sem cobrar separado)
 * - Blindagem mensal/anual REMOVIDA do catálogo
 */
import type { LucideIcon } from "lucide-react";
import { FileSearch, Sparkles, Building2, Briefcase } from "lucide-react";

export type PlanoTipo =
  | "consulta"            // CPF R$ 29,99 (Serasa Premium + Boa Vista)
  | "consulta_cnpj"       // CNPJ R$ 39,99 (Receita + Serasa + Boa Vista do sócio)
  | "limpeza_desconto"    // CPF R$ 500,00
  | "limpeza_cnpj";       // CNPJ R$ 580,01

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
  /** Tipo de documento que o plano trata */
  tipoDocumento: "CPF" | "CNPJ";
}

export const PLANOS: Record<PlanoTipo, Plano> = {
  consulta: {
    tipo: "consulta",
    nome: "Consulta CPF Multi-Bureau",
    preco: 29.99,
    precoLabel: "R$ 29,99",
    badge: "Serasa + Boa Vista · Pessoa física",
    resumo: "Score Serasa + Boa Vista, pendências, protestos e cheques em um só relatório",
    beneficios: [
      "Score Serasa Experian (o do app oficial)",
      "Score Boa Vista SCPC",
      "Pendências financeiras detalhadas",
      "Protestos em cartório",
      "Cheques sem fundo (BACEN)",
      "Relatório executivo em PDF",
    ],
    ctaLabel: "Consultar CPF",
    icon: FileSearch,
    rota: "/consultar/cpf",
    tipoDocumento: "CPF",
  },
  consulta_cnpj: {
    tipo: "consulta_cnpj",
    nome: "Consulta CNPJ Completa",
    preco: 39.99,
    precoLabel: "R$ 39,99",
    badge: "Empresa + Sócio · Multi-Bureau",
    resumo: "Dados da empresa na Receita + Score Serasa e Boa Vista do sócio responsável",
    beneficios: [
      "Dados cadastrais Receita Federal",
      "Quadro societário + capital social",
      "Score Serasa Experian do sócio",
      "Score Boa Vista SCPC do sócio",
      "Pendências e protestos detalhados",
      "Relatório executivo em PDF",
    ],
    ctaLabel: "Consultar CNPJ",
    icon: Building2,
    rota: "/consultar/cnpj",
    tipoDocumento: "CNPJ",
  },
  limpeza_desconto: {
    tipo: "limpeza_desconto",
    nome: "Limpeza de Nome (CPF)",
    preco: 500.00,
    precoLabel: "R$ 500,00",
    badge: "Solução completa",
    destaque: true,
    resumo: "Limpa seu nome em até 20 dias úteis · sem quitar dívida",
    beneficios: [
      "Limpeza completa em até 20 dias úteis",
      "Você não precisa quitar a dívida",
      "Monitoramento 12 meses bônus incluso",
      "Painel online pra acompanhar o processo",
      "Consultor dedicado",
      "Atualizações por WhatsApp e email",
    ],
    ctaLabel: "Limpar meu nome",
    icon: Sparkles,
    rota: "/contratar?plano=limpeza_desconto",
    requerConsulta: true,
    tipoDocumento: "CPF",
  },
  limpeza_cnpj: {
    tipo: "limpeza_cnpj",
    nome: "Limpeza CNPJ + Sócio",
    preco: 580.01,
    precoLabel: "R$ 580,01",
    badge: "Solução completa empresa",
    destaque: true,
    resumo: "Limpa o nome do sócio responsável da sua empresa em até 20 dias úteis",
    beneficios: [
      "Limpeza completa em até 20 dias úteis",
      "Sem quitar dívida · sem negociar credor",
      "Monitoramento 12 meses bônus incluso",
      "Painel online pra acompanhar o processo",
      "Consultor dedicado",
      "Atualizações por WhatsApp e email",
    ],
    ctaLabel: "Limpar nome da empresa",
    icon: Briefcase,
    rota: "/contratar?plano=limpeza_cnpj",
    requerConsulta: true,
    tipoDocumento: "CNPJ",
  },
};

export function getPlano(tipo: PlanoTipo): Plano {
  return PLANOS[tipo];
}

export function isPlanoTipo(value: string): value is PlanoTipo {
  return (
    value === "consulta" ||
    value === "consulta_cnpj" ||
    value === "limpeza_desconto" ||
    value === "limpeza_cnpj"
  );
}

/**
 * Mapeia plano → tipo de termos pra link no aceite.
 */
export function tipoTermosDoPlano(tipo: PlanoTipo): "consulta" | "consulta-cnpj" | "limpeza" | "limpeza-cnpj" {
  if (tipo === "consulta") return "consulta";
  if (tipo === "consulta_cnpj") return "consulta-cnpj";
  if (tipo === "limpeza_desconto") return "limpeza";
  return "limpeza-cnpj";
}
