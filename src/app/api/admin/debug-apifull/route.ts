import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { consultarCPF, parseConsulta } from "@/lib/api-full";
import { cleanCPF, isValidCPF } from "@/lib/utils";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * GET /api/admin/debug-apifull?cpf=XXX
 *
 * Mostra o JSON CRU da API Full + o resultado do parser.
 * Útil pra debugar quando o PDF vem zerado (parser não pegou as chaves certas).
 *
 * ⚠ CUSTA R$ 2,49 por chamada (API Full é cobrada).
 * Use parcimoniosamente.
 */
export async function GET(req: Request) {
  await requireAdmin();

  const url = new URL(req.url);
  const cpfParam = url.searchParams.get("cpf");
  if (!cpfParam) {
    return NextResponse.json({ ok: false, error: "?cpf= obrigatório" }, { status: 400 });
  }

  const cpf = cleanCPF(cpfParam);
  if (!isValidCPF(cpf)) {
    return NextResponse.json({ ok: false, error: "CPF inválido" }, { status: 400 });
  }

  try {
    const raw = await consultarCPF(cpf);
    const parsed = parseConsulta(raw);

    // Lista as chaves do nível raiz pra ajudar a entender o formato
    const chavesRaiz = Object.keys(raw as Record<string, unknown>);
    const inner = ((raw as Record<string, unknown>).data ||
      (raw as Record<string, unknown>).resultado ||
      (raw as Record<string, unknown>).Resultado) as
      | Record<string, unknown>
      | undefined;
    const chavesInner = inner ? Object.keys(inner) : null;

    return NextResponse.json({
      ok: true,
      cpf,
      parsed,
      raw_keys: {
        raiz: chavesRaiz,
        inner: chavesInner,
      },
      raw_score: (raw as Record<string, unknown>).Score,
      raw_completo: raw,
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      },
      { status: 500 }
    );
  }
}
