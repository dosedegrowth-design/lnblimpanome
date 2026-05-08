/**
 * Chatwoot — disparo de mensagem no WhatsApp.
 *
 * IMPORTANTE: WhatsApp Cloud API (Meta) tem 2 modos:
 *
 * A) Janela 24h aberta — cliente já mandou msg recentemente
 *    Pode mandar texto livre. Use sendWhatsApp(telefone, texto)
 *
 * B) Janela 24h fechada (ou nunca abriu) — só TEMPLATE pré-aprovado
 *    Use sendWhatsAppTemplate(telefone, templateName, params)
 *    Templates precisam ser criados e aprovados no Meta Business Manager.
 *
 * Fluxo:
 * 1) Busca contato pelo telefone (cria se não existir)
 * 2) Busca conversa existente (cria se não existir)
 * 3) Envia mensagem (texto livre OU template)
 *
 * ENV vars:
 * - CHATWOOT_TOKEN          (obrigatório, api_access_token)
 * - CHATWOOT_ACCOUNT_ID     (default: 11)
 * - CHATWOOT_INBOX_ID       (default: 12 — Inbox WhatsApp LNB)
 * - NEXT_PUBLIC_CHATWOOT_BASE (default: https://dosedegrowthcrm.com.br)
 */

function base() {
  return process.env.NEXT_PUBLIC_CHATWOOT_BASE || "https://dosedegrowthcrm.com.br";
}

function token() {
  return process.env.CHATWOOT_TOKEN || "";
}

function accountId() {
  return process.env.CHATWOOT_ACCOUNT_ID || "11";
}

function inboxId() {
  return process.env.CHATWOOT_INBOX_ID || "12";
}

interface ChatwootContact {
  id: number;
  name: string;
  phone_number: string | null;
}

interface ChatwootConversation {
  id: number;
  status: string;
}

