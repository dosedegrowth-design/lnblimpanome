/**
 * Envia anexo (PDF/imagem) pelo Chatwoot — entrega no WhatsApp do cliente.
 *
 * Padrão Chatwoot: POST multipart-form-data em
 *   /api/v1/accounts/{id}/conversations/{conv_id}/messages
 * com fields:
 *   - content: legenda
 *   - message_type: outgoing
 *   - attachments[]: arquivo (binary)
 */

function base() {
  return (
    process.env.NEXT_PUBLIC_CHATWOOT_BASE ||
    "https://dosedegrowthcrm.com.br"
  );
}

function botToken() {
  return process.env.CHATWOOT_TOKEN || "";
}

function adminToken() {
  return process.env.CHATWOOT_ADMIN_TOKEN || "";
}

function accountId() {
  return process.env.CHATWOOT_ACCOUNT_ID || "11";
}

/**
 * Envia anexo pra uma conversa existente.
 * @param conversationId ID da conversa Chatwoot
 * @param fileUrl URL pública do arquivo (PDF, imagem)
 * @param caption Texto que vai junto com o anexo
 * @param fileName Nome do arquivo (ex: "relatorio-cpf.pdf")
 */
export async function enviarAnexoChatwoot(
  conversationId: number,
  fileUrl: string,
  caption: string,
  fileName: string = "anexo.pdf"
): Promise<{ ok: true; messageId?: number } | { ok: false; error: string }> {
  // Bot token funciona pra mandar mensagem (admin token também serve)
  const token = botToken() || adminToken();
  if (!token) return { ok: false, error: "CHATWOOT_TOKEN não configurado" };

  try {
    // 1) Baixa o arquivo
    const fileResp = await fetch(fileUrl);
    if (!fileResp.ok) {
      return { ok: false, error: `Falha ao baixar ${fileUrl}: HTTP ${fileResp.status}` };
    }
    const fileBlob = await fileResp.blob();

    // 2) Monta multipart
    const form = new FormData();
    form.append("content", caption);
    form.append("message_type", "outgoing");
    form.append("private", "false");
    form.append("attachments[]", fileBlob, fileName);

    // 3) POST
    const url = `${base()}/api/v1/accounts/${accountId()}/conversations/${conversationId}/messages`;
    const r = await fetch(url, {
      method: "POST",
      headers: { api_access_token: token },
      body: form,
    });
    if (!r.ok) {
      const t = await r.text();
      return { ok: false, error: `Chatwoot ${r.status}: ${t.slice(0, 300)}` };
    }
    const data = (await r.json()) as { id?: number };
    return { ok: true, messageId: data.id };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

/**
 * Envia mensagem de texto simples pra uma conversa.
 * (versão simplificada pra mp-webhook chamar diretamente)
 */
export async function enviarTextoChatwoot(
  conversationId: number,
  texto: string
): Promise<{ ok: true; messageId?: number } | { ok: false; error: string }> {
  const token = botToken() || adminToken();
  if (!token) return { ok: false, error: "CHATWOOT_TOKEN não configurado" };

  try {
    const url = `${base()}/api/v1/accounts/${accountId()}/conversations/${conversationId}/messages`;
    const r = await fetch(url, {
      method: "POST",
      headers: {
        api_access_token: token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: texto,
        message_type: "outgoing",
        private: false,
      }),
    });
    if (!r.ok) {
      const t = await r.text();
      return { ok: false, error: `Chatwoot ${r.status}: ${t.slice(0, 200)}` };
    }
    const d = (await r.json()) as { id?: number };
    return { ok: true, messageId: d.id };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
