import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cleanCPF } from "@/lib/utils";
import type { APIFullResultado } from "@/lib/api-full";
import { consultarCPF, parseConsulta } from "@/lib/api-full";
import {
  verifyAsaasWebhookToken,
  isPaymentConfirmedEvent,
  type AsaasWebhookPayload,
} from "@/lib/asaas-webhook";
import { getPayment } from "@/lib/asaas";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/site/asaas-webhook
 *
 * Recebe eventos do Asaas. Fluxo:
 *  1. Valida o header `asaas-access-token` contra ASAAS_WEBHOOK_TOKEN
 *  2. Se evento for de pagamento confirmado/recebido, busca o payment completo
 *  3. Identifica o tipo via externalReference (CONSULTA-... ou LIMPEZA-...)
 *  4. Dispara o processamento adequado em background
 *  5. Retorna 200 OK rapidamente (timeout Asaas é curto)
 *
 * Substitui drop-in o antigo /api/site/mp-webhook.
 */
export async function POST(req: Request) {
  // 1) Valida token
  const sigCheck = verifyAsaasWebhookToken(req.headers.get("asaas-access-token"));
  if (!sigCheck.valid) {
    console.error("[asaas-webhook] token inválido:", sigCheck.reason);
    return NextResponse.json(
      { ok: false, error: "invalid_token", reason: sigCheck.reason },
      { status: 401 }
    );
  }

  // 2) Parse payload
  let payload: AsaasWebhookPayload;
  try {
    payload = (await req.json()) as AsaasWebhookPayload;
  } catch (e) {
    console.error("[asaas-webhook] payload inválido:", e);
    return NextResponse.json({ ok: true, ignored: "bad_json" });
  }

  if (!payload?.event || !payload?.payment?.id) {
    console.error("[asaas-webhook] sem event ou payment.id:", payload);
    return NextResponse.json({ ok: true, ignored: "no_event" });
  }

  console.log(
    `[asaas-webhook] event=${payload.event} payment=${payload.payment.id} status=${payload.payment.status}`
  );

  // 3) Só processamos pagamento confirmado/recebido
  if (!isPaymentConfirmedEvent(payload.event)) {
    return NextResponse.json({ ok: true, ignored: "not_confirmed_event", event: payload.event });
  }

  // 4) Busca dados completos do payment (defensa contra payloads parciais + pega customer)
  let payment;
  try {
    payment = await getPayment(payload.payment.id);
  } catch (e) {
    console.error("[asaas-webhook] erro getPayment:", e);
    // Fallback: usa payload do webhook
    payment = payload.payment;
  }

  // 5) Resolve dados do cliente
  const externalRef = payment.externalReference || "";

  // O externalReference que criamos sempre segue padrão TIPO-CPF-TIMESTAMP
  const refMatch = externalRef.match(/^([A-Z_]+)-(\d{11})-/);
  if (!refMatch) {
    console.error("[asaas-webhook] externalReference em formato inesperado:", externalRef);
    return NextResponse.json({ ok: true, ignored: "bad_external_ref" });
  }
  const tipoFromRef = refMatch[1].toLowerCase(); // consulta | limpeza | blindagem
  const cpf = cleanCPF(refMatch[2]);

  // Busca telefone, nome, email, origem na "LNB - CRM" pelo CPF
  const supa = await createClient();
  const { data: crmRow } = await supa
    .from("LNB - CRM")
    .select('telefone, nome, "e-mail", origem')
    .eq("CPF", cpf)
    .maybeSingle();

  const telefone = String(crmRow?.telefone || "").replace(/\D/g, "");
  const nome = String(crmRow?.nome || "");
  const email = String(crmRow?.["e-mail"] || "");
  const origem = (crmRow?.origem === "whatsapp" ? "whatsapp" : "site") as "site" | "whatsapp";

  if (!telefone) {
    console.error("[asaas-webhook] CRM não tem telefone pra CPF:", cpf);
  }

  // ─── CONSULTA ─────────────────────────────────────────
  if (tipoFromRef === "consulta") {
    let parsed: ReturnType<typeof parseConsulta> | null = null;
    let raw: APIFullResultado | null = null;
    try {
      raw = await consultarCPF(cpf);
      parsed = parseConsulta(raw);
    } catch (e) {
      console.error("[asaas-webhook] erro consulta API Full (segue):", e);
    }

    const { error: rpcErr } = await supa.rpc("webhook_registrar_consulta_paga", {
      p_cpf: cpf,
      p_nome: nome,
      p_email: email,
      p_telefone: telefone,
      p_provider: "apifull",
      p_tem_pendencia: parsed?.tem_pendencia ?? null,
      p_qtd_pendencias: parsed?.qtd_pendencias ?? null,
      p_total_dividas: parsed?.total_dividas ?? null,
      p_resumo: parsed?.resumo ?? null,
      p_resultado_raw: (raw as unknown as object) ?? {},
      p_external_ref: String(externalRef),
    });
    if (rpcErr) console.error("[asaas-webhook] webhook_registrar_consulta_paga erro:", rpcErr);

    // Geração de PDF + envio de notificação (background)
    finalizarConsulta({
      cpf,
      nome,
      email,
      telefone,
      parsed,
      raw,
      origem,
    }).catch((e) => console.error("[asaas-webhook] erro finalizar consulta:", e));
  }

  // ─── LIMPEZA ─────────────────────────────────────────
  if (tipoFromRef === "limpeza" || tipoFromRef === "limpeza_desconto") {
    const { error: rpcErr } = await supa.rpc("webhook_registrar_limpeza_fechada", {
      p_cpf: cpf,
      p_telefone: telefone,
    });
    if (rpcErr) console.error("[asaas-webhook] webhook_registrar_limpeza_fechada erro:", rpcErr);

    finalizarLimpezaPaga({ cpf, nome, telefone, email, origem }).catch((e) =>
      console.error("[asaas-webhook] erro finalizar limpeza:", e)
    );
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true, message: "Asaas webhook ativo" });
}

