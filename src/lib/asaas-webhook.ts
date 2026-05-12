/**
 * Validação de webhook do Asaas.
 *
 * O Asaas manda no header `asaas-access-token` o valor que você configurou
 * ao criar o webhook no painel. Validação é Bearer-like: comparação direta
 * em constant-time pra evitar timing attacks.
 *
 * Env: ASAAS_WEBHOOK_TOKEN
 *
 * Docs: https://docs.asaas.com/docs/sobre-os-webhooks
 */

import { timingSafeEqual } from "crypto";

interface VerifyResult {
  valid: boolean;
  reason?: string;
}

/**
 * Verifica o header asaas-access-token contra a env ASAAS_WEBHOOK_TOKEN.
 * Em dev (sem token configurado): permite (com warning).
 */
export function verifyAsaasWebhookToken(headerToken: string | null): VerifyResult {
  const expected = process.env.ASAAS_WEBHOOK_TOKEN;

  if (!expected) {
    if (process.env.NODE_ENV === "production") {
      return { valid: false, reason: "ASAAS_WEBHOOK_TOKEN não configurado no servidor" };
    }
    // Dev: aceita sem validar (log warning)
    console.warn("[asaas-webhook] ASAAS_WEBHOOK_TOKEN ausente em dev — aceitando sem validação");
    return { valid: true };
  }

  if (!headerToken) {
    return { valid: false, reason: "Header asaas-access-token ausente" };
  }

  // Comparação constant-time pra evitar timing attacks
  try {
    const a = Buffer.from(headerToken);
    const b = Buffer.from(expected);
    if (a.length !== b.length) {
      return { valid: false, reason: "Token com tamanho diferente" };
    }
    if (!timingSafeEqual(a, b)) {
      return { valid: false, reason: "Token inválido" };
    }
    return { valid: true };
  } catch (e) {
    return { valid: false, reason: `Erro de comparação: ${e}` };
  }
}

// ─── PAYLOAD ─────────────────────────────────────────────

export type AsaasWebhookEvent =
  | "PAYMENT_CREATED"
  | "PAYMENT_AUTHORIZED"
  | "PAYMENT_AWAITING_RISK_ANALYSIS"
  | "PAYMENT_APPROVED_BY_RISK_ANALYSIS"
  | "PAYMENT_REPROVED_BY_RISK_ANALYSIS"
  | "PAYMENT_UPDATED"
  | "PAYMENT_CONFIRMED"
  | "PAYMENT_RECEIVED"
  | "PAYMENT_CREDIT_CARD_CAPTURE_REFUSED"
  | "PAYMENT_ANTICIPATED"
  | "PAYMENT_OVERDUE"
  | "PAYMENT_DELETED"
  | "PAYMENT_RESTORED"
  | "PAYMENT_REFUNDED"
  | "PAYMENT_PARTIALLY_REFUNDED"
  | "PAYMENT_REFUND_IN_PROGRESS"
  | "PAYMENT_RECEIVED_IN_CASH_UNDONE"
  | "PAYMENT_CHARGEBACK_REQUESTED"
  | "PAYMENT_CHARGEBACK_DISPUTE"
  | "PAYMENT_AWAITING_CHARGEBACK_REVERSAL"
  | "PAYMENT_DUNNING_RECEIVED"
  | "PAYMENT_DUNNING_REQUESTED"
  | "PAYMENT_BANK_SLIP_VIEWED"
  | "PAYMENT_CHECKOUT_VIEWED";

export interface AsaasWebhookPayload {
  id: string; // evt_XXX
  event: AsaasWebhookEvent;
  dateCreated: string;
  payment: {
    id: string; // pay_XXX
    customer: string; // cus_XXX
    status: string;
    billingType: string;
    value: number;
    netValue: number;
    description?: string;
    externalReference?: string;
    paymentDate?: string | null;
    invoiceUrl?: string;
    invoiceNumber?: string;
    dueDate?: string;
  };
}

/**
 * Eventos que indicam pagamento efetivamente confirmado/recebido.
 * Pra cobrança LNB, qualquer um dos 2 dispara a entrega do serviço.
 */
export function isPaymentConfirmedEvent(event: AsaasWebhookEvent): boolean {
  return event === "PAYMENT_CONFIRMED" || event === "PAYMENT_RECEIVED";
}
