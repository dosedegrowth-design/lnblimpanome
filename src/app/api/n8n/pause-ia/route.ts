import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkN8nAuth } from "@/lib/n8n/auth";
import { addLabels } from "@/lib/chatwoot-labels";
import { criarPrivateNote } from "@/lib/chatwoot-attributes";
import { buscarConversationIdPorTelefone } from "@/lib/chatwoot-kanban";

export const runtime = "nodejs";

/**
 * POST /api/n8n/pause-ia
 *
 * Pausa a Maia (IA) pra uma conversa — handoff humano.
 * Cliente pediu falar com humano OU equipe assumiu manualmente.
 *
 * Faz 4 coisas:
 *  1) Marca LNB - CRM.ia_pausada = true
 *  2) Aplica label "ia-pausada" no Chatwoot
 *  3) Cria private note "🤖 IA pausada"
 *  4) Loga em audit log
 *
 * Body:
 *   {
 *     telefone: "5511997440101",
 *     conversation_id?: 123,
 *     motivo?: "cliente_pediu_humano" | "equipe_assumiu" | "conflito"
 *   }
 */
export async function POST(req: Request) {
  const auth = checkN8nAuth(req);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const telefone = String(body?.telefone || "").replace(/\D/g, "");
  const motivo = String(body?.motivo || "manual").trim();
  const conversationIdFromBody = Number(body?.conversation_id);

  if (!telefone) {
    return NextResponse.json({ ok: false, error: "telefone obrigatório" }, { status: 400 });
  }

  const supa = await createClient();

  // 1) Atualiza CRM
  let crmOk = false;
  try {
    const { data } = await supa.rpc("lnb_crm_set_ia_pause", {
      p_telefone: telefone,
      p_pausada: true,
      p_motivo: motivo,
    });
    const r = data as { ok: boolean };
    crmOk = !!r?.ok;
  } catch (e) {
    console.error("[n8n/pause-ia] erro RPC:", e);
  }

  // 2) Resolve conversation_id pra ações Chatwoot
  let conversationId: number | null = isFinite(conversationIdFromBody)
    ? conversationIdFromBody
    : null;
  if (!conversationId) {
    conversationId = await buscarConversationIdPorTelefone(telefone);
  }

  // 3) Aplica label + private note
  let labelOk = false;
  let noteOk = false;
  if (conversationId) {
    try {
      const r1 = await addLabels(conversationId, ["ia-pausada"]);
      labelOk = r1.ok;
    } catch (e) {
      console.error("[n8n/pause-ia] erro label:", e);
    }
    try {
      const r2 = await criarPrivateNote(
        conversationId,
        `🤖 **IA pausada** — handoff humano\n• Motivo: \`${motivo}\`\n• Origem: n8n\n\n*A Maia não vai responder até alguém chamar /api/n8n/start-ia ou clicar no botão "Reativar IA" no painel.*`
      );
      noteOk = r2.ok;
    } catch (e) {
      console.error("[n8n/pause-ia] erro note:", e);
    }
  }

  // 4) Audit log
  try {
    await supa.rpc("lnb_audit_insert", {
      p_actor_id: telefone,
      p_actor_type: "system",
      p_action: "ia_pausada",
      p_resource_type: "chatwoot_conversation",
      p_resource_id: conversationId ? String(conversationId) : null,
      p_metadata: { motivo, source: "n8n" },
    });
  } catch (e) {
    console.error("[n8n/pause-ia] erro audit:", e);
  }

  return NextResponse.json({
    ok: true,
    telefone,
    conversation_id: conversationId,
    crm_atualizado: crmOk,
    label_aplicado: labelOk,
    note_criada: noteOk,
    motivo,
  });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "POST /api/n8n/pause-ia",
    body: {
      telefone: "5511997440101",
      conversation_id: 123,
      motivo: "cliente_pediu_humano | equipe_assumiu | conflito",
    },
  });
}
