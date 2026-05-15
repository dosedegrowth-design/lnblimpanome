/**
 * Tipos e fallback de PRODUTOS — podem ser usadas em client OU server.
 * Pra leitura do banco veja src/lib/produtos.ts (server-only).
 */

export type ProdutoCodigo =
  | "consulta_cpf"
  | "consulta_cnpj"
  | "limpeza_cpf"
  | "limpeza_cnpj"
  | "blindagem";

export interface Produto {
  codigo: ProdutoCodigo;
  nome: string;
  valor: number;
  preco_real: number;
  preco_teste: number;
  desconto_consulta: number;
  custo_api: number;
  ordem: number;
}

export type ProdutosMap = Record<ProdutoCodigo, Produto>;

export const FALLBACK_PRODUTOS: ProdutosMap = {
  consulta_cpf:  { codigo: "consulta_cpf",  nome: "Consulta CPF",          valor: 29.99,  preco_real: 29.99,  preco_teste: 5, desconto_consulta: 0,     custo_api: 2.49, ordem: 10 },
  consulta_cnpj: { codigo: "consulta_cnpj", nome: "Consulta CNPJ",         valor: 39.99,  preco_real: 39.99,  preco_teste: 5, desconto_consulta: 0,     custo_api: 2.49, ordem: 20 },
  limpeza_cpf:   { codigo: "limpeza_cpf",   nome: "Limpeza de Nome CPF",   valor: 500.00, preco_real: 500.00, preco_teste: 5, desconto_consulta: 29.99, custo_api: 0,    ordem: 30 },
  limpeza_cnpj:  { codigo: "limpeza_cnpj",  nome: "Limpeza de Nome CNPJ",  valor: 580.01, preco_real: 580.01, preco_teste: 5, desconto_consulta: 39.99, custo_api: 0,    ordem: 40 },
  blindagem:     { codigo: "blindagem",     nome: "Blindagem mensal CPF",  valor: 29.90,  preco_real: 29.90,  preco_teste: 5, desconto_consulta: 0,     custo_api: 0,    ordem: 50 },
};
