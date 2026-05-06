/**
 * Supabase ADMIN client — service role.
 * APENAS pra rotas de webhook/server actions que precisam BYPASS RLS.
 *
 * NUNCA usar em código que possa rodar no client.
 * NUNCA expor SUPABASE_SERVICE_ROLE_KEY ao client (sem prefixo NEXT_PUBLIC).
 */
import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY não definido — necessário pra webhook Mercado Pago");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
