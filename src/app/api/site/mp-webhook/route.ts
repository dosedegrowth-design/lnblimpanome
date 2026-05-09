import { NextResponse } from "next/server";
import { getPayment } from "@/lib/mercadopago";
import type { APIFullResultado } from "@/lib/api-full";
import { consultarCPF, parseConsulta } from "@/lib/api-full";
import { createClient } from "@/lib/supabase/server";
import { cleanCPF } from "@/lib/utils";
import { verifyMpWebhookSignature } from "@/lib/mp-webhook-signature";

// PDF + APIs externas precisam de Node runtime
export const runtime = "nodejs";
export const maxDuration = 60;

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

  // ORIGEM: define qual canal de notificação usar
  // - "site": só email Resend (sem Chatwoot/WhatsApp)
  // - "whatsapp": só Chatwoot/WhatsApp (n8n Maia continua a conversa)
  // - default "site" se não setado
  const origem = String(payment.metadata?.origem || "site").toLowerCase() as
    | "site"
    | "whatsapp";

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

    // Geração de PDF + envio de notificação por origem (background)
    finalizarConsulta({
      cpf,
      nome: payment.payer?.first_name || "",
      email: payment.payer?.email || "",
      telefone,
      parsed,
      raw,
      origem,
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

    // Aplica labels Chatwoot + handoff humano (background)
    finalizarLimpezaPaga({ cpf, nome: payment.payer?.first_name || "", telefone, email: payment.payer?.email || "", origem }).catch((e) =>
      console.error("[mp-webhook] erro finalizar limpeza:", e)
    );
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true, message: "MP webhook ativo" });
}

/**
 * Finaliza pagamento da Limpeza (R$ 480,01).
 * - Aplica label "pago-limpeza" no Chatwoot
 * - Manda mensagem de boas-vindas no WhatsApp avisando que equipe assume
 * - Email de confirmação se tiver email
 * - (futuro) cria registro em lnb_processos com etapa "iniciado"
 */
interface FinalizarLimpezaInput {
  cpf: string;
  nome: string;
  email: string;
  telefone: string;
  origem: "site" | "whatsapp";
}

async function finalizarLimpezaPaga(i: FinalizarLimpezaInput) {
  const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://limpanomebrazil.com.br";
  console.log(`[mp-webhook] limpeza paga cpf=${i.cpf} origem=${i.origem}`);

  const titulo = "🎉 Limpeza contratada — equipe inicia em até 4h úteis";
  const corpo = `Recebemos seu pagamento de R$ 480,01 com sucesso! Em até 4 horas úteis nossa equipe especializada inicia o processo de limpeza do seu nome. Você será atualizado a cada etapa por aqui e por email.\n\n📋 Próximos passos:\n• Análise dos credores (em até 2 dias)\n• Atuação junto aos órgãos (Boa Vista/Serasa/SPC)\n• Acompanhamento online no painel\n• Conclusão em até 20 dias úteis\n\nObrigado pela confiança 💙`;

  // WhatsApp via Chatwoot (se origem=whatsapp)
  if (i.origem === "whatsapp" && i.telefone) {
    try {
      const { aplicarLabelsLnb } = await import("@/lib/chatwoot-labels");
      const { buscarConversationIdPorTelefone } = await import("@/lib/chatwoot-kanban");
      const { enviarTextoChatwoot } = await import("@/lib/chatwoot-attach");
      const { registrarLimpezaPagaNoCard } = await import("@/lib/chatwoot-attributes");

      const convId = await buscarConversationIdPorTelefone(i.telefone);
      if (convId) {
        // Labels + atribute + nota
        await aplicarLabelsLnb(convId, "pago_limpeza");
        await registrarLimpezaPagaNoCard(convId, {
          cpf: i.cpf,
          valor: "R$ 480,01",
        });
        // Mensagem visível pro cliente
        await enviarTextoChatwoot(convId, `*${titulo}*\n\n${corpo}`);
      }
    } catch (e) {
      console.error("[mp-webhook] limpeza chatwoot erro:", e);
    }
  }

  // Email (sempre que tiver email)
  if (i.email) {
    try {
      const { sendEmail, renderEmailHTML } = await import("@/lib/email");
      await sendEmail({
        to: i.email,
        subject: `[LNB] ${titulo}`,
        html: renderEmailHTML({
          titulo,
          corpo: corpo.replace(/\n/g, "<br>"),
          nomeCliente: i.nome.split(" ")[0],
          ctaUrl: `${SITE}/conta/dashboard`,
          ctaTexto: "Acompanhar processo",
        }),
        text: `${titulo}\n\n${corpo}\n\nAcesse: ${SITE}/conta/dashboard`,
      });
    } catch (e) {
      console.error("[mp-webhook] limpeza email erro:", e);
    }
  }
}

