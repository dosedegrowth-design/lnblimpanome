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
 *   2) Parser — extrai pendências
 *   3) Resend — envia email de teste pra um email real
 *   4) Chatwoot — envia WhatsApp de teste (template ou texto livre)
 *   5) PDF Webhook — dispara n8n PDF Generator
 *
 * Cada passo retorna: { ok, dados, latencia_ms, erro }
 *
 * IMPORTANTE: NÃO grava em LNB_Consultas/CRM (é dry-run).
 *
 * Body:
 *   {
 *     cpf: "11144477735",
 *     email: "lucas@dosedegrowth.com.br",
 *     telefone: "5511997440101",
 *     nome: "Lucas Teste",
 *     etapa?: "iniciado" | "documentacao" | "finalizado",
 *     tipo?: "limpeza" | "consulta" | "blindagem",
 *     skip?: ["api_full" | "email" | "whatsapp" | "pdf"]
 *   }
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

  // ─── 2) Templates de email + WhatsApp ───────────────
  const tpl = getTemplateEtapa(tipo, etapa);
  steps.push({
    step: "templates",
    ok: !!tpl,
    encontrado: !!tpl,
    titulo: tpl?.titulo,
    corpo_preview: tpl?.corpo?.slice(0, 200),
  });

  // ─── 3) Email Resend ────────────────────────────────
  if (!skip.includes("email") && email && tpl) {
    const t0 = Date.now();
    const html = renderEmailHTML({
      titulo: `[TESTE] ${tpl.titulo}`,
      corpo: tpl.corpo,
      mensagemExtra: parsed
        ? `Resultado consulta API Full: ${parsed.resumo}`
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
    steps.push({ step: "email", ok: null, skipped: !email || skip.includes("email") || !tpl });
  }

  // ─── 4) WhatsApp Chatwoot ────────────────────────────
  if (!skip.includes("whatsapp") && telefone && tpl) {
    const t0 = Date.now();
    const templateName = process.env.WPP_TEMPLATE_GENERICO;
    let wppResult;

    if (templateName) {
      // Modo template (Meta Cloud API)
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
      // Fallback texto livre (só funciona em janela 24h)
      const texto = `*[TESTE] ${tpl.titulo}*\n\n${tpl.corpo}\n\nAcesse: ${SITE}/conta/dashboard`;
      wppResult = await sendWhatsApp(telefone, texto, nome);
      steps.push({
        step: "whatsapp",
        modo: "texto_livre",
        ok: wppResult.ok,
        latencia_ms: Date.now() - t0,
        telefone,
        aviso: "Sem template configurado. Texto livre só funciona dentro da janela 24h.",
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
        response_preview: text.slice(0, 500),
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

  // ─── 6) Conferência das envs ─────────────────────────
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

  // ─── 7) RPCs Supabase (validar se existem e funcionam) ─
  const supa = await createClient();
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

  return NextResponse.json({
    ok: totalFail === 0,
    resumo: {
      total: steps.length,
      sucesso: totalOk,
      falhas: totalFail,
      ignorados: steps.filter((s) => s.ok === null).length,
    },
    cpf,
    timestamp: new Date().toISOString(),
    steps,
  });
}

function limitPreview(o: unknown): unknown {
  try {
    const s = JSON.stringify(o);
    if (s.length <= 1500) return o;
    return JSON.parse(s.slice(0, 1500) + "...\"}").catch?.(() => s.slice(0, 1500)) ?? s.slice(0, 1500);
  } catch {
    return String(o).slice(0, 1500);
  }
}
