import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { consultarCPF, parseConsulta } from "@/lib/api-full";
import { renderEmailHTML, sendEmail, getTemplateEtapa } from "@/lib/email";
import { sendWhatsApp, sendWhatsAppTemplate } from "@/lib/chatwoot";
import { createClient } from "@/lib/supabase/server";
import { cleanCPF, isValidCPF } from "@/lib/utils";

/**
 * POST /api/admin/teste-fluxo
 *
 * Dry-run completo do fluxo de venda. Só admin pode chamar (requireAdmin).
 *
 * Executa em sequência:
 *   1) API Full — consulta CPF
 *   2) Templates — pega template ou usa genérico
 *   3) Resend — envia email de teste
 *   4) Chatwoot — envia WhatsApp (template Meta ou texto livre)
 *   5) PDF Webhook — dispara n8n PDF Generator
 *   6) PDF disponível — busca pdf_url salva em LNB_Consultas
 *   7) Envs check
 *   8) RPCs Supabase — valida existência e conexão
 *
 * NÃO grava em LNB_Consultas/CRM (é dry-run).
 */
export async function POST(req: Request) {
  await requireAdmin();

  const body = await req.json().catch(() => ({}));
  const cpfRaw = String(body?.cpf || "");
  const email = String(body?.email || "");
  const telefone = String(body?.telefone || "").replace(/\D/g, "");
  const nome = String(body?.nome || "Cliente Teste");
  const etapa = String(body?.etapa || "iniciado");
  const tipo = (String(body?.tipo || "limpeza")) as "limpeza" | "consulta" | "blindagem";
  const skip: string[] = Array.isArray(body?.skip) ? body.skip : [];

  const cpf = cleanCPF(cpfRaw);
  if (!isValidCPF(cpf)) {
    return NextResponse.json({ ok: false, error: "CPF inválido" }, { status: 400 });
  }

  const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://limpanomebrazil.com.br";
  const steps: Array<Record<string, unknown>> = [];

  // ─── 1) API Full ────────────────────────────────────
  let parsed: ReturnType<typeof parseConsulta> | null = null;
  let raw: unknown = null;

  if (!skip.includes("api_full")) {
    const t0 = Date.now();
    try {
      raw = await consultarCPF(cpf);
      parsed = parseConsulta(raw as Parameters<typeof parseConsulta>[0]);
      steps.push({
        step: "api_full",
        ok: true,
        latencia_ms: Date.now() - t0,
        parsed,
        raw_preview: limitPreview(raw),
      });
    } catch (e) {
      steps.push({
        step: "api_full",
        ok: false,
        latencia_ms: Date.now() - t0,
        erro: String(e),
      });
    }
  } else {
    steps.push({ step: "api_full", ok: null, skipped: true });
  }

  // ─── 2) Templates de email + WhatsApp (com fallback) ───
  const tplFound = getTemplateEtapa(tipo, etapa);
  const tpl = tplFound || {
    titulo: `Atualização do seu processo (${tipo}/${etapa})`,
    corpo: `Há uma atualização no seu processo de ${tipo}, etapa "${etapa}". Acesse sua área pra mais detalhes.`,
  };

  steps.push({
    step: "templates",
    ok: true,
    encontrado: !!tplFound,
    fallback: !tplFound,
    titulo: tpl.titulo,
    corpo_preview: tpl.corpo.slice(0, 200),
    aviso: !tplFound
      ? `Combinação ${tipo}/${etapa} não tem template específico — usando texto genérico.`
      : undefined,
  });

  // ─── 3) Email Resend ────────────────────────────────
  if (!skip.includes("email") && email) {
    const t0 = Date.now();
    const html = renderEmailHTML({
      titulo: `[TESTE] ${tpl.titulo}`,
      corpo: tpl.corpo,
      mensagemExtra: parsed
        ? `<strong>Resultado da consulta API Full:</strong> ${parsed.resumo}` +
          (parsed.tem_pendencia
            ? `<br><br><strong>Pendências encontradas:</strong> ${parsed.qtd_pendencias} | <strong>Total:</strong> R$ ${parsed.total_dividas.toFixed(2)}`
            : "")
        : "Teste sem consulta API Full",
      nomeCliente: nome.split(" ")[0],
      ctaUrl: `${SITE}/conta/dashboard`,
      ctaTexto: "Acessar minha área",
    });
    const r = await sendEmail({
      to: email,
      subject: `[LNB · TESTE] ${tpl.titulo}`,
      html,
      text: `${tpl.titulo}\n\n${tpl.corpo}`,
    });
    steps.push({
      step: "email",
      ok: r.ok,
      latencia_ms: Date.now() - t0,
      destinatario: email,
      ...(r.ok ? { id: r.id } : { erro: r.error }),
    });
  } else {
    steps.push({ step: "email", ok: null, skipped: true });
  }

  // ─── 4) WhatsApp Chatwoot ────────────────────────────
  if (!skip.includes("whatsapp") && telefone) {
    const t0 = Date.now();
    const templateName = process.env.WPP_TEMPLATE_GENERICO;
    let wppResult;

    if (templateName) {
      wppResult = await sendWhatsAppTemplate(
        telefone,
        {
          name: templateName,
          language: process.env.WPP_TEMPLATE_LANG || "pt_BR",
          parameters: [
            nome.split(" ")[0],
            `[TESTE] ${tpl.titulo}`,
            tpl.corpo,
            `${SITE}/conta/dashboard`,
          ],
        },
        nome
      );
      steps.push({
        step: "whatsapp",
        modo: "template",
        template: templateName,
        ok: wppResult.ok,
        latencia_ms: Date.now() - t0,
        telefone,
        ...(wppResult.ok
          ? { conversation_id: wppResult.conversationId }
          : { erro: wppResult.error }),
      });
    } else {
      const texto = `*[TESTE] ${tpl.titulo}*\n\n${tpl.corpo}\n\nAcesse: ${SITE}/conta/dashboard`;
      wppResult = await sendWhatsApp(telefone, texto, nome);
      steps.push({
        step: "whatsapp",
        modo: "texto_livre",
        ok: wppResult.ok,
        latencia_ms: Date.now() - t0,
        telefone,
        aviso:
          "Sem template Meta configurado. Texto livre SÓ FUNCIONA dentro da janela 24h (cliente precisa ter mandado msg recentemente).",
        ...(wppResult.ok
          ? { conversation_id: wppResult.conversationId }
          : { erro: wppResult.error }),
      });
    }
  } else {
    steps.push({ step: "whatsapp", ok: null, skipped: true });
  }

  // ─── 5) PDF Generator (n8n) ──────────────────────────
  if (!skip.includes("pdf")) {
    const t0 = Date.now();
    const pdfUrl =
      process.env.LNB_PDF_WEBHOOK ||
      "https://webhook.dosedegrowth.cloud/webhook/gerar-pdf-lnb";
    try {
      const r = await fetch(pdfUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cpf, dryRun: true, teste: true }),
      });
      const text = await r.text();
      steps.push({
        step: "pdf_webhook",
        ok: r.ok,
        latencia_ms: Date.now() - t0,
        url: pdfUrl,
        status: r.status,
        response_preview: text.slice(0, 1000),
        instrucao_n8n:
          "Pra gerar o PDF de verdade: o n8n precisa ter o workflow 'PDF Generator LNB v03' importado e ATIVO. Sem isso, esse webhook só recebe a chamada e não faz nada.",
      });
    } catch (e) {
      steps.push({
        step: "pdf_webhook",
        ok: false,
        latencia_ms: Date.now() - t0,
        url: pdfUrl,
        erro: String(e),
      });
    }
  } else {
    steps.push({ step: "pdf_webhook", ok: null, skipped: true });
  }

  // ─── 6) Buscar PDF disponível em LNB_Consultas ───────
  // O PDF Generator (n8n) salva em Supabase Storage e atualiza pdf_url
  // na tabela LNB_Consultas. Esse step verifica se já tem PDF salvo.
  const supa = await createClient();
  try {
    const { data: consulta, error } = await supa
      .from("LNB_Consultas")
      .select("cpf, pdf_url, consulta_paga, tem_pendencia, qtd_pendencias, total_dividas, created_at")
      .eq("cpf", cpf)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      steps.push({
        step: "pdf_disponivel",
        ok: false,
        erro: error.message,
      });
    } else if (!consulta) {
      steps.push({
        step: "pdf_disponivel",
        ok: false,
        encontrado: false,
        aviso: `Nenhuma consulta cadastrada pro CPF ${cpf} em LNB_Consultas. Pra ver PDF real, faça o fluxo completo: comprar consulta → webhook MP → API Full → PDF gerado.`,
      });
    } else {
      steps.push({
        step: "pdf_disponivel",
        ok: !!consulta.pdf_url,
        encontrado: true,
        consulta_paga: consulta.consulta_paga,
        tem_pendencia: consulta.tem_pendencia,
        qtd_pendencias: consulta.qtd_pendencias,
        total_dividas: consulta.total_dividas,
        created_at: consulta.created_at,
        pdf_url: consulta.pdf_url || null,
        aviso: !consulta.pdf_url
          ? "Consulta existe mas pdf_url está vazio — o n8n PDF Generator ainda não rodou pra esse CPF. Verifique se o workflow está ativo."
          : "PDF disponível! Clique em pdf_url pra abrir.",
      });
    }
  } catch (e) {
    steps.push({ step: "pdf_disponivel", ok: false, erro: String(e) });
  }

  // ─── 7) Conferência das envs ─────────────────────────
  steps.push({
    step: "envs_check",
    ok: true,
    envs: {
      MP_ACCESS_TOKEN: !!process.env.MP_ACCESS_TOKEN,
      MP_WEBHOOK_SECRET: !!process.env.MP_WEBHOOK_SECRET,
      API_FULL_TOKEN: !!process.env.API_FULL_TOKEN,
      LNB_PDF_WEBHOOK: !!process.env.LNB_PDF_WEBHOOK,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      RESEND_API_KEY: !!process.env.RESEND_API_KEY,
      RESEND_FROM: !!process.env.RESEND_FROM,
      CHATWOOT_TOKEN: !!process.env.CHATWOOT_TOKEN,
      CHATWOOT_INBOX_ID: !!process.env.CHATWOOT_INBOX_ID,
      WPP_TEMPLATE_GENERICO: !!process.env.WPP_TEMPLATE_GENERICO,
      WPP_TEMPLATE_LANG: !!process.env.WPP_TEMPLATE_LANG,
    },
  });

  // ─── 8) RPCs Supabase ────────────────────────────────
  try {
    const { data: rpcEleg } = await supa.rpc("cliente_pode_contratar_limpeza", {
      p_cpf: cpf,
    });
    steps.push({
      step: "rpc_elegibilidade",
      ok: true,
      retorno: rpcEleg,
    });
  } catch (e) {
    steps.push({ step: "rpc_elegibilidade", ok: false, erro: String(e) });
  }

  const totalOk = steps.filter((s) => s.ok === true).length;
  const totalFail = steps.filter((s) => s.ok === false).length;

  // PDF URL pro front mostrar como link clicável
  const pdfStep = steps.find((s) => s.step === "pdf_disponivel") as
    | { pdf_url?: string }
    | undefined;

  return NextResponse.json({
    ok: totalFail === 0,
    resumo: {
      total: steps.length,
      sucesso: totalOk,
      falhas: totalFail,
      ignorados: steps.filter((s) => s.ok === null).length,
    },
    cpf,
    pdf_url: pdfStep?.pdf_url || null,
    timestamp: new Date().toISOString(),
    steps,
  });
}

function limitPreview(o: unknown): unknown {
  try {
    const s = JSON.stringify(o);
    if (s.length <= 1500) return o;
    return s.slice(0, 1500) + "... [truncado]";
  } catch {
    return String(o).slice(0, 1500);
  }
}
