/**
 * Aplicar labels (etiquetas) numa conversa do Chatwoot.
 *
 * Padrão LNB Account 11 — usa CHATWOOT_ADMIN_TOKEN porque o endpoint
 * /labels não aceita bot token.
 *
 * Labels disponíveis (criadas via API em 2026):
 *
 * SERVIÇO:
 * - consulta-cpf, limpeza-nome, blindagem-mensal
 *
 * STATUS PAGAMENTO:
 * - aguardando-pagamento, pago-consulta, pago-limpeza, pago-blindagem
 *
 * RESULTADO CONSULTA:
 * - tem-pendencia, nome-limpo
 * - score-bom (>=700), score-regular (500-699), score-baixo (<500)
 *
 * OPERACIONAIS:
 * - origem-whatsapp, origem-site, conflito, vip
 */

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
 * Adiciona labels a uma conversa.
 * Chatwoot é PATCH-like: você sempre passa a lista FINAL desejada.
 * Pra adicionar sem perder existentes, use addLabels (que faz GET + merge).
 */
export async function setLabels(
  conversationId: number,
  labels: string[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  const token = adminToken();
  if (!token) return { ok: false, error: "CHATWOOT_ADMIN_TOKEN não configurado" };

  try {
    const url = `${base()}/api/v1/accounts/${accountId()}/conversations/${conversationId}/labels`;
    const r = await fetch(url, {
      method: "POST",
      headers: {
        api_access_token: token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ labels }),
    });
    if (!r.ok) {
      const t = await r.text();
      return { ok: false, error: `Chatwoot ${r.status}: ${t.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

/**
 * Adiciona labels SEM remover as existentes (faz merge).
 */
export async function addLabels(
  conversationId: number,
  labelsToAdd: string[]
): Promise<{ ok: true; final: string[] } | { ok: false; error: string }> {
  const token = adminToken();
  if (!token) return { ok: false, error: "CHATWOOT_ADMIN_TOKEN não configurado" };

  try {
    // 1) GET labels atuais
    const url = `${base()}/api/v1/accounts/${accountId()}/conversations/${conversationId}/labels`;
    const rGet = await fetch(url, { headers: { api_access_token: token } });
    let existing: string[] = [];
    if (rGet.ok) {
      const d = (await rGet.json()) as { payload?: string[] };
      existing = d.payload || [];
    }

    // 2) Merge
    const merged = Array.from(new Set([...existing, ...labelsToAdd]));

    // 3) POST merged
    const r = await fetch(url, {
      method: "POST",
      headers: {
        api_access_token: token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ labels: merged }),
    });
    if (!r.ok) {
      const t = await r.text();
      return { ok: false, error: `Chatwoot ${r.status}: ${t.slice(0, 200)}` };
    }
    return { ok: true, final: merged };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

/**
 * Remove labels específicas mantendo as outras.
 */
export async function removeLabels(
  conversationId: number,
  labelsToRemove: string[]
): Promise<{ ok: true; final: string[] } | { ok: false; error: string }> {
  const token = adminToken();
  if (!token) return { ok: false, error: "CHATWOOT_ADMIN_TOKEN não configurado" };

  try {
    const url = `${base()}/api/v1/accounts/${accountId()}/conversations/${conversationId}/labels`;
    const rGet = await fetch(url, { headers: { api_access_token: token } });
    let existing: string[] = [];
    if (rGet.ok) {
      const d = (await rGet.json()) as { payload?: string[] };
      existing = d.payload || [];
    }

    const filtered = existing.filter((l) => !labelsToRemove.includes(l));

    const r = await fetch(url, {
      method: "POST",
      headers: {
        api_access_token: token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ labels: filtered }),
    });
    if (!r.ok) {
      const t = await r.text();
      return { ok: false, error: `Chatwoot ${r.status}: ${t.slice(0, 200)}` };
    }
    return { ok: true, final: filtered };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

/**
 * Helper: aplica labels automaticamente baseado no contexto de venda.
 *
 * Cenários:
 * - "interessado_consulta" → adiciona consulta-cpf + aguardando-pagamento
 * - "pago_consulta" → remove aguardando + adiciona pago-consulta
 * - "consulta_resultado_com_pendencia" → adiciona tem-pendencia + score-{faixa}
 * - "consulta_resultado_sem_pendencia" → adiciona nome-limpo + score-{faixa}
 * - "interessado_limpeza" → adiciona limpeza-nome + aguardando-pagamento
 * - "pago_limpeza" → remove aguardando + adiciona pago-limpeza (Fechado)
 * - "interessado_blindagem" → adiciona blindagem-mensal + aguardando-pagamento
 * - "pago_blindagem" → remove aguardando + adiciona pago-blindagem
 * - "conflito" → adiciona conflito
 */
export type LnbLabelContext =
  | "interessado_consulta"
  | "pago_consulta"
  | "consulta_resultado_com_pendencia"
  | "consulta_resultado_sem_pendencia"
  | "interessado_limpeza"
  | "pago_limpeza"
  | "interessado_blindagem"
  | "pago_blindagem"
  | "conflito"
  | "origem_whatsapp"
  | "origem_site"
  | "vip";

export async function aplicarLabelsLnb(
  conversationId: number,
  contexto: LnbLabelContext,
  extras: { score?: number; origem?: "whatsapp" | "site" } = {}
) {
  const adicionar: string[] = [];
  const remover: string[] = [];

  switch (contexto) {
    case "interessado_consulta":
      adicionar.push("consulta-cpf", "aguardando-pagamento");
      break;
    case "pago_consulta":
      remover.push("aguardando-pagamento");
      adicionar.push("pago-consulta");
      break;
    case "consulta_resultado_com_pendencia":
      adicionar.push("tem-pendencia");
      if (typeof extras.score === "number") {
        if (extras.score >= 700) adicionar.push("score-bom");
        else if (extras.score >= 500) adicionar.push("score-regular");
        else adicionar.push("score-baixo");
      }
      break;
    case "consulta_resultado_sem_pendencia":
      adicionar.push("nome-limpo");
      if (typeof extras.score === "number") {
        if (extras.score >= 700) adicionar.push("score-bom");
        else if (extras.score >= 500) adicionar.push("score-regular");
        else adicionar.push("score-baixo");
      }
      break;
    case "interessado_limpeza":
      adicionar.push("limpeza-nome", "aguardando-pagamento");
      break;
    case "pago_limpeza":
      remover.push("aguardando-pagamento");
      adicionar.push("pago-limpeza");
      break;
    case "interessado_blindagem":
      adicionar.push("blindagem-mensal", "aguardando-pagamento");
      break;
    case "pago_blindagem":
      remover.push("aguardando-pagamento");
      adicionar.push("pago-blindagem");
      break;
    case "conflito":
      adicionar.push("conflito");
      break;
    case "origem_whatsapp":
      adicionar.push("origem-whatsapp");
      break;
    case "origem_site":
      adicionar.push("origem-site");
      break;
    case "vip":
      adicionar.push("vip");
      break;
  }

  if (remover.length) await removeLabels(conversationId, remover);
  if (adicionar.length) await addLabels(conversationId, adicionar);

  return { ok: true, adicionou: adicionar, removeu: remover };
}
