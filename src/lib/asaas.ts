/**
 * Asaas client server-side.
 * Substitui o Mercado Pago como gateway de pagamento da LNB.
 *
 * Docs:
 * - https://docs.asaas.com/reference/criar-nova-cobranca
 * - https://docs.asaas.com/reference/criar-novo-cliente
 * - https://docs.asaas.com/docs/webhook-para-cobrancas
 *
 * Envs:
 * - ASAAS_API_KEY   (obrigatório, formato $aact_XXX)
 * - ASAAS_ENV       ("production" ou "sandbox", default sandbox)
 */

const BASE_PROD = "https://api.asaas.com/v3";
const BASE_SANDBOX = "https://api-sandbox.asaas.com/v3";

function baseUrl() {
  const env = (process.env.ASAAS_ENV || "sandbox").toLowerCase();
  return env === "production" ? BASE_PROD : BASE_SANDBOX;
}

function apiKey(): string {
  const k = process.env.ASAAS_API_KEY;
  if (!k) throw new Error("ASAAS_API_KEY não definido");
  return k;
}

function authHeaders(): Record<string, string> {
  // Asaas usa header `access_token`, NÃO Bearer
  return {
    access_token: apiKey(),
    "Content-Type": "application/json",
    "User-Agent": "LNB-Painel/1.0",
  };
}

// ─── TIPOS ──────────────────────────────────────────────

export interface AsaasCustomer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  mobilePhone?: string;
  cpfCnpj?: string;
  externalReference?: string;
}

export type AsaasBillingType = "PIX" | "CREDIT_CARD" | "BOLETO" | "UNDEFINED";

export type AsaasPaymentStatus =
  | "PENDING"
  | "AWAITING_RISK_ANALYSIS"
  | "AUTHORIZED"
  | "CONFIRMED"
  | "RECEIVED"
  | "RECEIVED_IN_CASH"
  | "OVERDUE"
  | "REFUNDED"
  | "REFUND_REQUESTED"
  | "CHARGEBACK_REQUESTED"
  | "CHARGEBACK_DISPUTE"
  | "AWAITING_CHARGEBACK_REVERSAL"
  | "DUNNING_REQUESTED"
  | "DUNNING_RECEIVED"
  | "AWAITING_RISK_ANALYSIS_DECISION";

export interface AsaasPayment {
  id: string; // pay_XXX
  customer: string; // cus_XXX
  status: AsaasPaymentStatus;
  billingType: AsaasBillingType;
  value: number;
  netValue: number;
  dueDate: string;
  paymentDate: string | null;
  description?: string;
  externalReference?: string;
  invoiceUrl: string; // URL pra cliente pagar (checkout hospedado)
  bankSlipUrl?: string; // URL boleto
  invoiceNumber?: string;
  pixTransaction?: string | null;
  installmentCount?: number;
}

// ─── CUSTOMERS ──────────────────────────────────────────

interface CreateCustomerInput {
  name: string;
  cpfCnpj: string;
  email?: string;
  mobilePhone?: string;
  externalReference?: string;
}

/**
 * Busca cliente por CPF/CNPJ (Asaas exige customer antes de payment).
 * Retorna null se não existir.
 */
export async function findCustomerByCpfCnpj(cpfCnpj: string): Promise<AsaasCustomer | null> {
  const c = cpfCnpj.replace(/\D/g, "");
  const r = await fetch(`${baseUrl()}/customers?cpfCnpj=${c}&limit=1`, {
    headers: authHeaders(),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Asaas findCustomer erro ${r.status}: ${t}`);
  }
  const d = (await r.json()) as { data?: AsaasCustomer[] };
  return d.data?.[0] || null;
}

/**
 * Cria customer no Asaas.
 */
export async function createCustomer(i: CreateCustomerInput): Promise<AsaasCustomer> {
  const r = await fetch(`${baseUrl()}/customers`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      name: i.name,
      cpfCnpj: i.cpfCnpj.replace(/\D/g, ""),
      email: i.email,
      mobilePhone: i.mobilePhone?.replace(/\D/g, ""),
      externalReference: i.externalReference,
      notificationDisabled: false, // Asaas manda email automático tbm (fica como backup)
    }),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Asaas createCustomer erro ${r.status}: ${t}`);
  }
  return (await r.json()) as AsaasCustomer;
}

