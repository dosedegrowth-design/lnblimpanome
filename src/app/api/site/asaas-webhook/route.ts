import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cleanCPF } from "@/lib/utils";
import type { APIFullResultado, APIFullCNPJResultado } from "@/lib/api-full";
import { consultarCPF, parseConsulta, consultarCNPJCompleto } from "@/lib/api-full";
import {
  verifyAsaasWebhookToken,
  isPaymentConfirmedEvent,
  type AsaasWebhookPayload,
} from "@/lib/asaas-webhook";
import { getPayment } from "@/lib/asaas";
import type { SupabaseClient } from "@supabase/supabase-js";

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

  // externalReference: TIPO-DOCUMENTO-TIMESTAMP onde DOCUMENTO é CPF (11) ou CNPJ (14)
  const refMatch = externalRef.match(/^([A-Z_]+)-(\d{11}|\d{14})-/);
  if (!refMatch) {
    console.error("[asaas-webhook] externalReference em formato inesperado:", externalRef);
    return NextResponse.json({ ok: true, ignored: "bad_external_ref" });
  }
  const tipoFromRef = refMatch[1].toLowerCase();
  const documento = refMatch[2];
  const isCNPJ = documento.length === 14;
  const cpf = isCNPJ ? "" : cleanCPF(documento);
  const cnpj = isCNPJ ? documento : "";

  // Busca dados do CRM
  const supa = await createClient();
  let crmRow: Record<string, unknown> | null = null;
  if (isCNPJ) {
    const { data } = await supa
      .from("LNB - CRM")
      .select('telefone, nome, "e-mail", origem, razao_social, cpf_responsavel, nome_responsavel, cnpj')
      .eq("cnpj", cnpj)
      .maybeSingle();
    crmRow = data as Record<string, unknown> | null;
  } else {
    const { data } = await supa
      .from("LNB - CRM")
      .select('telefone, nome, "e-mail", origem')
      .eq("CPF", cpf)
      .maybeSingle();
    crmRow = data as Record<string, unknown> | null;
  }

  const telefone = String(crmRow?.telefone || "").replace(/\D/g, "");
  const nome = String(crmRow?.nome || "");
  const email = String(crmRow?.["e-mail"] || "");
  const origem = (crmRow?.origem === "whatsapp" ? "whatsapp" : "site") as "site" | "whatsapp";
  const razaoSocial = String(crmRow?.razao_social || "");
  const cpfResponsavel = String(crmRow?.cpf_responsavel || "");
  const nomeResponsavel = String(crmRow?.nome_responsavel || "");

  if (!telefone) {
    console.error("[asaas-webhook] CRM não tem telefone pra documento:", documento);
  }

  // ─── CONSULTA CPF ─────────────────────────────────────
  if (tipoFromRef === "consulta" && !isCNPJ) {
    let parsed: ReturnType<typeof parseConsulta> | null = null;
    let raw: APIFullResultado | null = null;
    try {
      raw = await consultarCPF(cpf);
      parsed = parseConsulta(raw);
    } catch (e) {
      console.error("[asaas-webhook] erro consulta CPF (segue):", e);
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

    finalizarConsulta({ cpf, nome, email, telefone, parsed, raw, origem }).catch((e) =>
      console.error("[asaas-webhook] erro finalizar consulta:", e)
    );
  }

  // ─── CONSULTA CNPJ ────────────────────────────────────
  if (tipoFromRef === "consulta_cnpj" && isCNPJ) {
    finalizarConsultaCNPJ({
      cnpj,
      razaoSocial,
      cpfResponsavel,
      nomeResponsavel,
      email,
      telefone,
      externalRef: String(externalRef),
      origem,
      supa,
    }).catch((e) => console.error("[asaas-webhook] erro finalizar consulta CNPJ:", e));
  }

  // ─── LIMPEZA CPF ──────────────────────────────────────
  if ((tipoFromRef === "limpeza" || tipoFromRef === "limpeza_desconto") && !isCNPJ) {
    const { error: rpcErr } = await supa.rpc("webhook_registrar_limpeza_fechada", {
      p_cpf: cpf,
      p_telefone: telefone,
    });
    if (rpcErr) console.error("[asaas-webhook] webhook_registrar_limpeza_fechada erro:", rpcErr);

    finalizarLimpezaPaga({ cpf, nome, telefone, email, origem }).catch((e) =>
      console.error("[asaas-webhook] erro finalizar limpeza:", e)
    );
  }

  // ─── LIMPEZA CNPJ ─────────────────────────────────────
  if (tipoFromRef === "limpeza_cnpj" && isCNPJ) {
    const { error: rpcErr } = await supa.rpc("webhook_registrar_limpeza_cnpj_fechada", {
      p_cnpj: cnpj,
      p_telefone: telefone,
    });
    if (rpcErr) console.error("[asaas-webhook] webhook_registrar_limpeza_cnpj_fechada erro:", rpcErr);

    finalizarLimpezaCnpjPaga({
      cnpj,
      razaoSocial,
      telefone,
      email,
      origem,
    }).catch((e) => console.error("[asaas-webhook] erro finalizar limpeza CNPJ:", e));
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

  // Extrai score + pendências da estrutura aninhada da API Full real
  // ({ dados: { data: { saida: {...} } } }) ou fallback de chaves diretas
  const rawObj = (raw as Record<string, unknown>) || {};

  function findSaida(o: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
    if (!o || typeof o !== "object") return undefined;
    const dados = o.dados as Record<string, unknown> | undefined;
    if (dados?.data && typeof dados.data === "object") {
      const dd = dados.data as Record<string, unknown>;
      if (dd.saida && typeof dd.saida === "object") return dd.saida as Record<string, unknown>;
      return dd;
    }
    if (o.data && typeof o.data === "object") return o.data as Record<string, unknown>;
    return o;
  }

  const saida = findSaida(rawObj) || {};

  // Score: tenta Scores[0].score, Score direto, ou score
  let score: number | undefined;
  const scoresArr = saida.Scores as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(scoresArr) && scoresArr.length > 0) {
    const s0 = scoresArr[0];
    const sNum = parseFloat(String(s0?.score ?? s0?.valor ?? ""));
    if (!isNaN(sNum)) score = sNum;
  }
  if (score === undefined) {
    const direct = saida.Score ?? saida.score ?? rawObj.Score ?? rawObj.score;
    if (typeof direct === "number") score = direct;
    else if (typeof direct === "string") {
      const n = parseFloat(direct);
      if (!isNaN(n)) score = n;
    }
  }

  const pendencias: Array<{ credor: string; valor: number; data?: string }> = [];

  // 1) RegistroDeDebitos: pode ser { listaDebitos: [...] } ou array direto
  const regDeb = saida.RegistroDeDebitos as Record<string, unknown> | Array<Record<string, unknown>> | undefined;
  const listaDeb = Array.isArray(regDeb)
    ? regDeb
    : (regDeb && typeof regDeb === "object" ? (regDeb.listaDebitos as Array<Record<string, unknown>> | undefined) : undefined);
  if (Array.isArray(listaDeb)) {
    for (const d of listaDeb) {
      const credor = String(d.credor ?? d.Credor ?? d.informante ?? d.Informante ?? "Credor");
      const valor = parseFloat(String(d.valorAtualizado ?? d.valorOriginal ?? d.Valor ?? d.valor ?? 0)) || 0;
      const data = String(d.dataInclusao ?? d.dataOcorrencia ?? d.DataInclusao ?? d.Data ?? d.data ?? "");
      pendencias.push({ credor, valor, data: data || undefined });
    }
  }

  // 2) Protestos
  const prot = saida.Protestos as Record<string, unknown> | Array<Record<string, unknown>> | undefined;
  const listaProt = Array.isArray(prot)
    ? prot
    : (prot && typeof prot === "object" ? (prot.listaProtestos as Array<Record<string, unknown>> | undefined) : undefined);
  if (Array.isArray(listaProt)) {
    for (const p of listaProt) {
      const credor = String(p.credor ?? p.Credor ?? "Protesto");
      const valor = parseFloat(String(p.valorAtualizado ?? p.valorOriginal ?? p.Valor ?? p.valor ?? 0)) || 0;
      const data = String(p.dataInclusao ?? p.dataOcorrencia ?? p.Data ?? p.data ?? "");
      pendencias.push({ credor, valor, data: data || undefined });
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

// ────────────────────────────────────────────────────────
// HANDLERS CNPJ
// ────────────────────────────────────────────────────────

interface FinalizarConsultaCnpjInput {
  cnpj: string;
  razaoSocial: string;
  cpfResponsavel: string;
  nomeResponsavel: string;
  email: string;
  telefone: string;
  externalRef: string;
  origem: "site" | "whatsapp";
  supa: SupabaseClient;
}

/**
 * Finaliza consulta CNPJ:
 * 1. Chama API Full pra CNPJ Completo + CPF Cred Plus (responsável) em paralelo
 * 2. Grava no LNB_Consultas via RPC SECURITY DEFINER
 * 3. Gera PDF CNPJ
 * 4. Envia email (site) ou WhatsApp (whatsapp)
 */
async function finalizarConsultaCNPJ(i: FinalizarConsultaCnpjInput) {
  const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://limpanomebrazil.com.br";
  console.log(`[asaas-webhook] finalizando consulta CNPJ ${i.cnpj} resp ${i.cpfResponsavel}`);

  let parsedPJ: Awaited<ReturnType<typeof consultarCNPJCompleto>>["pj"] | null = null;
  let pjRaw: APIFullCNPJResultado | null = null;
  let parsedResp: ReturnType<typeof parseConsulta> | null = null;
  let respRaw: APIFullResultado | null = null;

  try {
    const result = await consultarCNPJCompleto(i.cnpj, i.cpfResponsavel);
    parsedPJ = result.pj;
    pjRaw = result.pjRaw;
    parsedResp = result.responsavel;
    respRaw = result.responsavelRaw;
  } catch (e) {
    console.error("[asaas-webhook] erro consulta CNPJ Completo (segue):", e);
  }

  // Grava no LNB_Consultas
  try {
    await i.supa.rpc("webhook_registrar_consulta_cnpj_paga", {
      p_cnpj: i.cnpj,
      p_razao_social: parsedPJ?.razao_social || i.razaoSocial,
      p_nome_responsavel: i.nomeResponsavel,
      p_cpf_responsavel: i.cpfResponsavel,
      p_email: i.email,
      p_telefone: i.telefone,
      p_provider: "apifull",
      p_tem_pendencia: parsedResp?.tem_pendencia ?? null,
      p_qtd_pendencias: parsedResp?.qtd_pendencias ?? null,
      p_total_dividas: parsedResp?.total_dividas ?? null,
      p_resumo: parsedResp?.resumo ?? null,
      p_resultado_raw: (respRaw as unknown as object) ?? {},
      p_resultado_pj_raw: (pjRaw as unknown as object) ?? {},
      p_situacao_cadastral: parsedPJ?.situacao_cadastral ?? null,
      p_capital_social: parsedPJ?.capital_social ?? null,
      p_data_abertura: parsedPJ?.data_abertura || null,
      p_cnae_principal: parsedPJ?.cnae_principal ?? null,
      p_socios_jsonb: (parsedPJ?.socios as unknown as object) ?? [],
      p_external_ref: i.externalRef,
    });
  } catch (e) {
    console.error("[asaas-webhook] erro webhook_registrar_consulta_cnpj_paga:", e);
  }

  // Score do responsável (API Full estrutura aninhada dados.data.saida.Scores[0])
  const rawObj = (respRaw as Record<string, unknown>) || {};
  let score: number | undefined;
  function findSaidaPJ(o: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
    if (!o || typeof o !== "object") return undefined;
    const dados = o.dados as Record<string, unknown> | undefined;
    if (dados?.data && typeof dados.data === "object") {
      const dd = dados.data as Record<string, unknown>;
      if (dd.saida && typeof dd.saida === "object") return dd.saida as Record<string, unknown>;
      return dd;
    }
    if (o.data && typeof o.data === "object") return o.data as Record<string, unknown>;
    return o;
  }
  const saida = findSaidaPJ(rawObj) || {};
  const scoresArr = saida.Scores as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(scoresArr) && scoresArr.length > 0) {
    const sNum = parseFloat(String(scoresArr[0]?.score ?? scoresArr[0]?.valor ?? ""));
    if (!isNaN(sNum)) score = sNum;
  }
  if (score === undefined) {
    const direct = saida.Score ?? saida.score ?? rawObj.Score ?? rawObj.score;
    if (typeof direct === "number") score = direct;
    else if (typeof direct === "string") {
      const n = parseFloat(direct);
      if (!isNaN(n)) score = n;
    }
  }

  // Gera PDF CNPJ
  let pdfUrl: string | null = null;
  try {
    const { gerarESalvarRelatorioCNPJ } = await import("@/lib/pdf/gerar-relatorio-cnpj");
    const r = await gerarESalvarRelatorioCNPJ({
      cnpj: i.cnpj,
      razao_social: parsedPJ?.razao_social || i.razaoSocial,
      nome_fantasia: parsedPJ?.nome_fantasia,
      situacao_cadastral: parsedPJ?.situacao_cadastral,
      data_abertura: parsedPJ?.data_abertura,
      capital_social: parsedPJ?.capital_social,
      cnae_principal: parsedPJ?.cnae_principal,
      endereco: parsedPJ?.endereco,
      socios: parsedPJ?.socios,
      nome_responsavel: i.nomeResponsavel,
      cpf_responsavel: i.cpfResponsavel,
      email: i.email,
      telefone: i.telefone,
      score,
      tem_pendencia: !!parsedResp?.tem_pendencia,
      qtd_pendencias: parsedResp?.qtd_pendencias || 0,
      total_dividas: parsedResp?.total_dividas || 0,
      pendencias: parsedResp?.pendencias,
    });
    if (r.ok) pdfUrl = r.pdfUrl;
    else console.error("[asaas-webhook] PDF CNPJ erro:", r.error);
  } catch (e) {
    console.error("[asaas-webhook] PDF CNPJ exception:", e);
  }

  const titulo = parsedResp?.tem_pendencia
    ? "Seu relatório CNPJ está pronto"
    : "Boa notícia: empresa e responsável sem pendências!";
  const corpoEmail = parsedResp?.tem_pendencia
    ? `Encontramos ${parsedResp.qtd_pendencias} pendência${parsedResp.qtd_pendencias === 1 ? "" : "s"} no CPF do responsável (sócio admin) da empresa ${parsedPJ?.razao_social || i.razaoSocial}, totalizando R$ ${parsedResp.total_dividas.toFixed(2)}.`
    : `A empresa ${parsedPJ?.razao_social || i.razaoSocial} e o sócio responsável não possuem pendências financeiras. Manter assim é o ideal pra obter crédito.`;

  // SITE: email
  if (i.origem === "site" && i.email) {
    try {
      const { sendEmail, renderEmailHTML } = await import("@/lib/email");
      const html = renderEmailHTML({
        titulo: parsedResp?.tem_pendencia ? `🏢 ${titulo}` : `🎉 ${titulo}`,
        corpo: corpoEmail,
        mensagemExtra: pdfUrl
          ? `📄 <a href="${pdfUrl}" style="color:#0298d9;">Baixar relatório CNPJ PDF</a>`
          : undefined,
        nomeCliente: i.nomeResponsavel.split(" ")[0],
        ctaUrl: `${SITE}/conta/dashboard`,
        ctaTexto: "Acessar minha área",
      });
      await sendEmail({
        to: i.email,
        subject: `[LNB] ${titulo}`,
        html,
        text: `${titulo}\n\n${corpoEmail}\n\n${pdfUrl ? "PDF: " + pdfUrl + "\n\n" : ""}Acesse: ${SITE}/conta/dashboard`,
      });
    } catch (e) {
      console.error("[asaas-webhook] email CNPJ erro:", e);
    }
  }
}

interface FinalizarLimpezaCnpjInput {
  cnpj: string;
  razaoSocial: string;
  telefone: string;
  email: string;
  origem: "site" | "whatsapp";
}

async function finalizarLimpezaCnpjPaga(i: FinalizarLimpezaCnpjInput) {
  const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://limpanomebrazil.com.br";
  console.log(`[asaas-webhook] limpeza CNPJ paga ${i.cnpj}`);

  const titulo = "🎉 Limpeza CNPJ contratada — equipe inicia em até 4h úteis";
  const corpo = `Recebemos seu pagamento de R$ 580,01 com sucesso! Em até 4 horas úteis nossa equipe especializada inicia o processo de limpeza do nome da empresa ${i.razaoSocial} e do sócio responsável.\n\n📋 Próximos passos:\n• Análise dos credores (em até 2 dias)\n• Atuação junto aos órgãos (Boa Vista/Serasa/SPC)\n• Acompanhamento online no painel\n• Conclusão em até 20 dias úteis\n• Monitoramento 12 meses incluído como bônus\n\nObrigado pela confiança 💙`;

  if (i.email) {
    try {
      const { sendEmail, renderEmailHTML } = await import("@/lib/email");
      await sendEmail({
        to: i.email,
        subject: `[LNB] ${titulo}`,
        html: renderEmailHTML({
          titulo,
          corpo: corpo.replace(/\n/g, "<br>"),
          nomeCliente: i.razaoSocial,
          ctaUrl: `${SITE}/conta/dashboard`,
          ctaTexto: "Acompanhar processo",
        }),
        text: `${titulo}\n\n${corpo}\n\nAcesse: ${SITE}/conta/dashboard`,
      });
    } catch (e) {
      console.error("[asaas-webhook] limpeza CNPJ email erro:", e);
    }
  }
}
