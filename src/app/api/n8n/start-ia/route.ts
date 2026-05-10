import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkN8nAuth } from "@/lib/n8n/auth";
import { removeLabels } from "@/lib/chatwoot-labels";
import { criarPrivateNote } from "@/lib/chatwoot-attributes";
import { buscarConversationIdPorTelefone } from "@/lib/chatwoot-kanban";

export const runtime = "nodejs";

/**
 * POST /api/n8n/start-ia
 *
 * Reativa a Maia depois de uma pausa (handoff humano terminou).
 *
 * Faz 4 coisas:
 *  1) Marca LNB - CRM.ia_pausada = false
 *  2) Remove label "ia-pausada" do Chatwoot
 *  3) Cria private note "🤖 IA reativada"
 *  4) Loga em audit log
 *
 * Body:
 *   {
 *     telefone: "5511997440101",
 *     conversation_id?: 123
 *   }
 */
export async function POST(req: Request) {
  const auth = checkN8nAuth(req);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const telefone = String(body?.telefone || "").replace(/\D/g, "");
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
      p_pausada: false,
      p_motivo: null,
    });
    const r = data as { ok: boolean };
    crmOk = !!r?.ok;
  } catch (e) {
    console.error("[n8n/start-ia] erro RPC:", e);
  }

  // 2) Resolve conversation_id
  let conversationId: number | null = isFinite(conversationIdFromBody)
    ? conversationIdFromBody
    : null;
  if (!conversationId) {
    conversationId = await buscarConversationIdPorTelefone(telefone);
  }

  // 3) Remove label + private note
  let labelOk = false;
  let noteOk = false;
  if (conversationId) {
    try {
      const r1 = await removeLabels(conversationId, ["ia-pausada"]);
      labelOk = r1.ok;
    } catch (e) {
      console.error("[n8n/start-ia] erro label:", e);
    }
    try {
      const r2 = await criarPrivateNote(
        conversationId,
        `🤖 **IA reativada** — Maia voltou a responder\n• Origem: n8n`
      );
      noteOk = r2.ok;
    } catch (e) {
      console.error("[n8n/start-ia] erro note:", e);
    }
  }

  // 4) Audit log
  try {
    await supa.rpc("lnb_audit_insert", {
      p_actor_id: telefone,
      p_actor_type: "system",
      p_action: "ia_reativada",
      p_resource_type: "chatwoot_conversation",
      p_resource_id: conversationId ? String(conversationId) : null,
      p_metadata: { source: "n8n" },
    });
  } catch (e) {
    console.error("[n8n/start-ia] erro audit:", e);
  }

  return NextResponse.json({
    ok: true,
    telefone,
    conversation_id: conversationId,
    crm_atualizado: crmOk,
    label_removido: labelOk,
    note_criada: noteOk,
  });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "POST /api/n8n/start-ia",
    body: { telefone: "5511997440101", conversation_id: 123 },
  });
}
