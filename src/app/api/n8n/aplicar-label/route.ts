import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkN8nAuth } from "@/lib/n8n/auth";
import { aplicarLabelsLnb, type LnbLabelContext } from "@/lib/chatwoot-labels";
import { buscarConversationIdPorTelefone } from "@/lib/chatwoot-kanban";

export const runtime = "nodejs";

// Mapeia contexto → labels resultantes (espelha lógica de aplicarLabelsLnb)
function labelsByContexto(c: LnbLabelContext, score?: number): string[] {
  switch (c) {
    case "interessado_consulta": return ["consulta-cpf", "aguardando-pagamento"];
    case "pago_consulta": return ["pago-consulta"];
    case "consulta_resultado_com_pendencia": {
      const out = ["tem-pendencia"];
      if (typeof score === "number") {
        if (score >= 700) out.push("score-bom");
        else if (score >= 500) out.push("score-regular");
        else out.push("score-baixo");
      }
      return out;
    }
    case "consulta_resultado_sem_pendencia": {
      const out = ["nome-limpo"];
      if (typeof score === "number") {
        if (score >= 700) out.push("score-bom");
        else if (score >= 500) out.push("score-regular");
        else out.push("score-baixo");
      }
      return out;
    }
    case "interessado_limpeza": return ["limpeza-nome", "aguardando-pagamento"];
    case "pago_limpeza": return ["pago-limpeza"];
    case "interessado_blindagem": return ["blindagem-mensal", "aguardando-pagamento"];
    case "pago_blindagem": return ["pago-blindagem"];
    case "conflito": return ["conflito"];
    case "origem_whatsapp": return ["origem-whatsapp"];
    case "origem_site": return ["origem-site"];
    case "vip": return ["vip"];
  }
}

const CONTEXTOS_VALIDOS: LnbLabelContext[] = [
  "interessado_consulta",
  "pago_consulta",
  "consulta_resultado_com_pendencia",
  "consulta_resultado_sem_pendencia",
  "interessado_limpeza",
  "pago_limpeza",
  "interessado_blindagem",
  "pago_blindagem",
  "conflito",
  "origem_whatsapp",
  "origem_site",
  "vip",
];

/**
 * POST /api/n8n/aplicar-label
 *
 * Aplica labels (etiquetas) numa conversa do Chatwoot, de forma estruturada
 * por contexto de venda. A IA da Maia chama isso quando o lead muda de fase.
 *
 * Body:
 *   {
 *     telefone: "5511997440101",
 *     contexto: "interessado_consulta" | "pago_limpeza" | ...,
 *     score?: 412,                    // pra labels score-{bom|regular|baixo}
 *     conversation_id?: 123           // opcional, busca por telefone se não passar
 *   }
 */
export async function POST(req: Request) {
  const auth = checkN8nAuth(req);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const telefone = String(body?.telefone || "").replace(/\D/g, "");
  const contexto = String(body?.contexto || "") as LnbLabelContext;
  const scoreRaw = Number(body?.score);
  const score = isFinite(scoreRaw) ? scoreRaw : undefined;
  const conversationIdFromBody = Number(body?.conversation_id);

  if (!telefone) {
    return NextResponse.json({ ok: false, error: "telefone obrigatório" }, { status: 400 });
  }
  if (!CONTEXTOS_VALIDOS.includes(contexto)) {
    return NextResponse.json(
      {
        ok: false,
        error: `contexto inválido: ${contexto}`,
        contextos_validos: CONTEXTOS_VALIDOS,
      },
      { status: 400 }
    );
  }

  // Resolve conversation_id
  let conversationId: number | null = isFinite(conversationIdFromBody)
    ? conversationIdFromBody
    : null;
  if (!conversationId) {
    conversationId = await buscarConversationIdPorTelefone(telefone);
  }

  if (!conversationId) {
    return NextResponse.json(
      { ok: false, error: "conversation_id não encontrado pra esse telefone" },
      { status: 404 }
    );
  }

  // Aplica no Chatwoot
  const result = await aplicarLabelsLnb(conversationId, contexto, { score });

  // Sincroniza no painel: grava labels_aplicadas[] em LNB - CRM
  const labelsApplied = labelsByContexto(contexto, score);
  let crmSync = false;
  if (labelsApplied.length > 0) {
    try {
      const supa = await createClient();
      const { data } = await supa.rpc("lnb_crm_add_label", {
        p_telefone: telefone,
        p_labels: labelsApplied,
      });
      const r = data as { ok: boolean };
      crmSync = !!r?.ok;
    } catch (e) {
      console.error("[n8n/aplicar-label] erro sync CRM:", e);
    }
  }

  return NextResponse.json({
    ok: true,
    telefone,
    conversation_id: conversationId,
    contexto,
    score,
    aplicado: result,
    labels: labelsApplied,
    crm_sync: crmSync,
  });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "POST /api/n8n/aplicar-label",
    body: {
      telefone: "...",
      contexto: CONTEXTOS_VALIDOS,
      score: "(opcional, pra labels de score)",
      conversation_id: "(opcional)",
    },
  });
}
