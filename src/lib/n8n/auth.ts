/**
 * Autenticação simples pros endpoints /api/n8n/* — Bearer token compartilhado.
 *
 * O n8n manda header `Authorization: Bearer <N8N_SHARED_TOKEN>` em cada chamada.
 * Sem o token correto, retorna 401.
 *
 * Configurar no Vercel: N8N_SHARED_TOKEN=<string-aleatória-32+chars>
 * Configurar no n8n: HTTP Request node com header Authorization Bearer.
 */

export function checkN8nAuth(req: Request): { ok: true } | { ok: false; error: string } {
  const expected = process.env.N8N_SHARED_TOKEN;

  // Em dev (sem token configurado): permite (com warning)
  if (!expected) {
    if (process.env.NODE_ENV === "production") {
      return { ok: false, error: "N8N_SHARED_TOKEN não configurado no servidor" };
    }
    return { ok: true };
  }

  const auth = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  const token = m ? m[1].trim() : "";

  if (!token) {
    return { ok: false, error: "Header Authorization Bearer ausente" };
  }
  if (token !== expected) {
    return { ok: false, error: "Token inválido" };
  }
  return { ok: true };
}
