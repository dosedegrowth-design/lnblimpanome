import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cleanCPF, isValidCPF } from "@/lib/utils";

/**
 * POST /api/site/checkout
 *
 * Fluxo self-service do site:
 * 1) Valida + cadastra cliente em lnb_cliente_auth (se ainda não existir)
 * 2) Chama webhook n8n "Cobranca Dinamica LNB" pra gerar preference Mercado Pago
 * 3) Retorna init_point pra redirect do cliente
 *
 * Body:
 * {
 *   cpf: string, nome: string, email: string,
 *   telefone: string, senha: string,
 *   tipo: "consulta" | "limpeza_desconto" | "limpeza"
 * }
 */
const COBRANCA_WEBHOOK =
  process.env.LNB_COBRANCA_WEBHOOK ||
  "https://webhook.dosedegrowth.cloud/webhook/gerar-cobranca-lnb";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const {
    cpf: cpfRaw,
    nome,
    email,
    telefone: telefoneRaw,
    senha,
    tipo = "consulta",
  } = body as Record<string, string>;

  const cpf = cleanCPF(cpfRaw || "");
  const telefone = (telefoneRaw || "").replace(/\D/g, "");

  if (!isValidCPF(cpf)) return NextResponse.json({ ok: false, error: "CPF inválido" }, { status: 400 });
  if (!nome || nome.length < 2) return NextResponse.json({ ok: false, error: "Nome inválido" }, { status: 400 });
  if (!email || !email.includes("@")) return NextResponse.json({ ok: false, error: "Email inválido" }, { status: 400 });
  if (!telefone || telefone.length < 10) return NextResponse.json({ ok: false, error: "Telefone inválido" }, { status: 400 });
  if (!senha || senha.length < 8) return NextResponse.json({ ok: false, error: "Senha precisa ter ao menos 8 caracteres" }, { status: 400 });
  if (!["consulta", "limpeza_desconto", "limpeza"].includes(tipo)) {
    return NextResponse.json({ ok: false, error: "Tipo inválido" }, { status: 400 });
  }

  const supa = await createClient();

  // 1) Cadastrar cliente (se já existe, ignora — função RPC já trata)
  const reg = await supa.rpc("lnb_cliente_register", {
    p_cpf: cpf,
    p_senha: senha,
    p_nome: nome,
    p_email: email,
    p_telefone: telefone,
  });
  // Se erro for "CPF já cadastrado", ok seguir (cliente pode estar voltando)
  if (reg.error) {
    console.error("[checkout] register erro:", reg.error);
  } else if (reg.data && (reg.data as { ok: boolean }).ok === false) {
    const msg = (reg.data as { error?: string }).error || "";
    if (!msg.includes("já cadastrado")) {
      return NextResponse.json({ ok: false, error: msg }, { status: 400 });
    }
  }

  // 2) Chamar webhook n8n pra criar preference Mercado Pago
  let mpData: { init_point?: string; preference_id?: string; error?: string } = {};
  try {
    const r = await fetch(COBRANCA_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipo,
        cpf,
        nome,
        email,
        telefone,
      }),
      // server-side, sem cors
    });
    if (!r.ok) {
      const text = await r.text();
      console.error("[checkout] n8n erro:", r.status, text);
      return NextResponse.json(
        { ok: false, error: "Não conseguimos gerar a cobrança. Tente novamente em instantes." },
        { status: 502 }
      );
    }
    mpData = await r.json();
  } catch (e) {
    console.error("[checkout] n8n catch:", e);
    return NextResponse.json(
      { ok: false, error: "Falha de comunicação com o gateway. Tente novamente." },
      { status: 502 }
    );
  }

  if (!mpData.init_point) {
    return NextResponse.json(
      { ok: false, error: "Resposta inválida do gateway" },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    init_point: mpData.init_point,
    preference_id: mpData.preference_id,
    cpf,
  });
}
