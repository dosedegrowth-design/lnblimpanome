/**
 * Custom Attributes + Private Notes da conversa Chatwoot.
 *
 * Custom Attributes: campos que aparecem no PAINEL LATERAL do card ao abrir.
 *   Ex: pdf_url, valor_servico, score, qtd_pendencias
 *
 * Private Notes: comentários privados (só equipe vê) que ficam fixos.
 */

function base() {
  return process.env.NEXT_PUBLIC_CHATWOOT_BASE || "https://dosedegrowthcrm.com.br";
}
function token() {
  return process.env.CHATWOOT_ADMIN_TOKEN || process.env.CHATWOOT_TOKEN || "";
}
function accountId() {
  return process.env.CHATWOOT_ACCOUNT_ID || "11";
}

/**
 * Atualiza custom attributes da conversa.
 * O Chatwoot mostra esses campos no painel lateral direito do card.
 *
 * @param conversationId ID da conversa
 * @param attributes objeto com chaves/valores (qualquer string/number/bool)
 */
export async function setCustomAttributes(
  conversationId: number,
  attributes: Record<string, string | number | boolean | null>
): Promise<{ ok: true } | { ok: false; error: string }> {
  const tk = token();
  if (!tk) return { ok: false, error: "CHATWOOT_TOKEN/ADMIN não configurado" };

  try {
    const url = `${base()}/api/v1/accounts/${accountId()}/conversations/${conversationId}/custom_attributes`;
    const r = await fetch(url, {
      method: "POST",
      headers: { api_access_token: tk, "Content-Type": "application/json" },
      body: JSON.stringify({ custom_attributes: attributes }),
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
 * Cria private note (visível só pra equipe — cliente não vê).
 * Formato suporta markdown básico (**, links).
 */
export async function criarPrivateNote(
  conversationId: number,
  content: string
): Promise<{ ok: true; messageId?: number } | { ok: false; error: string }> {
  const tk = token();
  if (!tk) return { ok: false, error: "CHATWOOT_TOKEN/ADMIN não configurado" };

  try {
    const url = `${base()}/api/v1/accounts/${accountId()}/conversations/${conversationId}/messages`;
    const r = await fetch(url, {
      method: "POST",
      headers: { api_access_token: tk, "Content-Type": "application/json" },
      body: JSON.stringify({
        content,
        message_type: "outgoing",
        private: true, // KEY — vira nota privada
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

/**
 * Helper alto-nível: registra resultado da consulta no card do Chatwoot.
 * Aplica:
 * - Custom attributes (pdf_url, score, qtd_pendencias, total_dividas, etc)
 * - Private note explicativa
 */
export async function registrarConsultaNoCard(
  conversationId: number,
  data: {
    cpf: string;
    score?: number;
    tem_pendencia: boolean;
    qtd_pendencias?: number;
    total_dividas?: number;
    pdf_url?: string;
  }
) {
  // 1) Custom attributes — aparece no painel lateral
  await setCustomAttributes(conversationId, {
    cpf: data.cpf,
    score: data.score ?? "",
    status_consulta: data.tem_pendencia ? "tem_pendencia" : "nome_limpo",
    qtd_pendencias: data.qtd_pendencias ?? 0,
    total_dividas: data.total_dividas ? `R$ ${data.total_dividas.toFixed(2)}` : "R$ 0,00",
    pdf_url: data.pdf_url ?? "",
  });

  // 2) Private note resumida pra equipe
  const lines = [
    `📄 **Consulta de CPF concluída**`,
    `• CPF: ${data.cpf}`,
    `• Score: ${data.score ?? "?"}`,
    `• Status: ${data.tem_pendencia ? "❌ Negativado" : "✅ Limpo"}`,
  ];
  if (data.tem_pendencia) {
    lines.push(`• Pendências: ${data.qtd_pendencias} (R$ ${data.total_dividas?.toFixed(2)})`);
  }
  if (data.pdf_url) {
    lines.push(`• PDF: ${data.pdf_url}`);
  }
  await criarPrivateNote(conversationId, lines.join("\n"));

  return { ok: true };
}

/**
 * Helper: registra pagamento da limpeza no card.
 */
export async function registrarLimpezaPagaNoCard(
  conversationId: number,
  data: { cpf: string; valor: string; mp_id?: string }
) {
  await setCustomAttributes(conversationId, {
    limpeza_paga: "sim",
    limpeza_valor: data.valor,
    limpeza_mp_id: data.mp_id ?? "",
    limpeza_pago_em: new Date().toISOString(),
  });
  await criarPrivateNote(
    conversationId,
    `🎉 **Limpeza CONTRATADA**\n• Valor: ${data.valor}\n• CPF: ${data.cpf}\n• MP ID: ${data.mp_id ?? "?"}\n\n*Equipe deve iniciar o processo em até 4h úteis.*`
  );
  return { ok: true };
}
