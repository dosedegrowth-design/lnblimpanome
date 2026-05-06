/**
 * Helper de middleware pra refresh de session Supabase + proteção de rotas.
 * Roda em edge — chamado pelo middleware.ts da raiz.
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

  // Importante: não roda código entre createServerClient e getUser
  const { data: { user } } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  /* ============== Painel admin ============== */
  if (path.startsWith("/painel") && path !== "/painel/login") {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/painel/login";
      url.searchParams.set("redirect", path);
      return NextResponse.redirect(url);
    }
  }

  if (path === "/painel/login" && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/painel/dashboard";
    return NextResponse.redirect(url);
  }

  /* ============== Painel cliente ============== */
  // Cliente usa auth custom (CPF + senha) via cookie próprio.
  // Verificação feita no layout server-side, não aqui.

  return supabaseResponse;
}
