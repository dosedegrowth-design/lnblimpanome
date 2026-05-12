import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cleanCPF } from "@/lib/utils";

export const runtime = "nodejs";

/**
 * POST /api/site/aceite-termos
 *
 * Registra o aceite dos Termos pelo cliente antes do pagamento.
 * Grava em lnb_audit_log com:
 *  - actor_id = CPF
 *  - actor_type = 'cliente'
 *  - action = 'aceite_termos_consulta' | 'aceite_termos_limpeza' | 'aceite_termos_blindagem'
 *  - metadata: { versao, ip, user_agent, valor, tipo, url_termos }
 *
 * Vinculação jurídica: timestamp do aceite + IP do USUÁRIO + texto do contrato
 * versionado tornam o aceite válido perante o CDC e a LGPD.
 *
 * Body:
 *   {
 *     cpf: "12345678909",
 *     tipo: "consulta" | "limpeza" | "blindagem",
 *     versao: "1.0",
 *     telefone?: string,
 *     nome?: string
 *   }
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const cpf = cleanCPF(String(body?.cpf || ""));
  const tipo = String(body?.tipo || "");
  const versao = String(body?.versao || "1.0");
  const telefone = String(body?.telefone || "").replace(/\D/g, "");
  const nome = String(body?.nome || "").trim();

  if (!cpf) {
    return NextResponse.json({ ok: false, error: "CPF obrigatório" }, { status: 400 });
  }
  if (!["consulta", "consulta-cnpj", "limpeza", "limpeza-cnpj", "blindagem"].includes(tipo)) {
    return NextResponse.json(
      { ok: false, error: "Tipo inválido (use: consulta, consulta-cnpj, limpeza, limpeza-cnpj, blindagem)" },
      { status: 400 }
    );
  }

  // Captura IP + User-Agent
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "0.0.0.0";
  const userAgent = req.headers.get("user-agent") || "";

  const supa = await createClient();

  try {
    await supa.rpc("lnb_audit_insert", {
      p_actor_id: cpf,
      p_actor_type: "cliente",
      p_action: `aceite_termos_${tipo}`,
      p_resource_type: "termos",
      p_resource_id: `termos-${tipo}-v${versao}`,
      p_metadata: {
        versao,
        tipo,
        cpf,
        telefone,
        nome,
        ip,
        user_agent: userAgent.slice(0, 500),
        url_termos: `https://limpanomebrazil.com.br/termos/${tipo}`,
        aceito_em: new Date().toISOString(),
      },
    });
  } catch (e) {
    console.error("[aceite-termos] audit insert erro:", e);
    return NextResponse.json(
      { ok: false, error: "Falha ao registrar aceite" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    cpf,
    tipo,
    versao,
    aceito_em: new Date().toISOString(),
  });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "POST /api/site/aceite-termos",
    body: {
      cpf: "12345678909",
      tipo: "consulta | limpeza | blindagem",
      versao: "1.0 (opcional, default 1.0)",
      telefone: "(opcional)",
      nome: "(opcional)",
    },
  });
}
