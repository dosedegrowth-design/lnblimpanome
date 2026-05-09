/**
 * Chatwoot Kanban — mover conversa entre stages do funil.
 *
 * Usa CHATWOOT_ADMIN_TOKEN (token de usuário admin), porque o
 * endpoint de funnels não aceita bot token.
 *
 * Funil LNB Account 11:
 *   id: 1
 *   nome: "Limpeza de Nome"
 *   stages: lead | interessado | qualificado | fechado | perdido
 */

const FUNNEL_ID_LNB = 1;

export type LnbStage =
  | "lead"
  | "interessado"
  | "qualificado"
  | "fechado"
  | "perdido";

const STAGE_MAP: Record<string, LnbStage> = {
  Lead: "lead",
  Interessado: "interessado",
  Qualificado: "qualificado",
  Fechado: "fechado",
  Perdido: "perdido",
  // case-insensitive variations
  lead: "lead",
  interessado: "interessado",
  qualificado: "qualificado",
  fechado: "fechado",
  perdido: "perdido",
};

function base() {
  return (
    process.env.NEXT_PUBLIC_CHATWOOT_BASE ||
    "https://dosedegrowthcrm.com.br"
  );
}

function adminToken() {
  return (
    process.env.CHATWOOT_ADMIN_TOKEN ||
    process.env.CHATWOOT_TOKEN ||
    ""
  );
}

function accountId() {
  return process.env.CHATWOOT_ACCOUNT_ID || "11";
}

/**
 * Move uma conversation pra um stage específico do funil "Limpeza de Nome".
 *
 * @param conversationId ID da conversa no Chatwoot
 * @param stage Lead | Interessado | Qualificado | Fechado | Perdido
 *              (aceita variações case-insensitive)
 *
 * @returns { ok: true } ou { ok: false, error }
 */
export async function moverKanbanStage(
  conversationId: number,
  stage: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const stageKey = STAGE_MAP[stage];
  if (!stageKey) {
    return { ok: false, error: `stage inválido: ${stage}` };
  }

  const token = adminToken();
  if (!token) {
    return {
      ok: false,
      error: "CHATWOOT_ADMIN_TOKEN não configurado",
    };
  }

  try {
    const url = `${base()}/api/v1/accounts/${accountId()}/conversations/${conversationId}`;
    const r = await fetch(url, {
      method: "PATCH",
      headers: {
        api_access_token: token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        funnel_id: FUNNEL_ID_LNB,
        funnel_stage: stageKey,
      }),
    });

    if (!r.ok) {
      const t = await r.text();
      return {
        ok: false,
        error: `Chatwoot ${r.status}: ${t.slice(0, 200)}`,
      };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

/**
 * Helper: dado um telefone, busca o ID da conversa mais recente.
 * Usado quando o n8n manda só o telefone (sem conversation_id).
 */
export async function buscarConversationIdPorTelefone(
  telefone: string
): Promise<number | null> {
  const token = adminToken();
  if (!token) return null;

  const phone = telefone.replace(/\D/g, "");
  try {
    const r = await fetch(
      `${base()}/api/v1/accounts/${accountId()}/contacts/search?q=${phone}`,
      {
        headers: { api_access_token: token },
      }
    );
    if (!r.ok) return null;
    const data = (await r.json()) as { payload?: Array<{ id: number }> };
    const contactId = data.payload?.[0]?.id;
    if (!contactId) return null;

    // Busca conversas do contato
    const r2 = await fetch(
      `${base()}/api/v1/accounts/${accountId()}/contacts/${contactId}/conversations`,
      {
        headers: { api_access_token: token },
      }
    );
    if (!r2.ok) return null;
    const cd = (await r2.json()) as {
      payload?: Array<{ id: number }>;
    };
    return cd.payload?.[0]?.id ?? null;
  } catch (e) {
    console.error("[chatwoot-kanban] buscar conv erro:", e);
    return null;
  }
}
