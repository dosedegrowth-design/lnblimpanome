import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths exceto:
     * - _next/static (arquivos estáticos)
     * - _next/image (otimização de imagem)
     * - favicon, brand assets
     * - api/cliente/* (auth próprio)
     */
    "/((?!_next/static|_next/image|favicon.ico|brand|api/cliente|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
