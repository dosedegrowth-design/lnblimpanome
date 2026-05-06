/**
 * Supabase client para Server Components / Server Actions / Route Handlers.
 * Usa cookies pra session persistence (auth SSR padrão).
 *
 * IMPORTANTE: este projeto NÃO usa service_role key.
 * - Admin: Supabase Auth + RLS policies (lnb_admin_users.id = auth.uid())
 * - Cliente: Postgres functions SECURITY DEFINER (lnb_cliente_login, _register, _dashboard)
 */
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Components não permitem set — silenciar.
          }
        },
      },
    }
  );
}
