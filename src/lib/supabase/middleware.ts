/**
 * Helper de middleware pra refresh de session Supabase.
 *
 * Estratégia simplificada (após bugs de redirect loop):
 * - Middleware APENAS faz refresh do token (mantém sessão viva)
 * - NÃO redireciona com base em ausência de user
 * - A proteção de rota é feita no Server Component (requireAdmin/getAdminContext)
 *   que sabe redirecionar usando next/navigation.redirect()
 */
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Só refresh do token — sem redirects
  await supabase.auth.getUser();

  return supabaseResponse;
}
