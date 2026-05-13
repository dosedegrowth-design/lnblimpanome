import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { consultarCPF, parseConsulta } from "@/lib/api-full";
import { renderEmailHTML, sendEmail, getTemplateEtapa } from "@/lib/email";
import { sendWhatsApp, sendWhatsAppTemplate } from "@/lib/chatwoot";
import { createClient } from "@/lib/supabase/server";
import { cleanCPF, isValidCPF } from "@/lib/utils";

// @react-pdf/renderer precisa de Node runtime (não Edge)
export const runtime = "nodejs";
export const maxDuration = 60;

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
  const origem = (String(body?.origem || "site")) as "site" | "whatsapp";
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
      // Lista chaves do nível raiz e do inner pra ajudar debug
      const rawObj = (raw as Record<string, unknown>) || {};
      const chavesRaiz = Object.keys(rawObj);
      const innerObj = (rawObj.data || rawObj.resultado || rawObj.Resultado) as
        | Record<string, unknown>
        | undefined;
      const chavesInner = innerObj ? Object.keys(innerObj) : null;
      steps.push({
        step: "api_full",
        ok: true,
        latencia_ms: Date.now() - t0,
        parsed,
        chaves_raiz: chavesRaiz,
        chaves_inner: chavesInner,
        score_raw: rawObj.Score ?? rawObj.score ?? innerObj?.Score ?? innerObj?.score,
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

  // ─── 3) Email Resend (só se origem=site) ────────────
  if (!skip.includes("email") && email && origem === "site") {
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
    steps.push({
      step: "email",
      ok: null,
      skipped: true,
      motivo:
        !email ? "sem email"
        : skip.includes("email") ? "ignorado pelo usuário"
        : `origem=${origem} (email só roda quando origem=site)`,
    });
  }

  // ─── 4) WhatsApp Chatwoot (só se origem=whatsapp) ───
  if (!skip.includes("whatsapp") && telefone && origem === "whatsapp") {
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
    steps.push({
      step: "whatsapp",
      ok: null,
      skipped: true,
      motivo:
        !telefone ? "sem telefone"
        : skip.includes("whatsapp") ? "ignorado pelo usuário"
        : `origem=${origem} (whatsapp só roda quando origem=whatsapp)`,
    });
  }

  // ─── 5) PDF Generator (interno @react-pdf/renderer) ──
  let pdfUrlGerado: string | null = null;
  if (!skip.includes("pdf")) {
    const t0 = Date.now();
    try {
      const { gerarESalvarRelatorio } = await import("@/lib/pdf/gerar-relatorio");

      // Se tem dados parseados da API Full, usa eles. Senão, gera PDF mock.
      const dadosPdf = parsed
        ? {
            cpf,
            nome,
            email,
            telefone,
            score:
              typeof (raw as { Score?: unknown })?.Score === "number"
                ? ((raw as { Score: number }).Score)
                : undefined,
            tem_pendencia: parsed.tem_pendencia,
            qtd_pendencias: parsed.qtd_pendencias,
            total_dividas: parsed.total_dividas,
            pendencias: parsed.pendencias,
          }
        : {
            // Mock pra teste sem API Full
            cpf,
            nome: nome + " (TESTE)",
            email,
            telefone,
            score: 412,
            tem_pendencia: true,
            qtd_pendencias: 3,
            total_dividas: 4872.5,
            pendencias: [
              { credor: "Banco Exemplo S.A.", valor: 2500, data: "2024-08-15" },
              { credor: "Loja Demo Ltda.", valor: 1500, data: "2024-10-22" },
              { credor: "Cartão Teste", valor: 872.5, data: "2025-01-10" },
            ],
          };

      const r = await gerarESalvarRelatorio(dadosPdf);
      if (r.ok) {
        pdfUrlGerado = r.pdfUrl;
        steps.push({
          step: "pdf_gerado",
          ok: true,
          latencia_ms: Date.now() - t0,
          modo: parsed ? "dados_reais_api_full" : "mock_teste",
          path: r.path,
          pdf_url: r.pdfUrl,
        });
      } else {
        steps.push({
          step: "pdf_gerado",
          ok: false,
          latencia_ms: Date.now() - t0,
          erro: r.error,
        });
      }
    } catch (e) {
      steps.push({
        step: "pdf_gerado",
        ok: false,
        latencia_ms: Date.now() - t0,
        erro: String(e),
      });
    }
  } else {
    steps.push({ step: "pdf_gerado", ok: null, skipped: true });
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
      // Não é falha — é só info: dry-run não grava em LNB_Consultas
      steps.push({
        step: "pdf_disponivel",
        ok: null,
        skipped: true,
        encontrado: false,
        motivo: `CPF ${cpf} sem registro em LNB_Consultas (esperado em dry-run). Pra ver registro real, complete uma compra de R$ 29,99 em /consultar.`,
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
      ASAAS_API_KEY: !!process.env.ASAAS_API_KEY,
      ASAAS_WEBHOOK_TOKEN: !!process.env.ASAAS_WEBHOOK_TOKEN,
      ASAAS_ENV: process.env.ASAAS_ENV || "sandbox",
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
  // Prioridade: PDF gerado agora > PDF salvo no banco
  const pdfDisponivel = steps.find((s) => s.step === "pdf_disponivel") as
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
    pdf_url: pdfUrlGerado || pdfDisponivel?.pdf_url || null,
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