/**
 * Finaliza a consulta após pagamento confirmado.
 *
 * Sempre faz:
 * 1. Gera PDF interno (sem n8n)
 * 2. Salva pdf_url em LNB_Consultas (RPC SECURITY DEFINER)
 *
 * Por ORIGEM:
 * - site:     só envia email Resend (sem WhatsApp — cliente acompanha pelo painel)
 * - whatsapp: só envia mensagem Chatwoot (n8n Maia continua a conversa)
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
  origem: "site" | "whatsapp";
}

async function finalizarConsulta(input: FinalizarInput) {
  const { cpf, nome, email, telefone, parsed, raw, origem } = input;
  const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://limpanomebrazil.com.br";

  // Imports lazy pra não pesar o bundle do webhook
  const { gerarESalvarRelatorio } = await import("@/lib/pdf/gerar-relatorio");
  const { sendEmail, renderEmailHTML } = await import("@/lib/email");
  const { sendWhatsAppTemplate, sendWhatsApp } = await import("@/lib/chatwoot");

  console.log(`[mp-webhook] finalizando consulta cpf=${cpf} origem=${origem}`);

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
      const { createClient } = await import("@/lib/supabase/server");
      const supa = await createClient();
      // Salva pdf_url + dados consulta na LNB_Consultas
      await supa.rpc("webhook_set_pdf_url" as never, {
        p_cpf: cpf,
        p_pdf_url: pdfUrl,
      } as never);
      // Também grava no LNB - CRM (padrão SPV — Kanban completo)
      await supa.rpc("lnb_crm_set_consulta_resultado" as never, {
        p_telefone: telefone,
        p_score: score ?? null,
        p_tem_pendencia: !!parsed?.tem_pendencia,
        p_qtd_pendencias: parsed?.qtd_pendencias || 0,
        p_total_dividas: parsed?.total_dividas || 0,
        p_pdf_url: pdfUrl,
      } as never);
    } else {
      console.error("[mp-webhook] PDF erro:", r.error);
    }
  } catch (e) {
    console.error("[mp-webhook] PDF exception:", e);
  }

  // 2.5) Aplica labels + custom attributes + private note no card Chatwoot
  if (origem === "whatsapp" && telefone) {
    try {
      const { aplicarLabelsLnb } = await import("@/lib/chatwoot-labels");
      const { buscarConversationIdPorTelefone } = await import("@/lib/chatwoot-kanban");
      const { registrarConsultaNoCard } = await import("@/lib/chatwoot-attributes");

      const convId = await buscarConversationIdPorTelefone(telefone);
      if (convId) {
        // Labels: pago_consulta + resultado
        await aplicarLabelsLnb(convId, "pago_consulta");
        if (parsed?.tem_pendencia) {
          await aplicarLabelsLnb(convId, "consulta_resultado_com_pendencia", { score });
        } else {
          await aplicarLabelsLnb(convId, "consulta_resultado_sem_pendencia", { score });
        }

        // Custom attributes + private note (PDF fica visível no painel lateral)
        await registrarConsultaNoCard(convId, {
          cpf,
          score,
          tem_pendencia: !!parsed?.tem_pendencia,
          qtd_pendencias: parsed?.qtd_pendencias,
          total_dividas: parsed?.total_dividas,
          pdf_url: pdfUrl ?? undefined,
        });
      }
    } catch (e) {
      console.error("[mp-webhook] chatwoot card erro (segue):", e);
    }
  }

  const titulo = parsed?.tem_pendencia
    ? "Seu relatório está pronto"
    : "Boa notícia: seu nome está limpo!";
  const corpoEmail = parsed?.tem_pendencia
    ? `Encontramos ${parsed.qtd_pendencias} pendência${parsed.qtd_pendencias === 1 ? "" : "s"} no seu CPF, totalizando R$ ${parsed.total_dividas.toFixed(2)}. Acesse seu relatório completo no botão abaixo.`
    : "Não encontramos pendências no seu CPF. Continue mantendo as contas em dia pra preservar seu score.";
  const corpoWpp = parsed?.tem_pendencia
    ? `Encontramos ${parsed.qtd_pendencias} pendência(s) no seu CPF (R$ ${parsed.total_dividas.toFixed(2)}). Veja o relatório completo na sua área.`
    : "Não encontramos pendências no seu CPF. Continue mantendo as contas em dia.";

  // ─── FLUXO SITE: só email Resend ──────────────────────
  // Cliente acompanha pelo painel /conta/dashboard. Sem WhatsApp.
  if (origem === "site" && email) {
    try {
      const html = renderEmailHTML({
        titulo: parsed?.tem_pendencia ? `📨 ${titulo}` : `🎉 ${titulo}`,
        corpo: corpoEmail,
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
        text: `${titulo}\n\n${corpoEmail}\n\n${pdfUrl ? "PDF: " + pdfUrl + "\n\n" : ""}Acesse: ${SITE}/conta/dashboard`,
      });
    } catch (e) {
      console.error("[mp-webhook] email erro:", e);
    }
  }

  // ─── FLUXO WHATSAPP: Chatwoot + PDF anexo + email backup ──
  // 1) Manda PDF como anexo direto na conversa Chatwoot (UX rápida)
  // 2) Manda email Resend como backup (se email existir)
  // n8n Maia continua a conversa depois.
  if (origem === "whatsapp" && telefone) {
    try {
      const { buscarConversationIdPorTelefone } = await import("@/lib/chatwoot-kanban");
      const { enviarTextoChatwoot, enviarAnexoChatwoot } = await import("@/lib/chatwoot-attach");
      const convId = await buscarConversationIdPorTelefone(telefone);
      if (convId) {
        // 1ª mensagem: texto resumo
        const textoResumo = `*${titulo}*\n\n${corpoWpp}\n\n${parsed?.tem_pendencia ? "Vou te explicar como funciona a limpeza." : "Recomendo a Blindagem mensal pra manter assim."}`;
        await enviarTextoChatwoot(convId, textoResumo);

        // 2ª mensagem: PDF anexo (se gerou)
        if (pdfUrl) {
          await enviarAnexoChatwoot(
            convId,
            pdfUrl,
            "📄 Aqui está seu relatório completo. Pode salvar pra consultar depois.",
            `relatorio-cpf-${cpf}.pdf`
          );
        }
      } else {
        // Fallback: usa template Meta (cliente não respondeu nas últimas 24h)
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
                corpoWpp,
                `${SITE}/conta/dashboard`,
              ],
            },
            nome
          );
        } else {
          const texto = `*${titulo}*\n\n${corpoWpp}${pdfUrl ? "\n\nPDF: " + pdfUrl : ""}\n\nAcesse: ${SITE}/conta/dashboard`;
          await sendWhatsApp(telefone, texto, nome);
        }
      }
    } catch (e) {
      console.error("[mp-webhook] whatsapp/chatwoot erro:", e);
    }

    // Email backup (se cliente passou email)
    if (email) {
      try {
        const html = renderEmailHTML({
          titulo: parsed?.tem_pendencia ? `📨 ${titulo}` : `🎉 ${titulo}`,
          corpo: corpoEmail,
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
          text: `${titulo}\n\n${corpoEmail}\n\n${pdfUrl ? "PDF: " + pdfUrl + "\n\n" : ""}Acesse: ${SITE}/conta/dashboard`,
        });
      } catch (e) {
        console.error("[mp-webhook] email backup erro:", e);
      }
    }
  }
}