// ────────────────────────────────────────────────────────
// Handlers de pós-pagamento
// (mesmos do mp-webhook antigo, só renomeei o entry point)
// ────────────────────────────────────────────────────────

interface FinalizarLimpezaInput {
  cpf: string;
  nome: string;
  email: string;
  telefone: string;
  origem: "site" | "whatsapp";
}

async function finalizarLimpezaPaga(i: FinalizarLimpezaInput) {
  const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://limpanomebrazil.com.br";
  console.log(`[asaas-webhook] limpeza paga cpf=${i.cpf} origem=${i.origem}`);

  const titulo = "🎉 Limpeza contratada — equipe inicia em até 4h úteis";
  const corpo = `Recebemos seu pagamento de R$ 480,01 com sucesso! Em até 4 horas úteis nossa equipe especializada inicia o processo de limpeza do seu nome. Você será atualizado a cada etapa por aqui e por email.\n\n📋 Próximos passos:\n• Análise dos credores (em até 2 dias)\n• Atuação junto aos órgãos (Boa Vista/Serasa/SPC)\n• Acompanhamento online no painel\n• Conclusão em até 20 dias úteis\n\nObrigado pela confiança 💙`;

  if (i.origem === "whatsapp" && i.telefone) {
    try {
      const { aplicarLabelsLnb } = await import("@/lib/chatwoot-labels");
      const { buscarConversationIdPorTelefone } = await import("@/lib/chatwoot-kanban");
      const { enviarTextoChatwoot } = await import("@/lib/chatwoot-attach");
      const { registrarLimpezaPagaNoCard } = await import("@/lib/chatwoot-attributes");

      const convId = await buscarConversationIdPorTelefone(i.telefone);
      if (convId) {
        await aplicarLabelsLnb(convId, "pago_limpeza");
        await registrarLimpezaPagaNoCard(convId, {
          cpf: i.cpf,
          valor: "R$ 480,01",
        });
        await enviarTextoChatwoot(convId, `*${titulo}*\n\n${corpo}`);
      }
    } catch (e) {
      console.error("[asaas-webhook] limpeza chatwoot erro:", e);
    }
  }

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
      console.error("[asaas-webhook] limpeza email erro:", e);
    }
  }
}

