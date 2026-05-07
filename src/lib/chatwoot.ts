/**
 * Chatwoot — disparo de mensagem no WhatsApp.
 *
 * Fluxo:
 * 1) Busca contato pelo telefone (cria se não existir)
 * 2) Busca conversa existente (cria se não existir)
 * 3) Envia mensagem
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
    // Prefer payload[0].id direto; fallback pra messages[0].conversation_id
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
  initialMessage?: string
): Promise<ChatwootConversation | null> {
  try {
    const body: Record<string, unknown> = {
      source_id: `lnb-${contactId}-${Date.now()}`,
      inbox_id: Number(inboxId()),
      contact_id: contactId,
      status: "open",
    };
    if (initialMessage) {
      body.message = { content: initialMessage };
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

/**
 * Envia mensagem WhatsApp pro cliente.
 * Cria contato + conversa se não existirem. Se mesmo assim falhar,
 * retorna { ok: false } e não bloqueia o fluxo (email continua sendo enviado).
 */
export async function sendWhatsApp(
  telefone: string,
  texto: string,
  nome?: string
): Promise<{ ok: true; conversationId: number } | { ok: false; error: string }> {
  if (!token()) {
    return { ok: false, error: "CHATWOOT_TOKEN não configurado" };
  }

  // 1) Contato (busca; cria se não existir)
  let contact = await searchContact(telefone);
  if (!contact) {
    contact = await createContact(telefone, nome);
    if (!contact) {
      return { ok: false, error: "Falha ao buscar/criar contato no Chatwoot" };
    }
  }

  // 2) Conversa (busca; cria com mensagem inicial se não existir)
  let conv = await getExistingConversation(contact.id);
  if (!conv) {
    conv = await createConversation(contact.id, texto);
    if (!conv) {
      return { ok: false, error: "Falha ao criar conversa no Chatwoot" };
    }
    // Conversa criada já com a mensagem — não precisa enviar de novo
    return { ok: true, conversationId: conv.id };
  }

  // 3) Mensagem em conversa existente
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
