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
 * Fluxo:
 *   1. Tenta POST /conversations/{id}/funnel_mappings — cria o mapping
 *      Se já existe, retorna 200 com message "Conversa já está nesse stage"
 *   2. Se já tinha mapping em outro stage, faz POST .../move_stage
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
): Promise<{ ok: true; stage: LnbStage; mapping_id?: number } | { ok: false; error: string }> {
  const stageKey = STAGE_MAP[stage];
  if (!stageKey) {
    return { ok: false, error: `stage inválido: ${stage}` };
  }

  const token = adminToken();
  if (!token) {
    return { ok: false, error: "CHATWOOT_ADMIN_TOKEN não configurado" };
  }

  const baseUrl = `${base()}/api/v1/accounts/${accountId()}/conversations/${conversationId}/funnel_mappings`;
  const headers = {
    api_access_token: token,
    "Content-Type": "application/json",
  };

  try {
    // 1) Tenta criar o mapping (Lead inicial OU mover direto)
    const r = await fetch(baseUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        funnel_id: FUNNEL_ID_LNB,
        stage_name: stageKey,
      }),
    });

    if (r.ok) {
      const data = (await r.json()) as {
        success?: boolean;
        mapping?: { id: number; stage_name?: string };
      };
      const mappingStage = data.mapping?.stage_name;
      const mappingId = data.mapping?.id;

      // Se já estava em outro stage, faz move_stage
      if (mappingStage && mappingStage !== stageKey && mappingId) {
        const moveR = await fetch(`${baseUrl}/${mappingId}/move_stage`, {
          method: "POST",
          headers,
          body: JSON.stringify({ stage_name: stageKey }),
        });
        if (!moveR.ok) {
          const t = await moveR.text();
          return {
            ok: false,
            error: `move_stage falhou ${moveR.status}: ${t.slice(0, 200)}`,
          };
        }
      }
      return { ok: true, stage: stageKey, mapping_id: mappingId };
    }

    // Status não-OK: tenta entender e retornar erro
    const t = await r.text();
    return { ok: false, error: `Chatwoot ${r.status}: ${t.slice(0, 200)}` };
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
