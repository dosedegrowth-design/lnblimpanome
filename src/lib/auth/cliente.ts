/**
 * Auth do PAINEL CLIENTE — CPF + senha.
 *
 * Arquitetura sem service_role:
 *   - Senha hashed via Postgres (crypt + gen_salt('bf', 12))
 *   - Login/cadastro/dashboard via RPC functions SECURITY DEFINER
 *   - Sessão via cookie HttpOnly assinado HMAC server-side
 *   - Lockout após 5 tentativas falhas (15 min) — controlado na function SQL
 */
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { cleanCPF, isValidCPF } from "@/lib/utils";

const SESSION_COOKIE = "lnb_cliente_sess";
const SESSION_TTL_DAYS = 30;

function getSecret(): string {
  const s = process.env.CLIENTE_SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error(
      "CLIENTE_SESSION_SECRET não definido ou < 32 chars (use openssl rand -base64 48)"
    );
  }
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

function verifySig(payload: string, sig: string): boolean {
  const expected = sign(payload);
  if (expected.length !== sig.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
}

export interface ClienteSession {
  cpf: string;
  nome: string;
  iat: number;
  exp: number;
}

function encodeSession(s: ClienteSession): string {
  const payload = Buffer.from(JSON.stringify(s)).toString("base64url");
  const sig = sign(payload);
  return `${payload}.${sig}`;
}

function decodeSession(token: string): ClienteSession | null {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  if (!verifySig(payload, sig)) return null;
  try {
    const s = JSON.parse(Buffer.from(payload, "base64url").toString()) as ClienteSession;
    if (s.exp < Date.now()) return null;
    return s;
  } catch {
    return null;
  }
}

/* ============= Cookie helpers ============= */

export async function setClienteSession(s: Omit<ClienteSession, "iat" | "exp">) {
  const now = Date.now();
  const session: ClienteSession = {
    ...s,
    iat: now,
    exp: now + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
  };
  const token = encodeSession(session);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
  });
}

export async function getClienteSession(): Promise<ClienteSession | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return decodeSession(token);
}

export async function clearClienteSession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

/* ============= Auth core (via RPC) ============= */

export async function registerCliente(input: {
  cpf: string;
  senha: string;
  nome: string;
  email?: string | null;
  telefone?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const cpf = cleanCPF(input.cpf);
  if (!isValidCPF(cpf)) return { ok: false, error: "CPF inválido" };
  if (input.senha.length < 8) return { ok: false, error: "Senha precisa ter ao menos 8 caracteres" };

  const supa = await createClient();
  const { data, error } = await supa.rpc("lnb_cliente_register", {
    p_cpf: cpf,
    p_senha: input.senha,
    p_nome: input.nome,
    p_email: input.email ?? null,
    p_telefone: input.telefone ?? null,
  });

  if (error) {
    console.error("[register] rpc error:", error);
    return { ok: false, error: "Falha ao cadastrar — tente novamente" };
  }
  const result = data as { ok: boolean; error?: string };
  if (!result.ok) return { ok: false, error: result.error ?? "Erro desconhecido" };
  return { ok: true };
}

export async function loginCliente(
  cpfInput: string,
  senha: string
): Promise<{ ok: true; cpf: string; nome: string } | { ok: false; error: string }> {
  const cpf = cleanCPF(cpfInput);
  if (!isValidCPF(cpf)) return { ok: false, error: "CPF inválido" };

  const supa = await createClient();
  const { data, error } = await supa.rpc("lnb_cliente_login", {
    p_cpf: cpf,
    p_senha: senha,
  });

  if (error) {
    console.error("[login] rpc error:", error);
    return { ok: false, error: "Falha ao entrar — tente novamente" };
  }
  const result = data as { ok: boolean; error?: string; cpf?: string; nome?: string };
  if (!result.ok) return { ok: false, error: result.error ?? "Erro" };
  return { ok: true, cpf: result.cpf!, nome: result.nome! };
}

export async function getClienteDashboardData(cpf: string) {
  const supa = await createClient();
  const { data, error } = await supa.rpc("lnb_cliente_dashboard", {
    p_cpf: cleanCPF(cpf),
  });
  if (error) {
    console.error("[dashboard] rpc error:", error);
    return { crm: null, consulta: null, blindagem: null };
  }
  return data as { crm: unknown; consulta: unknown; blindagem: unknown };
}
