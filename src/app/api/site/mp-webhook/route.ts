import { NextResponse } from "next/server";
import { getPayment } from "@/lib/mercadopago";
import { consultarCPF, parseConsulta } from "@/lib/api-full";
import { createAdminClient } from "@/lib/supabase/admin";
import { cleanCPF } from "@/lib/utils";

/**
 * POST /api/site/mp-webhook
 *
 * Recebe notificações do Mercado Pago.
 * 1) Busca o pagamento na API MP
 * 2) Se aprovado e tipo="consulta": chama API Full + salva LNB_Consultas
 * 3) Se aprovado e tipo="limpeza*": marca CRM como Fechado
 * 4) Dispara fluxo n8n PDF Generator (mantém o existente)
 *
 * MP envia notification em formatos diferentes:
 *   { action: "payment.updated", data: { id: "12345" } }
 *   ?topic=payment&id=12345 (query string)
 *   { resource: "https://api.mercadopago.com/...", topic: "payment" }
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

  const admin = createAdminClient();

  // -------- CONSULTA --------
  if (tipo === "consulta" || externalRef.startsWith("CONSULTA")) {
    try {
      const raw = await consultarCPF(cpf);
      const r = parseConsulta(raw);

      await admin.from("LNB_Consultas").upsert(
        {
          cpf,
          nome: payment.payer?.first_name || "",
          email: payment.payer?.email || "",
          telefone,
          provider: "apifull",
          tem_pendencia: r.tem_pendencia,
          qtd_pendencias: r.qtd_pendencias,
          total_dividas: r.total_dividas,
          resumo: r.resumo,
          consulta_paga: true,
          resultado_raw: raw as object,
          origem: "site",
          mp_preference_consulta: String(externalRef),
        },
        { onConflict: "cpf" }
      );

      await admin
        .from("LNB - CRM")
        .update({ status_pagamento: "paid", Qualificado: true })
        .eq("telefone", telefone);
    } catch (e) {
      console.error("[mp-webhook] erro consulta API Full (segue marcando pago):", e);
      await admin.from("LNB_Consultas").upsert(
        {
          cpf,
          nome: payment.payer?.first_name || "",
          email: payment.payer?.email || "",
          telefone,
          provider: "apifull",
          consulta_paga: true,
          origem: "site",
          mp_preference_consulta: String(externalRef),
        },
        { onConflict: "cpf" }
      );
    }

    triggerPdfGeneration(cpf).catch((e) =>
      console.error("[mp-webhook] erro disparar PDF n8n:", e)
    );
  }

  // -------- LIMPEZA --------
  if (tipo.startsWith("limpeza") || externalRef.startsWith("LIMPEZA")) {
    await admin
      .from("LNB - CRM")
      .update({ status_pagamento: "paid", Fechado: true })
      .eq("telefone", telefone);

    await admin
      .from("LNB_Consultas")
      .update({ fechou_limpeza: true })
      .eq("cpf", cpf);
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
