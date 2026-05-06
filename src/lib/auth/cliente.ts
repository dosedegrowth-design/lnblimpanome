/**
 * Auth do PAINEL CLIENTE — CPF + senha simples.
 *
 * Diferente do admin (Supabase Auth), o cliente usa autenticação custom:
 * - Cliente cadastra com CPF + senha após o primeiro pagamento
 * - Senha armazenada com bcrypt (cost 12) na tabela lnb_cliente_auth
 * - Sessão via cookie HttpOnly assinado (HMAC + secret)
 * - Lockout após 5 tentativas falhas (15 min)
 *
 * Por que não Supabase Auth?
 * Cliente final raramente tem email validado. CPF é o identificador natural
 * do negócio (única coisa que ele lembra). Auth próprio dá mais controle.
 */
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import bcrypt from "bcryptjs";
import { createServiceClient } from "@/lib/supabase/server";
import { cleanCPF, isValidCPF } from "@/lib/utils";
import type { ClienteAuthRow } from "@/lib/supabase/types";

const SESSION_COOKIE = "lnb_cliente_sess";
const SESSION_TTL_DAYS = 30;
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 15;

function getSecret(): string {
  const s = process.env.CLIENTE_SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error(
      "CLIENTE_SESSION_SECRET não definido ou < 32 chars (use openssl rand -base64 32)"
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

/* ============= Auth core ============= */

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

  const supa = createServiceClient();
  const { data: existing } = await supa
    .from("lnb_cliente_auth")
    .select("cpf")
    .eq("cpf", cpf)
    .maybeSingle();

  if (existing) return { ok: false, error: "CPF já cadastrado. Faça login." };

  const senha_hash = await bcrypt.hash(input.senha, 12);

  const { error } = await supa.from("lnb_cliente_auth").insert({
    cpf,
    senha_hash,
    nome: input.nome,
    email: input.email ?? null,
    telefone: input.telefone ?? null,
    email_verificado: false,
    failed_attempts: 0,
  });

  if (error) return { ok: false, error: "Falha ao cadastrar — tente novamente" };
  return { ok: true };
}

export async function loginCliente(
  cpfInput: string,
  senha: string
): Promise<{ ok: true; cpf: string; nome: string } | { ok: false; error: string }> {
  const cpf = cleanCPF(cpfInput);
  if (!isValidCPF(cpf)) return { ok: false, error: "CPF inválido" };

  const supa = createServiceClient();
  const { data: row } = await supa
    .from("lnb_cliente_auth")
    .select("*")
    .eq("cpf", cpf)
    .maybeSingle<ClienteAuthRow>();

  if (!row) return { ok: false, error: "CPF não cadastrado" };

  // Lock check
  if (row.locked_until && new Date(row.locked_until) > new Date()) {
    return { ok: false, error: "Conta bloqueada temporariamente. Tente em 15min." };
  }

  const valid = await bcrypt.compare(senha, row.senha_hash);
  if (!valid) {
    const attempts = (row.failed_attempts ?? 0) + 1;
    const lockUntil =
      attempts >= MAX_FAILED_ATTEMPTS
        ? new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000).toISOString()
        : null;

    await supa
      .from("lnb_cliente_auth")
      .update({ failed_attempts: attempts, locked_until: lockUntil })
      .eq("cpf", cpf);

    return { ok: false, error: "Senha incorreta" };
  }

  await supa
    .from("lnb_cliente_auth")
    .update({
      failed_attempts: 0,
      locked_until: null,
      last_login_at: new Date().toISOString(),
    })
    .eq("cpf", cpf);

  return { ok: true, cpf, nome: row.nome };
}

export async function changeSenha(
  cpf: string,
  senhaAtual: string,
  novaSenha: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (novaSenha.length < 8) return { ok: false, error: "Senha precisa ter ao menos 8 caracteres" };

  const supa = createServiceClient();
  const { data: row } = await supa
    .from("lnb_cliente_auth")
    .select("senha_hash")
    .eq("cpf", cleanCPF(cpf))
    .maybeSingle();

  if (!row) return { ok: false, error: "Cliente não encontrado" };
  const valid = await bcrypt.compare(senhaAtual, row.senha_hash);
  if (!valid) return { ok: false, error: "Senha atual incorreta" };

  const senha_hash = await bcrypt.hash(novaSenha, 12);
  await supa.from("lnb_cliente_auth").update({ senha_hash }).eq("cpf", cleanCPF(cpf));
  return { ok: true };
}
