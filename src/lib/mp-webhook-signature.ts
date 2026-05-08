/**
 * Validação da assinatura secreta do Mercado Pago.
 *
 * MP envia 2 headers em cada notificação:
 * - x-signature: "ts=1742505477,v1=abc123def456..."
 * - x-request-id: "uuid-da-requisição"
 *
 * O algoritmo é HMAC-SHA256 sobre o template:
 *   id:{data.id};request-id:{x-request-id};ts:{ts}
 *
 * Usando como key a MP_WEBHOOK_SECRET (assinatura secreta do painel MP).
 *
 * Doc: https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
 */
import { createHmac, timingSafeEqual } from "node:crypto";

interface VerifyInput {
  /** Header x-signature da requisição */
  xSignature: string | null;
  /** Header x-request-id da requisição */
  xRequestId: string | null;
  /** ID do recurso (data.id ou query param `id`) */
  dataId: string | null;
}

interface VerifyResult {
  valid: boolean;
  reason?: string;
}

export function verifyMpWebhookSignature(input: VerifyInput): VerifyResult {
  const secret = process.env.MP_WEBHOOK_SECRET;

  // Em dev/sem secret configurado: aceita (mas loga warning).
  // Produção SEMPRE deve ter a secret.
  if (!secret) {
    console.warn(
      "[mp-webhook] MP_WEBHOOK_SECRET não configurado — aceitando sem validar (INSEGURO em prod)"
    );
    return { valid: true, reason: "no_secret_configured" };
  }

  const { xSignature, xRequestId, dataId } = input;

  if (!xSignature || !xRequestId || !dataId) {
    return { valid: false, reason: "missing_headers_or_id" };
  }

  // Parse "ts=...,v1=..."
  const parts = xSignature.split(",").map((p) => p.trim());
  let ts: string | null = null;
  let v1: string | null = null;
  for (const part of parts) {
    const [k, ...rest] = part.split("=");
    const v = rest.join("=");
    if (k === "ts") ts = v;
    else if (k === "v1") v1 = v;
  }

  if (!ts || !v1) {
    return { valid: false, reason: "invalid_signature_format" };
  }

  // Manifest exato exigido pelo MP
  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;

  const computed = createHmac("sha256", secret).update(manifest).digest("hex");

  // timingSafeEqual exige buffers do mesmo tamanho
  const a = Buffer.from(computed, "hex");
  const b = Buffer.from(v1, "hex");
  if (a.length !== b.length) {
    return { valid: false, reason: "length_mismatch" };
  }

  const equal = timingSafeEqual(a, b);
  return equal ? { valid: true } : { valid: false, reason: "hmac_mismatch" };
}
