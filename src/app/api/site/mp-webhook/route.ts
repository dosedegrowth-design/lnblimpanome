import { NextResponse } from "next/server";
import { getPayment } from "@/lib/mercadopago";
import type { APIFullResultado } from "@/lib/api-full";
import { consultarCPF, parseConsulta } from "@/lib/api-full";
import { createClient } from "@/lib/supabase/server";
import { cleanCPF } from "@/lib/utils";
import { verifyMpWebhookSignature } from "@/lib/mp-webhook-signature";

/**
 * POST /api/site/mp-webhook
 *
 * Recebe notificações do Mercado Pago.
 * 1) Busca o pagamento na API MP
 * 2) Se aprovado e tipo="consulta": chama API Full + grava via RPC SECURITY DEFINER
 * 3) Se aprovado e tipo="limpeza*": grava via RPC SECURITY DEFINER
 * 4) Dispara fluxo n8n PDF Generator
 *
 * Não usa service_role — todas escritas em LNB_Consultas e "LNB - CRM" passam
 * por RPCs (webhook_registrar_consulta_paga / webhook_registrar_limpeza_fechada)
 * que rodam com SECURITY DEFINER no Postgres (bypass RLS dentro do banco).
 */
export async function POST(req: Request) {
  const url = new URL(req.url);
  const queryId = url.searchParams.get("id");
  const queryTopic = url.searchParams.get("topic");
  const body = await req.json().catch(() => ({} as Record<string, unknown>));

  const paymentId =
    queryTopic === "payment" && queryId
      ? queryId
      : (body as { data?: { id?: unknown } })?.data?.id
      ? String((body as { data: { id: unknown } }).data.id)
      : (body as { resource?: string })?.resource
      ? String((body as { resource: string }).resource).split("/").pop()
      : null;

  if (!paymentId) {
    console.error("[mp-webhook] sem paymentId. body:", body, "query:", url.search);
    return NextResponse.json({ ok: true, ignored: "no_payment_id" });
  }

  // Validação HMAC com a assinatura secreta do MP
  const sigCheck = verifyMpWebhookSignature({
    xSignature: req.headers.get("x-signature"),
    xRequestId: req.headers.get("x-request-id"),
    dataId: paymentId,
  });
  if (!sigCheck.valid) {
    console.error("[mp-webhook] assinatura inválida:", sigCheck.reason);
    return NextResponse.json(
      { ok: false, error: "invalid_signature", reason: sigCheck.reason },
      { status: 401 }
    );
  }

  let payment;
  try {
    payment = await getPayment(paymentId);
  } catch (e) {
    console.error("[mp-webhook] erro ao buscar payment:", e);
    return NextResponse.json({ ok: false, error: "fetch_failed" }, { status: 500 });
  }

  if (payment.status !== "approved") {
    console.log(`[mp-webhook] payment ${paymentId} status=${payment.status}, ignorando`);
    return NextResponse.json({ ok: true, status: payment.status });
  }

  const cpf = cleanCPF(
    String(payment.metadata?.cpf || payment.payer?.identification?.number || "")
  );
  const telefone = String(payment.metadata?.telefone || "").replace(/\D/g, "");
  const tipo = String(payment.metadata?.tipo || "").toLowerCase();
  const externalRef = payment.external_reference;

  if (!cpf || !telefone) {
    console.error("[mp-webhook] cpf/telefone faltando:", { cpf, telefone, externalRef });
    return NextResponse.json({ ok: false, error: "missing_metadata" }, { status: 400 });
  }

  const supa = await createClient();

  // -------- CONSULTA --------
  if (tipo === "consulta" || externalRef.startsWith("CONSULTA")) {
    let parsed: ReturnType<typeof parseConsulta> | null = null;
    let raw: APIFullResultado | null = null;
    try {
      raw = await consultarCPF(cpf);
      parsed = parseConsulta(raw);
    } catch (e) {
      console.error("[mp-webhook] erro consulta API Full (segue marcando pago):", e);
    }

    const { error: rpcErr } = await supa.rpc("webhook_registrar_consulta_paga", {
      p_cpf: cpf,
      p_nome: payment.payer?.first_name || "",
      p_email: payment.payer?.email || "",
      p_telefone: telefone,
      p_provider: "apifull",
      p_tem_pendencia: parsed?.tem_pendencia ?? null,
      p_qtd_pendencias: parsed?.qtd_pendencias ?? null,
      p_total_dividas: parsed?.total_dividas ?? null,
      p_resumo: parsed?.resumo ?? null,
      p_resultado_raw: (raw as unknown as object) ?? {},
      p_external_ref: String(externalRef),
    });
    if (rpcErr) console.error("[mp-webhook] webhook_registrar_consulta_paga erro:", rpcErr);

    triggerPdfGeneration(cpf).catch((e) =>
      console.error("[mp-webhook] erro disparar PDF n8n:", e)
    );
  }

  // -------- LIMPEZA --------
  if (tipo.startsWith("limpeza") || externalRef.startsWith("LIMPEZA")) {
    const { error: rpcErr } = await supa.rpc("webhook_registrar_limpeza_fechada", {
      p_cpf: cpf,
      p_telefone: telefone,
    });
    if (rpcErr) console.error("[mp-webhook] webhook_registrar_limpeza_fechada erro:", rpcErr);
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true, message: "MP webhook ativo" });
}

async function triggerPdfGeneration(cpf: string) {
  const url =
    process.env.LNB_PDF_WEBHOOK ||
    "https://webhook.dosedegrowth.cloud/webhook/gerar-pdf-lnb";
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cpf }),
  });
}