async function api(path: string, init?: RequestInit) {
  const url = `${base()}/api/v1/accounts/${accountId()}${path}`;
  const r = await fetch(url, {
    ...init,
    headers: {
      "api_access_token": token(),
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Chatwoot ${r.status}: ${t}`);
  }
  return r.json();
}

async function searchContact(telefone: string): Promise<ChatwootContact | null> {
  try {
    const phone = telefone.replace(/\D/g, "");
    const data = (await api(`/contacts/search?q=${phone}`)) as {
      payload: ChatwootContact[];
    };
    return data.payload?.[0] || null;
  } catch (e) {
    console.error("[chatwoot] search contact erro:", e);
    return null;
  }
}

async function createContact(
  telefone: string,
  nome?: string
): Promise<ChatwootContact | null> {
  try {
    const phone = telefone.replace(/\D/g, "");
    const phoneE164 = phone.startsWith("55") ? `+${phone}` : `+55${phone}`;
    const data = (await api(`/contacts`, {
      method: "POST",
      body: JSON.stringify({
        inbox_id: Number(inboxId()),
        name: nome || `Cliente ${phone}`,
        phone_number: phoneE164,
      }),
    })) as { payload: { contact: ChatwootContact } };
    return data.payload?.contact || null;
  } catch (e) {
    console.error("[chatwoot] create contact erro:", e);
    return null;
  }
}

async function getExistingConversation(
  contactId: number
): Promise<ChatwootConversation | null> {
  try {
    const data = (await api(`/contacts/${contactId}/conversations`)) as {
      payload: { messages?: { conversation_id: number }[]; id?: number; status?: string }[];
    };
    const first = data.payload?.[0];
    if (first?.id) return { id: first.id, status: first.status || "open" };
    const convId = first?.messages?.[0]?.conversation_id;
    if (convId) return { id: convId, status: "open" };
  } catch (e) {
    console.error("[chatwoot] get conversation erro:", e);
  }
  return null;
}

async function createConversation(
  contactId: number,
  options?: {
    initialContent?: string;
    template?: TemplateMessage;
  }
): Promise<ChatwootConversation | null> {
  try {
    const body: Record<string, unknown> = {
      source_id: `lnb-${contactId}-${Date.now()}`,
      inbox_id: Number(inboxId()),
      contact_id: contactId,
      status: "open",
    };
    if (options?.template) {
      body.message = templateBody(options.template);
    } else if (options?.initialContent) {
      body.message = { content: options.initialContent };
    }
    const data = (await api(`/conversations`, {
      method: "POST",
      body: JSON.stringify(body),
    })) as ChatwootConversation;
    return data;
  } catch (e) {
    console.error("[chatwoot] create conversation erro:", e);
    return null;
  }
}

// ────────────────────────────────────────────────────────────
// Templates WhatsApp (Cloud API via Chatwoot)
// ────────────────────────────────────────────────────────────

export interface TemplateMessage {
  /** Nome exato do template aprovado no Meta Business Manager */
  name: string;
  /** Código de idioma do template (ex: "pt_BR", "en_US") */
  language: string;
  /** Parâmetros nas posições {{1}}, {{2}}, ... do corpo do template */
  parameters?: string[];
}

function templateBody(t: TemplateMessage) {
  return {
    content: "",
    template_params: {
      name: t.name,
      category: "UTILITY",
      language: t.language,
      processed_params: (t.parameters || []).reduce<Record<string, string>>(
        (acc, val, idx) => {
          acc[String(idx + 1)] = val;
          return acc;
        },
        {}
      ),
    },
  };
}

/**
 * Envia template WhatsApp aprovado (funciona MESMO sem janela 24h aberta).
 * Use pra mensagens proativas: notificação de pagamento, mudança de etapa, etc.
 */
export async function sendWhatsAppTemplate(
  telefone: string,
  template: TemplateMessage,
  nome?: string
): Promise<{ ok: true; conversationId: number } | { ok: false; error: string }> {
  if (!token()) {
    return { ok: false, error: "CHATWOOT_TOKEN não configurado" };
  }

  let contact = await searchContact(telefone);
  if (!contact) {
    contact = await createContact(telefone, nome);
    if (!contact) {
      return { ok: false, error: "Falha ao buscar/criar contato no Chatwoot" };
    }
  }

  let conv = await getExistingConversation(contact.id);
  if (!conv) {
    conv = await createConversation(contact.id, { template });
    if (!conv) {
      return { ok: false, error: "Falha ao criar conversa no Chatwoot" };
    }
    return { ok: true, conversationId: conv.id };
  }

  try {
    await api(`/conversations/${conv.id}/messages`, {
      method: "POST",
      body: JSON.stringify({
        ...templateBody(template),
        message_type: "outgoing",
        private: false,
      }),
    });
    return { ok: true, conversationId: conv.id };
  } catch (e) {
    console.error("[chatwoot] send template erro:", e);
    return { ok: false, error: String(e) };
  }
}

/**
 * Envia mensagem WhatsApp em texto livre.
 * SÓ funciona dentro da janela 24h (cliente mandou msg recentemente).
 * Fora da janela, o Meta REJEITA. Use sendWhatsAppTemplate nesse caso.
 */
export async function sendWhatsApp(
  telefone: string,
  texto: string,
  nome?: string
): Promise<{ ok: true; conversationId: number } | { ok: false; error: string }> {
  if (!token()) {
    return { ok: false, error: "CHATWOOT_TOKEN não configurado" };
  }

  let contact = await searchContact(telefone);
  if (!contact) {
    contact = await createContact(telefone, nome);
    if (!contact) {
      return { ok: false, error: "Falha ao buscar/criar contato no Chatwoot" };
    }
  }

  let conv = await getExistingConversation(contact.id);
  if (!conv) {
    conv = await createConversation(contact.id, { initialContent: texto });
    if (!conv) {
      return { ok: false, error: "Falha ao criar conversa no Chatwoot" };
    }
    return { ok: true, conversationId: conv.id };
  }

  try {
    await api(`/conversations/${conv.id}/messages`, {
      method: "POST",
      body: JSON.stringify({
        content: texto,
        message_type: "outgoing",
        private: false,
      }),
    });
    return { ok: true, conversationId: conv.id };
  } catch (e) {
    console.error("[chatwoot] send message erro:", e);
    return { ok: false, error: String(e) };
  }
}