/**
 * Helper: busca ou cria customer.
 */
export async function findOrCreateCustomer(i: CreateCustomerInput): Promise<AsaasCustomer> {
  const existing = await findCustomerByCpfCnpj(i.cpfCnpj);
  if (existing) return existing;
  return createCustomer(i);
}

// ─── PAYMENTS ───────────────────────────────────────────

interface CreatePaymentInput {
  customerId: string; // cus_XXX
  value: number;
  description: string;
  externalReference: string;
  /**
   * UNDEFINED = checkout aberto (cliente escolhe PIX/cartão/boleto).
   * Recomendado pra LNB.
   */
  billingType?: AsaasBillingType;
  /** Data de vencimento (default: +3 dias) */
  dueDate?: string;
  /** Notificação webhook recebe successUrl pra redirecionar pós-pagamento */
  successUrl?: string;
  /** Cartão: parcelas */
  installmentCount?: number;
  totalValue?: number;
}

/**
 * Cria cobrança no Asaas. Retorna o payment com invoiceUrl
 * (link hospedado onde o cliente paga).
 */
export async function createPayment(i: CreatePaymentInput): Promise<AsaasPayment> {
  // Default dueDate +3 dias (PIX geralmente paga na hora, mas se for boleto precisa de prazo)
  const dueDate = i.dueDate || (() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().slice(0, 10);
  })();

  const body: Record<string, unknown> = {
    customer: i.customerId,
    billingType: i.billingType || "UNDEFINED",
    value: Math.round(i.value * 100) / 100, // garante 2 casas decimais
    dueDate,
    description: i.description.slice(0, 500),
    externalReference: i.externalReference,
  };

  if (i.installmentCount && i.installmentCount > 1) {
    body.installmentCount = i.installmentCount;
    body.totalValue = i.totalValue || i.value;
  }

  if (i.successUrl) {
    body.callback = {
      successUrl: i.successUrl,
      autoRedirect: true,
    };
  }

  const r = await fetch(`${baseUrl()}/payments`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Asaas createPayment erro ${r.status}: ${t}`);
  }
  return (await r.json()) as AsaasPayment;
}

/**
 * Consulta payment por ID (após webhook).
 */
export async function getPayment(paymentId: string): Promise<AsaasPayment> {
  const r = await fetch(`${baseUrl()}/payments/${paymentId}`, {
    headers: authHeaders(),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Asaas getPayment erro ${r.status}: ${t}`);
  }
  return (await r.json()) as AsaasPayment;
}

// ─── HELPERS DE INTEGRAÇÃO ──────────────────────────────

export interface CriarCobrancaLNBInput {
  cpf: string;
  nome: string;
  email: string;
  telefone?: string;
  valor: number;
  descricao: string;
  externalReference: string;
  successUrl?: string;
}

export interface CriarCobrancaLNBResult {
  paymentId: string; // pay_XXX
  customerId: string; // cus_XXX
  invoiceUrl: string; // URL hospedada onde cliente paga (PIX + cartão + boleto)
  status: AsaasPaymentStatus;
  externalReference: string;
}

/**
 * Helper end-to-end: busca/cria customer + cria payment + retorna invoiceUrl.
 * Substitui drop-in o `createPreference` do Mercado Pago.
 */
export async function criarCobrancaLNB(
  i: CriarCobrancaLNBInput
): Promise<CriarCobrancaLNBResult> {
  const customer = await findOrCreateCustomer({
    name: i.nome,
    cpfCnpj: i.cpf,
    email: i.email,
    mobilePhone: i.telefone,
    externalReference: i.cpf,
  });

  const payment = await createPayment({
    customerId: customer.id,
    value: i.valor,
    description: i.descricao,
    externalReference: i.externalReference,
    billingType: "UNDEFINED", // cliente escolhe PIX/cartão/boleto no checkout Asaas
    successUrl: i.successUrl,
  });

  return {
    paymentId: payment.id,
    customerId: customer.id,
    invoiceUrl: payment.invoiceUrl,
    status: payment.status,
    externalReference: payment.externalReference || i.externalReference,
  };
}

