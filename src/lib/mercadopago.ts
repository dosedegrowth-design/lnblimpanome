/**
 * Mercado Pago client server-side.
 * Usa MP_ACCESS_TOKEN (produção) ou MP_ACCESS_TOKEN_TEST (sandbox).
 *
 * Documentação: https://www.mercadopago.com.br/developers/pt/reference/preferences/_checkout_preferences/post
 */

const MP_API = "https://api.mercadopago.com";

function token(): string {
  const t = process.env.MP_ACCESS_TOKEN;
  if (!t) throw new Error("MP_ACCESS_TOKEN não definido");
  return t;
}

interface CreatePreferenceInput {
  title: string;
  unitPrice: number;
  externalReference: string;
  payer: { name: string; email: string; cpf: string; phone?: string };
  metadata: Record<string, string | number>;
  notificationUrl: string;
  successUrl: string;
  failureUrl: string;
  pendingUrl: string;
}

export interface MPPreference {
  id: string;
  init_point: string;
  sandbox_init_point: string;
  external_reference: string;
}

export async function createPreference(i: CreatePreferenceInput): Promise<MPPreference> {
  const r = await fetch(`${MP_API}/checkout/preferences`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      items: [
        {
          id: i.externalReference,
          title: i.title,
          quantity: 1,
          unit_price: i.unitPrice,
          currency_id: "BRL",
        },
      ],
      external_reference: i.externalReference,
      notification_url: i.notificationUrl,
      payer: {
        name: i.payer.name,
        email: i.payer.email,
        identification: { type: "CPF", number: i.payer.cpf },
        ...(i.payer.phone ? { phone: { area_code: i.payer.phone.slice(0, 2), number: i.payer.phone.slice(2) } } : {}),
      },
      back_urls: {
        success: i.successUrl,
        failure: i.failureUrl,
        pending: i.pendingUrl,
      },
      auto_return: "approved",
      metadata: i.metadata,
    }),
  });

  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Mercado Pago erro ${r.status}: ${t}`);
  }
  return (await r.json()) as MPPreference;
}

export interface MPPayment {
  id: number;
  status: "pending" | "approved" | "authorized" | "in_process" | "rejected" | "refunded" | "cancelled";
  status_detail: string;
  external_reference: string;
  payer: {
    email: string;
    first_name?: string;
    last_name?: string;
    identification?: { type: string; number: string };
  };
  metadata: Record<string, string | number>;
  transaction_amount: number;
  date_approved: string | null;
  date_created: string;
}

export async function getPayment(paymentId: string | number): Promise<MPPayment> {
  const r = await fetch(`${MP_API}/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${token()}` },
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Mercado Pago erro ${r.status}: ${t}`);
  }
  return (await r.json()) as MPPayment;
}
