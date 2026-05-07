/**
 * Chatwoot — disparo de mensagem no WhatsApp.
 *
 * Fluxo:
 * 1) Busca contato pelo telefone
 * 2) Pega/cria conversa
 * 3) Envia mensagem
 *
 * Usa env CHATWOOT_TOKEN, CHATWOOT_ACCOUNT_ID, NEXT_PUBLIC_CHATWOOT_BASE,
 * CHATWOOT_INBOX_ID (opcional — pra criar conversa se não existir).
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

async function getOrCreateConversation(
  contactId: number
): Promise<ChatwootConversation | null> {
  try {
    const data = (await api(`/contacts/${contactId}/conversations`)) as {
      payload: { messages?: { conversation_id: number }[] }[];
    };
    const convId = data.payload?.[0]?.messages?.[0]?.conversation_id;
    if (convId) return { id: convId, status: "open" };
  } catch (e) {
    console.error("[chatwoot] get conversation erro:", e);
  }
  return null;
}

/**
 * Envia mensagem WhatsApp pro cliente.
 * Se contato/conversa não existir, retorna { ok: false } silenciosamente
 * (não bloqueia o fluxo de email — só loga).
 */
export async function sendWhatsApp(
  telefone: string,
  texto: string
): Promise<{ ok: true; conversationId: number } | { ok: false; error: string }> {
  if (!token()) {
    return { ok: false, error: "CHATWOOT_TOKEN não configurado" };
  }

  const contact = await searchContact(telefone);
  if (!contact) {
    return { ok: false, error: "Contato não encontrado no Chatwoot" };
  }

  const conv = await getOrCreateConversation(contact.id);
  if (!conv) {
    return { ok: false, error: "Conversa não encontrada — cliente precisa enviar primeira mensagem" };
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
