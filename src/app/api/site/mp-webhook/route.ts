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

    // Geração de PDF + envio de email/WhatsApp em background (não bloqueia retorno)
    finalizarConsulta({
      cpf,
      nome: payment.payer?.first_name || "",
      email: payment.payer?.email || "",
      telefone,
      parsed,
      raw,
    }).catch((e) =>
      console.error("[mp-webhook] erro finalizar consulta:", e)
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

/**
 * Finaliza a consulta após pagamento confirmado:
 * 1. Gera PDF interno (sem n8n)
 * 2. Salva pdf_url em LNB_Consultas (RPC SECURITY DEFINER)
 * 3. Envia email com link
 * 4. Envia WhatsApp via Chatwoot (template Meta ou texto livre)
 *
 * Roda em background — não bloqueia resposta do webhook MP.
 */
interface FinalizarInput {
  cpf: string;
  nome: string;
  email: string;
  telefone: string;
  parsed: ReturnType<typeof parseConsulta> | null;
  raw: unknown;
}

async function finalizarConsulta(input: FinalizarInput) {
  const { cpf, nome, email, telefone, parsed, raw } = input;
  const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://limpanomebrazil.com.br";

  // Imports lazy pra não pesar o bundle do webhook
  const { gerarESalvarRelatorio } = await import("@/lib/pdf/gerar-relatorio");
  const { sendEmail, renderEmailHTML } = await import("@/lib/email");
  const { sendWhatsAppTemplate, sendWhatsApp } = await import("@/lib/chatwoot");

  // 1) Extrai score + pendências do raw
  const rawObj = (raw as Record<string, unknown>) || {};
  const score =
    typeof rawObj.Score === "number"
      ? (rawObj.Score as number)
      : typeof rawObj.score === "number"
      ? (rawObj.score as number)
      : undefined;

  const pendencias: Array<{ credor: string; valor: number; data?: string }> = [];
  if (Array.isArray(rawObj.RegistroDeDebitos)) {
    for (const d of rawObj.RegistroDeDebitos as Array<Record<string, unknown>>) {
      pendencias.push({
        credor: String(d.Credor || "Credor"),
        valor: parseFloat(String(d.Valor ?? 0)) || 0,
        data: d.Data ? String(d.Data) : undefined,
      });
    }
  }
  if (Array.isArray(rawObj.Protestos)) {
    for (const p of rawObj.Protestos as Array<Record<string, unknown>>) {
      pendencias.push({
        credor: String(p.Credor || "Protesto"),
        valor: parseFloat(String(p.Valor ?? 0)) || 0,
        data: p.Data ? String(p.Data) : undefined,
      });
    }
  }

  // 2) Gera PDF + upload Storage
  let pdfUrl: string | null = null;
  try {
    const r = await gerarESalvarRelatorio({
      cpf,
      nome,
      email,
      telefone,
      score,
      tem_pendencia: !!parsed?.tem_pendencia,
      qtd_pendencias: parsed?.qtd_pendencias || 0,
      total_dividas: parsed?.total_dividas || 0,
      pendencias,
    });
    if (r.ok) {
      pdfUrl = r.pdfUrl;
      // Salva pdf_url via RPC
      const { createClient } = await import("@/lib/supabase/server");
      const supa = await createClient();
      await supa.rpc("webhook_set_pdf_url" as never, {
        p_cpf: cpf,
        p_pdf_url: pdfUrl,
      } as never);
    } else {
      console.error("[mp-webhook] PDF erro:", r.error);
    }
  } catch (e) {
    console.error("[mp-webhook] PDF exception:", e);
  }

  // 3) Email com link do PDF + resumo
  if (email) {
    try {
      const titulo = parsed?.tem_pendencia
        ? "📨 Seu relatório está pronto"
        : "🎉 Boa notícia: seu nome está limpo!";
      const corpo = parsed?.tem_pendencia
        ? `Encontramos ${parsed.qtd_pendencias} pendência${parsed.qtd_pendencias === 1 ? "" : "s"} no seu CPF, totalizando R$ ${parsed.total_dividas.toFixed(2)}. Acesse seu relatório completo no botão abaixo.`
        : "Não encontramos pendências no seu CPF. Continue mantendo as contas em dia pra preservar seu score.";

      const html = renderEmailHTML({
        titulo,
        corpo,
        mensagemExtra: pdfUrl
          ? `📄 <a href="${pdfUrl}" style="color:#0298d9;">Baixar relatório PDF</a>`
          : undefined,
        nomeCliente: nome.split(" ")[0],
        ctaUrl: `${SITE}/conta/dashboard`,
        ctaTexto: "Acessar minha área",
      });
      await sendEmail({
        to: email,
        subject: `[LNB] ${titulo}`,
        html,
        text: `${titulo}\n\n${corpo}\n\n${pdfUrl ? "PDF: " + pdfUrl + "\n\n" : ""}Acesse: ${SITE}/conta/dashboard`,
      });
    } catch (e) {
      console.error("[mp-webhook] email erro:", e);
    }
  }

  // 4) WhatsApp via template (se configurado) ou texto livre
  if (telefone) {
    try {
      const titulo = parsed?.tem_pendencia
        ? "Seu relatório está pronto"
        : "Boa notícia: seu nome está limpo!";
      const corpo = parsed?.tem_pendencia
        ? `Encontramos ${parsed.qtd_pendencias} pendência(s) no seu CPF (R$ ${parsed.total_dividas.toFixed(2)}). Veja o relatório completo na sua área.`
        : "Não encontramos pendências no seu CPF. Continue mantendo as contas em dia.";

      const templateName = process.env.WPP_TEMPLATE_GENERICO;
      if (templateName) {
        await sendWhatsAppTemplate(
          telefone,
          {
            name: templateName,
            language: process.env.WPP_TEMPLATE_LANG || "pt_BR",
            parameters: [
              nome.split(" ")[0],
              titulo,
              corpo,
              `${SITE}/conta/dashboard`,
            ],
          },
          nome
        );
      } else {
        const texto = `*${titulo}*\n\n${corpo}${pdfUrl ? "\n\nPDF: " + pdfUrl : ""}\n\nAcesse: ${SITE}/conta/dashboard`;
        await sendWhatsApp(telefone, texto, nome);
      }
    } catch (e) {
      console.error("[mp-webhook] whatsapp erro:", e);
    }
  }
}
