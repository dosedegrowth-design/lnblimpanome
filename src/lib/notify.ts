/**
 * Helper unificado: notifica cliente por email + WhatsApp em uma chamada.
 * Não bloqueia se um falhar — registra no audit_log.
 */
import { sendEmail, renderEmailHTML, getTemplateEtapa } from "./email";
import { sendWhatsApp } from "./chatwoot";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://lnb-painel.vercel.app";

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

  // Email
  if (i.cliente.email) {
    const html = renderEmailHTML({
      titulo: tpl.titulo,
      corpo: tpl.corpo,
      mensagemExtra: i.mensagemExtra,
      nomeCliente: i.cliente.nome.split(" ")[0],
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

  // WhatsApp
  if (i.cliente.telefone) {
    const texto = `*${tpl.titulo}*\n\n${tpl.corpo}${
      i.mensagemExtra ? "\n\n" + i.mensagemExtra : ""
    }\n\nAcesse sua conta: ${SITE}/conta/dashboard`;
    const r = await sendWhatsApp(i.cliente.telefone, texto);
    result.whatsapp = r.ok;
  }

  return result;
}
