import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkN8nAuth } from "@/lib/n8n/auth";

export const runtime = "nodejs";

/**
 * POST /api/n8n/sync-conversation
 *
 * Registra cada mensagem que chega do WhatsApp via Chatwoot/n8n no painel:
 *  - Atualiza last_interaction em LNB - CRM
 *  - Liga conversation_id ao CRM (caso ainda não esteja)
 *  - Loga em lnb_audit_log (action='wa_message_received')
 *
 * Chamado pelo n8n bem no início do fluxo (logo após SetFieldsBasic),
 * antes de qualquer processamento de IA. Garante visibilidade total no painel
 * mesmo que o restante do fluxo n8n falhe.
 *
 * Body:
 *   {
 *     telefone: "5511997440101",
 *     conversation_id: 123,
 *     content?: "texto da mensagem (truncado pra audit)",
 *     message_type?: "incoming" | "outgoing",
 *     attachment_type?: "image" | "audio" | "video" | null
 *   }
 */
export async function POST(req: Request) {
  const auth = checkN8nAuth(req);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const telefone = String(body?.telefone || "").replace(/\D/g, "");
  const conversationId = Number(body?.conversation_id);
  const content = String(body?.content || "").slice(0, 500);
  const messageType = String(body?.message_type || "incoming");
  const attachmentType = body?.attachment_type ? String(body.attachment_type) : null;

  if (!telefone) {
    return NextResponse.json({ ok: false, error: "telefone obrigatório" }, { status: 400 });
  }

  const supa = await createClient();

  // 1) Atualiza last_interaction + conversation_id
  let updated = 0;
  try {
    const { data } = await supa.rpc("lnb_crm_set_last_interaction", {
      p_telefone: telefone,
      p_conversation_id: isFinite(conversationId) ? conversationId : null,
    });
    const r = data as { ok: boolean; updated?: number };
    updated = r?.updated ?? 0;
  } catch (e) {
    console.error("[n8n/sync-conversation] erro RPC last_interaction:", e);
  }

  // 2) Audit log
  try {
    await supa.rpc("lnb_audit_insert", {
      p_actor_id: telefone,
      p_actor_type: "system",
      p_action: messageType === "incoming" ? "wa_message_received" : "wa_message_sent",
      p_resource_type: "chatwoot_conversation",
      p_resource_id: isFinite(conversationId) ? String(conversationId) : null,
      p_metadata: {
        content_preview: content,
        attachment_type: attachmentType,
        message_type: messageType,
      },
    });
  } catch (e) {
    console.error("[n8n/sync-conversation] erro audit:", e);
  }

  return NextResponse.json({
    ok: true,
    telefone,
    conversation_id: isFinite(conversationId) ? conversationId : null,
    updated_crm: updated,
  });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "POST /api/n8n/sync-conversation",
    body: {
      telefone: "5511997440101",
      conversation_id: 123,
      content: "(opcional, primeiros 500 chars)",
      message_type: "incoming|outgoing",
      attachment_type: "image|audio|video|null",
    },
  });
}
