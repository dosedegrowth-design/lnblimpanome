/**
 * Supabase ADMIN client — service role.
 * APENAS pra Storage (uploads/signed URLs de bucket privado lnb-processos).
 *
 * Operações em tabelas (LNB_Consultas, LNB - CRM, etc) usam RPCs SECURITY DEFINER
 * em vez de service_role — ver webhook_*, checkout_* em supabase/migrations.
 *
 * NUNCA usar em código que possa rodar no client.
 * NUNCA expor SUPABASE_SERVICE_ROLE_KEY ao client (sem prefixo NEXT_PUBLIC).
 */
import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY não definido — necessário pra Storage (uploads de processos)"
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
