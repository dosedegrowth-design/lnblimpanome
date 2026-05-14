import { NextResponse } from "next/server";

/**
 * Endpoint de debug — recebe QUALQUER POST e loga todos os headers.
 * Use pra ver o que o n8n está mandando.
 * URL: POST /api/n8n/debug-auth
 */
export async function POST(req: Request) {
  const headers: Record<string, string> = {};
  req.headers.forEach((v, k) => {
    headers[k] = v;
  });

  let body: unknown = null;
  try {
    body = await req.json();
  } catch {}

  const expected = process.env.N8N_SHARED_TOKEN || "";
  const auth = req.headers.get("authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  const tokenRecebido = m ? m[1].trim() : "";

  console.log("[DEBUG-AUTH] headers:", JSON.stringify(headers, null, 2));
  console.log("[DEBUG-AUTH] body:", JSON.stringify(body));
  console.log("[DEBUG-AUTH] token_esperado_len:", expected.length);
  console.log("[DEBUG-AUTH] token_recebido_len:", tokenRecebido.length);
  console.log("[DEBUG-AUTH] match:", tokenRecebido === expected);

  return NextResponse.json({
    ok: true,
    headers_recebidos: headers,
    body_recebido: body,
    auth_diagnostico: {
      header_authorization: auth,
      token_recebido_length: tokenRecebido.length,
      token_recebido_first_8: tokenRecebido.slice(0, 8),
      token_recebido_last_8: tokenRecebido.slice(-8),
      token_esperado_length: expected.length,
      token_esperado_first_8: expected.slice(0, 8),
      token_esperado_last_8: expected.slice(-8),
      match: tokenRecebido === expected,
    },
  });
}