/**
 * Verifica se um status do Asaas significa pagamento aprovado/recebido.
 * Asaas tem 2 status "ok": CONFIRMED (processado mas saldo a liberar)
 * e RECEIVED (saldo já disponível). Pra UX do cliente, ambos servem.
 */
export function isPaymentApproved(status: AsaasPaymentStatus): boolean {
  return status === "CONFIRMED" || status === "RECEIVED" || status === "RECEIVED_IN_CASH";
}

// ─── ASSINATURAS (SUBSCRIPTIONS) ──────────────────────────────

export interface AsaasSubscription {
  id: string;
  customer: string;
  value: number;
  cycle: "MONTHLY" | "YEARLY";
  status: "ACTIVE" | "INACTIVE" | "EXPIRED";
  nextDueDate: string;
  description?: string;
  externalReference?: string;
}

interface CriarAssinaturaInput {
  customerId: string;
  value: number;
  cycle: "MONTHLY" | "YEARLY";
  description: string;
  externalReference?: string;
  billingType?: AsaasBillingType;
  nextDueDate?: string; // YYYY-MM-DD
}

export async function createSubscription(i: CriarAssinaturaInput): Promise<AsaasSubscription> {
  const nextDue = i.nextDueDate || (() => {
    const d = new Date();
    d.setDate(d.getDate() + 7); // primeira cobrança em 7 dias por padrão
    return d.toISOString().slice(0, 10);
  })();

  const r = await fetch(`${baseUrl()}/subscriptions`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      customer: i.customerId,
      billingType: i.billingType ?? "CREDIT_CARD",
      value: i.value,
      cycle: i.cycle,
      description: i.description,
      externalReference: i.externalReference,
      nextDueDate: nextDue,
    }),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Asaas createSubscription erro ${r.status}: ${t}`);
  }
  return (await r.json()) as AsaasSubscription;
}

interface CriarAssinaturaLNBInput {
  cpf: string;
  nome: string;
  email: string;
  telefone: string;
  valor: number;
  cycle: "MONTHLY" | "YEARLY";
  descricao: string;
  externalReference: string;
}

export interface CriarAssinaturaLNBResult {
  subscriptionId: string;
  customerId: string;
  status: AsaasSubscription["status"];
  nextDueDate: string;
  invoiceUrl: string;
}

/**
 * Helper end-to-end: busca/cria customer + cria assinatura.
 * Asaas vai cobrar automaticamente todo mes.
 */
export async function criarAssinaturaLNB(
  i: CriarAssinaturaLNBInput
): Promise<CriarAssinaturaLNBResult> {
  const customer = await findOrCreateCustomer({
    name: i.nome,
    cpfCnpj: i.cpf,
    email: i.email,
    mobilePhone: i.telefone,
    externalReference: i.cpf,
  });

  const sub = await createSubscription({
    customerId: customer.id,
    value: i.valor,
    cycle: i.cycle,
    description: i.descricao,
    externalReference: i.externalReference,
    billingType: "UNDEFINED",
  });

  // Busca a primeira cobranca pra retornar o invoiceUrl
  const paymentsRes = await fetch(`${baseUrl()}/subscriptions/${sub.id}/payments`, {
    headers: authHeaders(),
  });
  let invoiceUrl = "";
  if (paymentsRes.ok) {
    const j = await paymentsRes.json() as { data?: Array<{ invoiceUrl?: string }> };
    invoiceUrl = j.data?.[0]?.invoiceUrl ?? "";
  }

  return {
    subscriptionId: sub.id,
    customerId: customer.id,
    status: sub.status,
    nextDueDate: sub.nextDueDate,
    invoiceUrl,
  };
}
