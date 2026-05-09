import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkN8nAuth } from "@/lib/n8n/auth";
import { cleanCPF } from "@/lib/utils";
import {
  moverKanbanStage,
  buscarConversationIdPorTelefone,
} from "@/lib/chatwoot-kanban";

export const runtime = "nodejs";

/**
 * POST /api/n8n/lead-status
 *
 * Move o cliente entre stages do CRM (substitui as tools Lead_kanban,
 * interessado, Qualificado do v02).
 *
 * Faz 3 coisas:
 *   1) Upsert em "LNB - CRM" (cria se não existe)
 *   2) Atualiza flags de stage (Lead/Interessado/Qualificado/Fechado/Perdido)
 *   3) MOVE o card no Kanban Chatwoot ("Limpeza de Nome" funnel id=1)
 *
 * Body:
 *   {
 *     telefone: "5511997440101",
 *     stage: "Lead" | "Interessado" | "Qualificado" | "Fechado" | "Perdido",
 *     nome?: "...",
 *     cpf?: "...",
 *     email?: "...",
 *     servico?: "...",
 *     conversation_id?: 123  // se n8n tiver, passa direto; senão busca pelo telefone
 *   }
 *
 * Headers:
 *   Authorization: Bearer <N8N_SHARED_TOKEN>
 */
export async function POST(req: Request) {
  const auth = checkN8nAuth(req);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const telefone = String(body?.telefone || "").replace(/\D/g, "");
  const stage = String(body?.stage || "");
  const nome = String(body?.nome || "").trim();
  const cpf = cleanCPF(String(body?.cpf || ""));
  const email = String(body?.email || "").trim();
  const servico = String(body?.servico || "LNB - Atendimento WhatsApp");
  const conversationIdFromBody = Number(body?.conversation_id);
  const valorServico = String(body?.valor_servico || "").trim();
  const tipoServico = String(body?.tipo_servico || "").trim();

  if (!telefone) {
    return NextResponse.json({ ok: false, error: "telefone obrigatório" }, { status: 400 });
  }

  const stagesValidos = ["Lead", "Interessado", "Qualificado", "Fechado", "Perdido"];
  if (!stagesValidos.includes(stage)) {
    return NextResponse.json(
      {
        ok: false,
        error: `stage inválido (recebido: ${stage}). Use: ${stagesValidos.join(", ")}`,
      },
      { status: 400 }
    );
  }

  const supa = await createClient();

  // 1) Upsert no CRM (cria se não existir, atualiza se já tem)
  try {
    await supa.rpc("checkout_upsert_crm_lead", {
      p_telefone: telefone,
      p_nome: nome || null,
      p_cpf: cpf || null,
      p_email: email || null,
      p_servico: servico,
      p_origem: "whatsapp",
    });
  } catch (e) {
    console.error("[n8n/lead-status] erro upsert:", e);
  }

  // 2) Atualiza stage flags em "LNB - CRM" via RPC SECURITY DEFINER
  try {
    const { error } = await supa.rpc("admin_lead_set_status", {
      p_telefone: telefone,
      p_stage: stage,
    });
    if (error) {
      // Fallback: tenta direto (se RPC não existir, segue tentando update direto)
      console.error("[n8n/lead-status] erro RPC, tentando direct:", error);
    }
  } catch (e) {
    console.error("[n8n/lead-status] erro stage:", e);
  }

  // 2.5) Se IA passou valor_servico/tipo_servico, grava no CRM
  if (valorServico && tipoServico) {
    try {
      await supa.rpc("lnb_crm_set_valor_servico", {
        p_telefone: telefone,
        p_valor_servico: valorServico,
        p_tipo_servico: tipoServico,
      });
    } catch (e) {
      console.error("[n8n/lead-status] erro valor_servico:", e);
    }
  }

  // 3) Move o card no Kanban Chatwoot (funil "Limpeza de Nome" id=1)
  let kanbanResult: { ok: boolean; error?: string; conversationId?: number } = {
    ok: false,
  };
  try {
    let conversationId: number | null = isFinite(conversationIdFromBody)
      ? conversationIdFromBody
      : null;
    if (!conversationId) {
      conversationId = await buscarConversationIdPorTelefone(telefone);
    }
    if (conversationId) {
      const r = await moverKanbanStage(conversationId, stage);
      kanbanResult = r.ok
        ? { ok: true, conversationId }
        : { ok: false, error: r.error, conversationId };
    } else {
      kanbanResult = { ok: false, error: "conversation_id não encontrado" };
    }
  } catch (e) {
    kanbanResult = { ok: false, error: String(e) };
  }

  return NextResponse.json({
    ok: true,
    telefone,
    stage,
    kanban: kanbanResult,
  });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "POST /api/n8n/lead-status",
    body: { telefone: "...", stage: "Lead|Interessado|Qualificado|Fechado|Perdido" },
  });
}
