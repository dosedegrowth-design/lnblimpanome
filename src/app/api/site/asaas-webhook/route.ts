import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cleanCPF } from "@/lib/utils";
import type { APIFullResultado, APIFullCNPJResultado, ConsultaCombinada } from "@/lib/api-full";
import {
  consultarCPF,
  parseConsulta,
  consultarCNPJCompleto,
  consultarCPFCombinado,
  consultarSerasaPremium,
  parseSerasa,
} from "@/lib/api-full";
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

  // Busca dados do CRM via RPC SECURITY DEFINER (LNB - CRM tem RLS)
  const supa = await createClient();
  let crmRow: Record<string, unknown> | null = null;
  if (isCNPJ) {
    const { data, error } = await supa.rpc("lnb_crm_get_by_cnpj", { p_cnpj: cnpj });
    if (error) console.error("[asaas-webhook] lnb_crm_get_by_cnpj erro:", error);
    crmRow = (data as Record<string, unknown> | null) ?? null;
  } else {
    const { data, error } = await supa.rpc("lnb_crm_get_by_cpf", { p_cpf: cpf });
    if (error) console.error("[asaas-webhook] lnb_crm_get_by_cpf erro:", error);
    crmRow = (data as Record<string, unknown> | null) ?? null;
  }

  const telefone = String(crmRow?.telefone || "").replace(/\D/g, "");
  const nome = String(crmRow?.nome || "");
  const email = String(crmRow?.email || "");
  const origem = (crmRow?.origem === "whatsapp" ? "whatsapp" : "site") as "site" | "whatsapp";
  const razaoSocial = String(crmRow?.razao_social || "");
  const cpfResponsavel = String(crmRow?.cpf_responsavel || "");
  const nomeResponsavel = String(crmRow?.nome_responsavel || "");

  if (!telefone) {
    console.error("[asaas-webhook] CRM não tem telefone pra documento:", documento);
  }

  // ─── CONSULTA CPF (combo Serasa Premium + Boa Vista Essencial) ──
  if (tipoFromRef === "consulta" && !isCNPJ) {
    let combo: ConsultaCombinada | null = null;
    let providerError: string | null = null;
    let providerStatus: "ok" | "sem_saldo" | "erro_provedor" = "ok";

    try {
      combo = await consultarCPFCombinado(cpf);
      // Se as DUAS fontes falharam, marca como erro de provedor
      if (!combo.serasa && !combo.boaVista) {
        const erros = [combo.serasaErro, combo.boaVistaErro].filter(Boolean).join(" | ");
        throw new Error(erros || "Ambas as fontes falharam");
      }
      // Log de qual fonte respondeu pra debug
      console.log(
        `[asaas-webhook] combo cpf=${cpf} serasa=${combo.serasa ? "ok" : "falhou"} boavista=${combo.boaVista ? "ok" : "falhou"}`
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      providerError = msg;
      providerStatus = msg.toLowerCase().includes("sem saldo") ? "sem_saldo" : "erro_provedor";
      console.error(`[asaas-webhook] ❌ API Full FALHOU cpf=${cpf} status=${providerStatus}: ${msg}`);
    }

    // Mantém variáveis compat com código abaixo
    const parsed = combo?.boaVista ?? null;
    const raw = combo?.boaVistaRaw ?? null;

    // Se API Full falhou, marca status e NÃO gera PDF fake — admin recebe email
    if (providerStatus !== "ok") {
      const { error: rpcErr } = await supa.rpc("webhook_registrar_consulta_falha_provider", {
        p_cpf: cpf,
        p_nome: nome,
        p_email: email,
        p_telefone: telefone,
        p_provider: "apifull",
        p_provider_status: providerStatus,
        p_provider_error: providerError,
        p_external_ref: String(externalRef),
      });
      if (rpcErr) console.error("[asaas-webhook] webhook_registrar_consulta_falha_provider erro:", rpcErr);

      // Notifica admin via email pra reprocessar manualmente
      try {
        const { sendEmail } = await import("@/lib/email");
        await sendEmail({
          to: "lucas@dosedegrowth.com.br",
          subject: `[LNB] ⚠️ Consulta paga sem processar — CPF ${cpf}`,
          html: `<h2>API Full falhou ao processar consulta paga</h2>
<p><b>CPF:</b> ${cpf}</p>
<p><b>Cliente:</b> ${nome} · ${email} · ${telefone}</p>
<p><b>Provider status:</b> ${providerStatus}</p>
<p><b>Erro:</b> ${providerError}</p>
<p><b>External ref:</b> ${externalRef}</p>
<p>Ação necessária: reprocessar manualmente após restaurar saldo da API Full.</p>`,
          text: `API Full falhou. CPF ${cpf}. Cliente ${nome}. Status: ${providerStatus}. Erro: ${providerError}`,
        });
      } catch (e) {
        console.error("[asaas-webhook] email admin erro:", e);
      }

      // Não chama finalizarConsulta (não gera PDF fake)
      console.warn(`[asaas-webhook] ⚠️ Consulta cpf=${cpf} NÃO processada. Admin notificado.`);
      return NextResponse.json({ ok: true });
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

    // ⚠️ AWAIT obrigatório — em Vercel serverless o processo morre após
    // a response, então fire-and-forget aborta a Promise silenciosamente.
    try {
      await finalizarConsulta({ cpf, nome, email, telefone, parsed, raw, origem, combo });
    } catch (e) {
      console.error("[asaas-webhook] erro finalizar consulta:", e);
    }
  }

  // ─── CONSULTA CNPJ ────────────────────────────────────
  if (tipoFromRef === "consulta_cnpj" && isCNPJ) {
    try {
      await finalizarConsultaCNPJ({
        cnpj,
        razaoSocial,
        cpfResponsavel,
        nomeResponsavel,
        email,
        telefone,
        externalRef: String(externalRef),
        origem,
        supa,
      });
    } catch (e) {
      console.error("[asaas-webhook] erro finalizar consulta CNPJ:", e);
    }
  }

  // ─── LIMPEZA CPF ──────────────────────────────────────
  if ((tipoFromRef === "limpeza" || tipoFromRef === "limpeza_desconto") && !isCNPJ) {
    const { error: rpcErr } = await supa.rpc("webhook_registrar_limpeza_fechada", {
      p_cpf: cpf,
      p_telefone: telefone,
    });
    if (rpcErr) console.error("[asaas-webhook] webhook_registrar_limpeza_fechada erro:", rpcErr);

    try {
      await finalizarLimpezaPaga({ cpf, nome, telefone, email, origem });
    } catch (e) {
      console.error("[asaas-webhook] erro finalizar limpeza:", e);
    }
  }

  // ─── LIMPEZA CNPJ ─────────────────────────────────────
  if (tipoFromRef === "limpeza_cnpj" && isCNPJ) {
    const { error: rpcErr } = await supa.rpc("webhook_registrar_limpeza_cnpj_fechada", {
      p_cnpj: cnpj,
      p_telefone: telefone,
    });
    if (rpcErr) console.error("[asaas-webhook] webhook_registrar_limpeza_cnpj_fechada erro:", rpcErr);

    try {
      await finalizarLimpezaCnpjPaga({ cnpj, razaoSocial, telefone, email, origem });
    } catch (e) {
      console.error("[asaas-webhook] erro finalizar limpeza CNPJ:", e);
    }
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

  const primeiroNome = i.nome.split(" ")[0] || "amigo(a)";
  const titulo = `🎉 Pagamento da Limpeza confirmado, ${primeiroNome}!`;
  const corpo =
    `Recebemos seu pagamento. Bora limpar seu nome! 💪\n\n` +
    `📋 *Próximos passos:*\n\n` +
    `1️⃣ Em até 4h úteis nossa equipe inicia o processo\n` +
    `2️⃣ Análise dos credores (até 2 dias úteis)\n` +
    `3️⃣ Atuação junto aos órgãos oficiais\n` +
    `    (Serasa, Boa Vista, SPC, IEPTB)\n` +
    `4️⃣ Você acompanha tudo no painel\n` +
    `5️⃣ Conclusão em até 20 dias úteis\n` +
    `6️⃣ Bônus: 12 meses de Blindagem ativada\n\n` +
    `Vou te atualizando aqui no WhatsApp a cada etapa.\n` +
    `Qualquer dúvida é só me chamar! 💙\n\n` +
    `📊 Acompanhe no seu painel:\n` +
    `👉 ${SITE}/conta/dashboard`;

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
          valor: "R$ 500,00",
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
  combo: ConsultaCombinada | null;
}

async function finalizarConsulta(input: FinalizarConsultaInput) {
  const { cpf, nome, email, telefone, parsed, raw, origem, combo } = input;
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

  // Score Boa Vista (extraído do raw)
  let scoreBoaVista: number | undefined;
  const scoresArr = saida.Scores as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(scoresArr) && scoresArr.length > 0) {
    const s0 = scoresArr[0];
    const sNum = parseFloat(String(s0?.score ?? s0?.valor ?? ""));
    if (!isNaN(sNum)) scoreBoaVista = sNum;
  }
  if (scoreBoaVista === undefined) {
    const direct = saida.Score ?? saida.score ?? rawObj.Score ?? rawObj.score;
    if (typeof direct === "number") scoreBoaVista = direct;
    else if (typeof direct === "string") {
      const n = parseFloat(direct);
      if (!isNaN(n)) scoreBoaVista = n;
    }
  }

  // Score Serasa (do combo) — score "principal" que aparece em destaque é o Serasa
  const scoreSerasa = combo?.serasa?.score ?? undefined;
  const score = scoreSerasa ?? scoreBoaVista; // fallback se Serasa falhou

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

  // Agrega pendências da Serasa também (com origem)
  const pendenciasCombo: Array<{ credor: string; valor: number; data?: string; origem?: string }> = [];
  for (const p of pendencias) {
    pendenciasCombo.push({ ...p, origem: "Boa Vista" });
  }
  if (combo?.serasa?.pendencias) {
    for (const p of combo.serasa.pendencias) {
      pendenciasCombo.push({ ...p, origem: "Serasa" });
    }
  }

  let pdfUrl: string | null = null;
  try {
    const r = await gerarESalvarRelatorio({
      cpf,
      nome,
      email,
      telefone,
      data_nascimento: combo?.serasa?.data_nascimento ?? undefined,
      situacao_receita: combo?.serasa?.situacao_receita ?? undefined,
      score_serasa: scoreSerasa,
      score_boa_vista: scoreBoaVista,
      score,
      probabilidade_pagamento: combo?.serasa?.probabilidade_pagamento ?? undefined,
      tem_pendencia: combo?.tem_pendencia ?? !!parsed?.tem_pendencia,
      qtd_pendencias: combo?.qtd_pendencias ?? parsed?.qtd_pendencias ?? 0,
      total_dividas: combo?.total_dividas ?? parsed?.total_dividas ?? 0,
      qtd_protestos: combo?.serasa?.qtd_protestos ?? 0,
      qtd_cheques_sem_fundo: combo?.serasa?.qtd_cheques_sem_fundo ?? 0,
      pendencias: pendenciasCombo,
    });
    if (r.ok) {
      pdfUrl = r.pdfUrl;
      const supa2 = await createClient();
      // Atualiza TUDO em LNB_Consultas (pdf_url + tem_pendencia + qtd + total + resumo)
      // Antes só atualizava pdf_url e tem_pendencia/qtd ficava null → travava tela "gerando"
      // Agrega pendências das duas fontes
      const temPendCombo = combo?.tem_pendencia ?? !!parsed?.tem_pendencia;
      const qtdCombo = combo?.qtd_pendencias ?? parsed?.qtd_pendencias ?? 0;
      const totalCombo = combo?.total_dividas ?? parsed?.total_dividas ?? 0;
      const resumoCombo = temPendCombo
        ? `Foram encontradas ${qtdCombo} pendência(s) em seu nome, totalizando R$ ${totalCombo.toFixed(2)}. Fonte: Serasa Experian + Boa Vista SCPC.`
        : "Não foram encontradas pendências em seu nome nas bases Serasa Experian e Boa Vista SCPC.";

      const rpc1 = await supa2.rpc("webhook_set_consulta_resultado", {
        p_cpf: cpf,
        p_pdf_url: pdfUrl,
        p_tem_pendencia: temPendCombo,
        p_qtd_pendencias: qtdCombo,
        p_total_dividas: totalCombo,
        p_resumo: resumoCombo,
        p_resultado_raw: raw as unknown as object,
        p_score: score ?? null,
        p_score_serasa: scoreSerasa ?? null,
        p_score_boa_vista: scoreBoaVista ?? null,
        p_resultado_serasa_raw: (combo?.serasaRaw as unknown as object) ?? null,
        p_resultado_boa_vista_raw: (combo?.boaVistaRaw as unknown as object) ?? null,
      });
      if (rpc1.error) console.error("[asaas-webhook] webhook_set_consulta_resultado erro:", rpc1.error);
      const rpc2 = await supa2.rpc("lnb_crm_set_consulta_resultado", {
        p_telefone: telefone,
        p_score: score ?? null,
        p_tem_pendencia: !!parsed?.tem_pendencia,
        p_qtd_pendencias: parsed?.qtd_pendencias || 0,
        p_total_dividas: parsed?.total_dividas || 0,
        p_pdf_url: pdfUrl,
      });
      if (rpc2.error) console.error("[asaas-webhook] lnb_crm_set_consulta_resultado erro:", rpc2.error);
      console.log(`[asaas-webhook] ✓ PDF gravado: cpf=${cpf} url=${pdfUrl} pendencia=${!!parsed?.tem_pendencia}`);
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
      const { enviarTextoChatwoot } = await import("@/lib/chatwoot-attach");
      const convId = await buscarConversationIdPorTelefone(telefone);

      // 1) Gera senha temporária pro cliente acessar painel
      let senhaTemp: string | null = null;
      try {
        const supaSenha = await createClient();
        const { data: senhaResp } = await supaSenha.rpc("lnb_gerar_senha_temporaria", {
          p_cpf: cpf,
          p_nome: nome,
          p_email: email,
          p_telefone: telefone,
        });
        const r = senhaResp as { senha_temporaria?: string };
        senhaTemp = r?.senha_temporaria ?? null;
      } catch (e) {
        console.error("[asaas-webhook] gerar senha tempo erro:", e);
      }

      const cpfFmt = `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`;
      const primeiroNome = nome.split(" ")[0] || "amigo(a)";

      // 2) Monta resumo texto detalhado — usa combo (Serasa Premium) que tem TODAS as pendências
      // combo.serasa.pendencias inclui PEND_FINANCEIRAS, PEND_REFIN, PEND_VENCIDAS
      // (parsed.pendencias é só do Boa Vista — incompleto)
      const pendenciasCombinadas = combo?.serasa?.pendencias?.length
        ? combo.serasa.pendencias
        : parsed?.pendencias ?? [];
      const qtdTotal = combo?.qtd_pendencias ?? parsed?.qtd_pendencias ?? 0;
      const totalDividas = combo?.total_dividas ?? parsed?.total_dividas ?? 0;
      const temPendCombo = combo?.tem_pendencia ?? !!parsed?.tem_pendencia;

      let resumoTexto: string;
      if (temPendCombo) {
        const credores = pendenciasCombinadas
          .slice(0, 5)
          .map(
            (p, i) =>
              `${i + 1}. ${p.credor} — R$ ${p.valor
                .toFixed(2)
                .replace(".", ",")}${p.data ? ` (${p.data})` : ""}`
          )
          .join("\n");
        resumoTexto =
          `✅ *Pagamento confirmado, ${primeiroNome}!*\n` +
          `Sua consulta foi processada.\n\n` +
          `⚠️ *Encontrei ${qtdTotal} pendência(s) no seu CPF*, ` +
          `totalizando R$ ${totalDividas.toFixed(2).replace(".", ",")}\n\n` +
          `📊 *Análise de crédito:*\n` +
          `• Score Serasa: ${scoreSerasa ?? score ?? "—"}\n` +
          `• Score Boa Vista: ${scoreBoaVista ?? "—"}\n` +
          `• Status: POSSUI PENDÊNCIAS\n\n` +
          `💰 *Credores encontrados:*\n${credores}\n\n` +
          `Quer limpar essas pendências? Me responde aqui que eu te explico! 💙`;
      } else {
        resumoTexto =
          `✅ *Pagamento confirmado, ${primeiroNome}!*\n` +
          `Sua consulta foi processada.\n\n` +
          `🎉 *Boa notícia: seu nome está LIMPO!*\n` +
          `Não encontrei pendências, protestos ou cheques sem fundo nas bases consultadas.\n\n` +
          `📊 *Score atual:*\n` +
          `• Serasa: ${score ?? "—"}\n\n` +
          `Continue mantendo as contas em dia pra preservar seu score! 💙`;
      }

      // 3) Bloco de acesso ao painel (com senha temporária)
      const blocoAcesso = senhaTemp
        ? `\n\n📄 *Pra baixar o PDF completo + acompanhar o processo:*\n` +
          `👉 ${SITE}/conta/login\n\n` +
          `*Seu acesso:*\n` +
          `CPF: ${cpfFmt}\n` +
          `Senha: \`${senhaTemp}\`\n\n` +
          `_(Recomendo trocar a senha depois do primeiro acesso)_`
        : `\n\n📄 *Acesse o painel pra baixar o PDF:*\n👉 ${SITE}/conta/login`;

      const textoCompleto = resumoTexto + blocoAcesso;

      if (convId) {
        await enviarTextoChatwoot(convId, textoCompleto);
      } else {
        await sendWhatsApp(telefone, textoCompleto, nome);
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
  let parsedRespSerasa: Awaited<ReturnType<typeof consultarCNPJCompleto>>["responsavelSerasa"] = null;
  let respSerasaRaw: Awaited<ReturnType<typeof consultarCNPJCompleto>>["responsavelSerasaRaw"] = null;

  try {
    const result = await consultarCNPJCompleto(i.cnpj, i.cpfResponsavel);
    parsedPJ = result.pj;
    pjRaw = result.pjRaw;
    parsedResp = result.responsavel;
    respRaw = result.responsavelRaw;
    parsedRespSerasa = result.responsavelSerasa;
    respSerasaRaw = result.responsavelSerasaRaw;
    console.log(
      `[asaas-webhook] CNPJ ${i.cnpj}: PJ=${parsedPJ ? "ok" : "falhou"} serasa=${parsedRespSerasa ? "ok" : "falhou"} boavista=${parsedResp ? "ok" : "falhou"}`
    );
  } catch (e) {
    console.error("[asaas-webhook] erro consulta CNPJ Completo (segue):", e);
  }

  // Agrega tem_pendencia + qtd da união Serasa + Boa Vista
  const temPendCNPJ =
    (parsedRespSerasa?.tem_pendencia ?? false) || (parsedResp?.tem_pendencia ?? false);
  const qtdPendCNPJ = Math.max(
    (parsedRespSerasa?.qtd_pendencias ?? 0) +
      (parsedRespSerasa?.qtd_protestos ?? 0) +
      (parsedRespSerasa?.qtd_cheques_sem_fundo ?? 0),
    parsedResp?.qtd_pendencias ?? 0
  );
  const totalDivCNPJ = Math.max(
    (parsedRespSerasa?.total_dividas ?? 0) + (parsedRespSerasa?.total_protestos ?? 0),
    parsedResp?.total_dividas ?? 0
  );

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

  // Score Boa Vista (extraído do raw)
  const rawObj = (respRaw as Record<string, unknown>) || {};
  let scoreBoaVistaCNPJ: number | undefined;
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
    if (!isNaN(sNum)) scoreBoaVistaCNPJ = sNum;
  }
  if (scoreBoaVistaCNPJ === undefined) {
    const direct = saida.Score ?? saida.score ?? rawObj.Score ?? rawObj.score;
    if (typeof direct === "number") scoreBoaVistaCNPJ = direct;
    else if (typeof direct === "string") {
      const n = parseFloat(direct);
      if (!isNaN(n)) scoreBoaVistaCNPJ = n;
    }
  }

  // Score Serasa do sócio (preferido pro PDF — é o que cliente conhece)
  const scoreSerasaCNPJ = parsedRespSerasa?.score ?? undefined;
  const score = scoreSerasaCNPJ ?? scoreBoaVistaCNPJ;

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
      score_serasa: scoreSerasaCNPJ,
      score_boa_vista: scoreBoaVistaCNPJ,
      probabilidade_pagamento: parsedRespSerasa?.probabilidade_pagamento ?? undefined,
      data_nascimento_responsavel: parsedRespSerasa?.data_nascimento ?? undefined,
      situacao_receita_responsavel: parsedRespSerasa?.situacao_receita ?? undefined,
      tem_pendencia: temPendCNPJ,
      qtd_pendencias: qtdPendCNPJ,
      total_dividas: totalDivCNPJ,
      qtd_protestos: parsedRespSerasa?.qtd_protestos ?? 0,
      qtd_cheques_sem_fundo: parsedRespSerasa?.qtd_cheques_sem_fundo ?? 0,
      pendencias: parsedResp?.pendencias,
    });
    if (r.ok) {
      pdfUrl = r.pdfUrl;
      // Atualiza pdf_url + tem_pendencia/qtd/total_dividas em LNB_Consultas
      // (mesmo bug do CPF aplicado aqui)
      const rpc = await i.supa.rpc("webhook_set_consulta_cnpj_resultado", {
        p_cnpj: i.cnpj,
        p_pdf_url: pdfUrl,
        p_tem_pendencia: !!parsedResp?.tem_pendencia,
        p_qtd_pendencias: parsedResp?.qtd_pendencias || 0,
        p_total_dividas: parsedResp?.total_dividas || 0,
        p_resumo: parsedResp?.tem_pendencia
          ? `Foram encontradas ${parsedResp.qtd_pendencias} pendência(s) no CPF do responsável, totalizando R$ ${parsedResp.total_dividas.toFixed(2)}.`
          : "Não foram encontradas pendências no CPF do responsável. Empresa apta a obter crédito.",
      });
      if (rpc.error) console.error("[asaas-webhook] webhook_set_consulta_cnpj_resultado erro:", rpc.error);
      console.log(`[asaas-webhook] ✓ PDF CNPJ gravado: cnpj=${i.cnpj} url=${pdfUrl}`);
    } else {
      console.error("[asaas-webhook] PDF CNPJ erro:", r.error);
    }
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
