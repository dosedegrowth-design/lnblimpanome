import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/* ============= CPF ============= */

export function cleanCPF(cpf: string): string {
  return (cpf || "").replace(/\D/g, "");
}

export function formatCPF(cpf: string): string {
  const c = cleanCPF(cpf).slice(0, 11);
  return c
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export function isValidCPF(cpf: string): boolean {
  const c = cleanCPF(cpf);
  if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(c[i]) * (10 - i);
  let d1 = 11 - (sum % 11);
  if (d1 >= 10) d1 = 0;
  if (d1 !== parseInt(c[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(c[i]) * (11 - i);
  let d2 = 11 - (sum % 11);
  if (d2 >= 10) d2 = 0;
  return d2 === parseInt(c[10]);
}

/* ============= CNPJ ============= */

export function cleanCNPJ(cnpj: string): string {
  return (cnpj || "").replace(/\D/g, "");
}

export function formatCNPJ(cnpj: string): string {
  const c = cleanCNPJ(cnpj).slice(0, 14);
  return c
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

export function isValidCNPJ(cnpj: string): boolean {
  const c = cleanCNPJ(cnpj);
  if (c.length !== 14 || /^(\d)\1+$/.test(c)) return false;
  const calc = (slice: string, weights: number[]): number => {
    let sum = 0;
    for (let i = 0; i < weights.length; i++) sum += parseInt(slice[i]) * weights[i];
    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const d1 = calc(c.slice(0, 12), w1);
  if (d1 !== parseInt(c[12])) return false;
  const d2 = calc(c.slice(0, 13), w2);
  return d2 === parseInt(c[13]);
}

export function maskCNPJ(cnpj: string): string {
  const c = cleanCNPJ(cnpj);
  if (c.length !== 14) return cnpj;
  return `${c.slice(0, 2)}.***.***/****-${c.slice(12)}`;
}

/* ============= Documento (CPF ou CNPJ) ============= */

export type TipoDocumento = "CPF" | "CNPJ";

export function detectarTipoDocumento(doc: string): TipoDocumento | null {
  const c = (doc || "").replace(/\D/g, "");
  if (c.length === 11) return "CPF";
  if (c.length === 14) return "CNPJ";
  return null;
}

/* ============= Phone ============= */

export function formatPhone(phone: string): string {
  const c = (phone || "").replace(/\D/g, "");
  if (c.length === 11) return c.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  if (c.length === 10) return c.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  return phone;
}

/* ============= Money ============= */

export function formatBRL(value: number | string | null | undefined): string {
  const n = typeof value === "string" ? parseFloat(value) : (value ?? 0);
  if (isNaN(n)) return "R$ 0,00";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/* ============= Date ============= */

export function formatDateBR(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}

export function formatDateTimeBR(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

/* ============= Misc ============= */

export function maskCPF(cpf: string): string {
  const c = cleanCPF(cpf);
  if (c.length !== 11) return cpf;
  return `${c.slice(0, 3)}.***.***-${c.slice(9)}`;
}

export function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}
