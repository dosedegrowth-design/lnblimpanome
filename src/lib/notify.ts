/**
 * Helper unificado: notifica cliente por email + WhatsApp em uma chamada.
 * Não bloqueia se um falhar — registra no audit_log.
 *
 * Estratégia WhatsApp (Cloud API oficial Meta):
 * 1) Tenta TEMPLATE aprovado primeiro (funciona fora da janela 24h)
 * 2) Se template não configurado: tenta texto livre (só funciona em janela 24h)
 * 3) Falha silenciosa — email é o canal garantido
 */
import { sendEmail, renderEmailHTML, getTemplateEtapa } from "./email";
import { sendWhatsApp, sendWhatsAppTemplate } from "./chatwoot";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://lnb-painel.vercel.app";

/**
 * Mapeamento etapa → template WhatsApp aprovado no Meta Business Manager.
 *
 * Pra cada etapa, o nome do template (configurado em ENV) e os parâmetros
 * que vão preencher os placeholders {{1}}, {{2}}, ... do template.
 *
 * ENV vars opcionais:
 * - WPP_TEMPLATE_LANG = "pt_BR" (default)
 * - WPP_TEMPLATE_PAGAMENTO_CONFIRMADO = "lnb_pagamento_confirmado"
 * - WPP_TEMPLATE_LIMPEZA_INICIADO = "lnb_limpeza_iniciado"
 * - WPP_TEMPLATE_LIMPEZA_FINALIZADO = "lnb_limpeza_finalizado"
 * - WPP_TEMPLATE_GENERICO = "lnb_atualizacao_processo"
 *
 * Se a env do template específico não estiver setada, cai pro genérico.
 * Se nenhum template configurado, cai pra texto livre.
 */
function templateNameFor(tipo: string, etapa: string): string | null {
  const envKey = `WPP_TEMPLATE_${tipo.toUpperCase()}_${etapa.toUpperCase()}`;
  const specific = process.env[envKey];
  if (specific) return specific;

  const generic = process.env.WPP_TEMPLATE_GENERICO;
  if (generic) return generic;

  return null;
}

function templateLang(): string {
  return process.env.WPP_TEMPLATE_LANG || "pt_BR";
}

interface NotifyEtapaInput {
  tipo: "limpeza" | "blindagem" | "consulta";
  etapa: string;
  cliente: { nome: string; email: string | null; telefone: string | null };
  mensagemExtra?: string;
}

export async function notificarMudancaEtapa(i: NotifyEtapaInput) {
  const tpl = getTemplateEtapa(i.tipo, i.etapa);
  if (!tpl) return { email: false, whatsapp: false };

  const result = { email: false, whatsapp: false };
  const primeiroNome = i.cliente.nome.split(" ")[0];

  // Email (canal garantido)
  if (i.cliente.email) {
    const html = renderEmailHTML({
      titulo: tpl.titulo,
      corpo: tpl.corpo,
      mensagemExtra: i.mensagemExtra,
      nomeCliente: primeiroNome,
      ctaUrl: `${SITE}/conta/dashboard`,
      ctaTexto: "Acessar minha área",
    });
    const r = await sendEmail({
      to: i.cliente.email,
      subject: `[LNB] ${tpl.titulo}`,
      html,
      text: `${tpl.titulo}\n\n${tpl.corpo}\n\nAcesse: ${SITE}/conta/dashboard`,
    });
    result.email = r.ok;
  }

  // WhatsApp via template (se configurado) → fallback texto livre
  if (i.cliente.telefone) {
    const templateName = templateNameFor(i.tipo, i.etapa);

    if (templateName) {
      // Modo template (Meta Cloud API — funciona fora da janela 24h)
      const r = await sendWhatsAppTemplate(
        i.cliente.telefone,
        {
          name: templateName,
          language: templateLang(),
          parameters: [
            primeiroNome,
            tpl.titulo,
            tpl.corpo,
            `${SITE}/conta/dashboard`,
          ],
        },
        i.cliente.nome
      );
      result.whatsapp = r.ok;
    } else {
      // Fallback: texto livre (só funciona em janela 24h aberta)
      const texto = `*${tpl.titulo}*\n\n${tpl.corpo}${
        i.mensagemExtra ? "\n\n" + i.mensagemExtra : ""
      }\n\nAcesse sua conta: ${SITE}/conta/dashboard`;
      const r = await sendWhatsApp(i.cliente.telefone, texto, i.cliente.nome);
      result.whatsapp = r.ok;
    }
  }

  return result;
}
