import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkN8nAuth } from "@/lib/n8n/auth";
import { cleanCPF, isValidCPF } from "@/lib/utils";
import { setCustomAttributes, criarPrivateNote } from "@/lib/chatwoot-attributes";
import { addLabels } from "@/lib/chatwoot-labels";
import { buscarConversationIdPorTelefone } from "@/lib/chatwoot-kanban";

export const runtime = "nodejs";

/**
 * POST /api/n8n/blindagem-cadastro
 *
 * Cadastra CPF em LNB_Blindagem pra monitoramento contínuo.
 * Substitui a tool blindagem_cadastro do v02.
 *
 * Body:
 *   {
 *     telefone: "...",
 *     cpf: "...",
 *     nome: "...",
 *     email?: "...",
 *     plano?: "mensal" | "anual",
 *   }
 */
export async function POST(req: Request) {
  const auth = checkN8nAuth(req);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const cpf = cleanCPF(String(body?.cpf || ""));
  const telefone = String(body?.telefone || "").replace(/\D/g, "");
  const nome = String(body?.nome || "").trim();
  const email = String(body?.email || "").trim();
  const plano = String(body?.plano || "mensal");
  const valor = plano === "anual" ? 299.0 : 29.9;

  if (!isValidCPF(cpf)) return NextResponse.json({ ok: false, error: "CPF inválido" }, { status: 400 });
  if (!telefone) return NextResponse.json({ ok: false, error: "telefone obrigatório" }, { status: 400 });
  if (!nome) return NextResponse.json({ ok: false, error: "nome obrigatório" }, { status: 400 });

  const supa = await createClient();
  const { data, error } = await supa
    .from("LNB_Blindagem")
    .upsert(
      {
        cpf,
        nome,
        telefone,
        email: email || null,
        ativo: true,
        plano,
        valor,
        proxima_verificacao: new Date().toISOString(),
        tem_pendencia_atual: null,
      },
      { onConflict: "cpf" }
    )
    .select("id, cpf, ativo, plano")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  // Sincroniza Chatwoot: custom attrs + label + private note
  const chatwootSync = { custom_attrs: false, label: false, note: false };
  try {
    const conversationId = await buscarConversationIdPorTelefone(telefone);
    if (conversationId) {
      const r1 = await setCustomAttributes(conversationId, {
        blindagem_ativa: "sim",
        blindagem_plano: plano,
        blindagem_valor: `R$ ${valor.toFixed(2).replace(".", ",")}`,
        blindagem_cpf: cpf,
      });
      chatwootSync.custom_attrs = r1.ok;
      const r2 = await addLabels(conversationId, ["blindagem-mensal", "aguardando-pagamento"]);
      chatwootSync.label = r2.ok;
      const r3 = await criarPrivateNote(
        conversationId,
        `🛡️ **Blindagem cadastrada**\n• Plano: ${plano}\n• Valor: R$ ${valor.toFixed(2).replace(".", ",")}\n• CPF: ${cpf}\n\n*Aguardando confirmação de pagamento.*`
      );
      chatwootSync.note = r3.ok;
    }
  } catch (e) {
    console.error("[n8n/blindagem-cadastro] erro sync Chatwoot:", e);
  }

  // Audit log
  try {
    await supa.rpc("lnb_audit_insert", {
      p_actor_id: telefone,
      p_actor_type: "system",
      p_action: "blindagem_cadastrada",
      p_resource_type: "lnb_blindagem",
      p_resource_id: cpf,
      p_metadata: { plano, valor, source: "n8n" },
    });
  } catch (e) {
    console.error("[n8n/blindagem-cadastro] erro audit:", e);
  }

  return NextResponse.json({ ok: true, blindagem: data, chatwoot_sync: chatwootSync });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "POST /api/n8n/blindagem-cadastro",
    body: { telefone: "...", cpf: "...", nome: "...", email: "...", plano: "mensal|anual" },
  });
}