interface FinalizarConsultaInput {
  cpf: string;
  nome: string;
  email: string;
  telefone: string;
  parsed: ReturnType<typeof parseConsulta> | null;
  raw: unknown;
  origem: "site" | "whatsapp";
}

async function finalizarConsulta(input: FinalizarConsultaInput) {
  const { cpf, nome, email, telefone, parsed, raw, origem } = input;
  const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://limpanomebrazil.com.br";

  const { gerarESalvarRelatorio } = await import("@/lib/pdf/gerar-relatorio");
  const { sendEmail, renderEmailHTML } = await import("@/lib/email");
  const { sendWhatsAppTemplate, sendWhatsApp } = await import("@/lib/chatwoot");

  console.log(`[asaas-webhook] finalizando consulta cpf=${cpf} origem=${origem}`);

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
      const supa = await createClient();
      await supa.rpc("webhook_set_pdf_url" as never, {
        p_cpf: cpf,
        p_pdf_url: pdfUrl,
      } as never);
      await supa.rpc("lnb_crm_set_consulta_resultado" as never, {
        p_telefone: telefone,
        p_score: score ?? null,
        p_tem_pendencia: !!parsed?.tem_pendencia,
        p_qtd_pendencias: parsed?.qtd_pendencias || 0,
        p_total_dividas: parsed?.total_dividas || 0,
        p_pdf_url: pdfUrl,
      } as never);
    } else {
      console.error("[asaas-webhook] PDF erro:", r.error);
    }
  } catch (e) {
    console.error("[asaas-webhook] PDF exception:", e);
  }

  if (origem === "whatsapp" && telefone) {
    try {
      const { aplicarLabelsLnb } = await import("@/lib/chatwoot-labels");
      const { buscarConversationIdPorTelefone } = await import("@/lib/chatwoot-kanban");
      const { registrarConsultaNoCard } = await import("@/lib/chatwoot-attributes");

      const convId = await buscarConversationIdPorTelefone(telefone);
      if (convId) {
        await aplicarLabelsLnb(convId, "pago_consulta");
        if (parsed?.tem_pendencia) {
          await aplicarLabelsLnb(convId, "consulta_resultado_com_pendencia", { score });
        } else {
          await aplicarLabelsLnb(convId, "consulta_resultado_sem_pendencia", { score });
        }
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
      console.error("[asaas-webhook] chatwoot card erro (segue):", e);
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
      console.error("[asaas-webhook] email erro:", e);
    }
  }

  if (origem === "whatsapp" && telefone) {
    try {
      const { buscarConversationIdPorTelefone } = await import("@/lib/chatwoot-kanban");
      const { enviarTextoChatwoot, enviarAnexoChatwoot } = await import("@/lib/chatwoot-attach");
      const convId = await buscarConversationIdPorTelefone(telefone);
      if (convId) {
        const textoResumo = `*${titulo}*\n\n${corpoWpp}\n\n${parsed?.tem_pendencia ? "Vou te explicar como funciona a limpeza." : "Recomendo a Blindagem mensal pra manter assim."}`;
        await enviarTextoChatwoot(convId, textoResumo);
        if (pdfUrl) {
          await enviarAnexoChatwoot(
            convId,
            pdfUrl,
            "📄 Aqui está seu relatório completo. Pode salvar pra consultar depois.",
            `relatorio-cpf-${cpf}.pdf`
          );
        }
      } else {
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
      console.error("[asaas-webhook] whatsapp/chatwoot erro:", e);
    }

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
        console.error("[asaas-webhook] email backup erro:", e);
      }
    }
  }
}
