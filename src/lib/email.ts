/**
 * Resend client server-side.
 * Documentação: https://resend.com/docs/api-reference/emails/send-email
 *
 * Necessário env RESEND_API_KEY (criar conta em resend.com).
 * Domínio verificado em RESEND_FROM (default: contato@limpanomebrazil.com.br).
 */

const RESEND_API = "https://api.resend.com/emails";

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export async function sendEmail(i: SendEmailInput): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("[email] RESEND_API_KEY não configurada — email NÃO enviado");
    return { ok: false, error: "RESEND_API_KEY não configurado" };
  }

  const from = process.env.RESEND_FROM || "Limpa Nome Brazil <contato@limpanomebrazil.com.br>";

  try {
    const r = await fetch(RESEND_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [i.to],
        subject: i.subject,
        html: i.html,
        text: i.text,
        reply_to: i.replyTo || "contato@limpanomebrazil.com.br",
      }),
    });
    if (!r.ok) {
      const t = await r.text();
      console.error("[email] resend erro:", r.status, t);
      return { ok: false, error: t };
    }
    const d = (await r.json()) as { id: string };
    return { ok: true, id: d.id };
  } catch (e) {
    console.error("[email] catch:", e);
    return { ok: false, error: String(e) };
  }
}

/**
 * Templates por etapa do processo.
 */
const ETAPAS_LIMPEZA: Record<string, { titulo: string; corpo: string }> = {
  iniciado: {
    titulo: "Recebemos sua contratação ✓",
    corpo: "Recebemos seu pagamento e iniciamos seu processo de limpeza de nome. Em breve nossa equipe entrará em contato pra dar continuidade.",
  },
  documentacao: {
    titulo: "Coletando documentação",
    corpo: "Estamos coletando a documentação necessária pra dar entrada na limpeza do seu nome. Pode levar até 2 dias úteis.",
  },
  analise: {
    titulo: "Em análise técnica",
    corpo: "Sua documentação está sendo analisada por nossa equipe técnica. Em breve passamos pra próxima etapa.",
  },
  execucao: {
    titulo: "Limpeza em execução 🚀",
    corpo: "Estamos executando a limpeza do seu nome junto aos órgãos de proteção de crédito. Em até 20 dias úteis seu nome estará limpo.",
  },
  finalizado: {
    titulo: "🎉 Seu nome foi limpo!",
    corpo: "Concluímos o processo de limpeza do seu nome. Acesse sua área no site pra baixar todos os comprovantes e ver os detalhes.",
  },
};

const ETAPAS_BLINDAGEM: Record<string, { titulo: string; corpo: string }> = {
  ativada: {
    titulo: "Blindagem de CPF ativada 🛡️",
    corpo: "Sua blindagem está ativa. Vamos monitorar seu CPF a cada 7 dias e te avisar se aparecer qualquer pendência.",
  },
  monitorando: {
    titulo: "Monitoramento ativo",
    corpo: "Continuamos monitorando seu CPF. Tudo certo até agora.",
  },
  alerta: {
    titulo: "⚠️ Pendência detectada no seu CPF",
    corpo: "Identificamos uma nova pendência no seu CPF. Nossa equipe já está analisando e em breve vai te orientar.",
  },
  encerrada: {
    titulo: "Blindagem encerrada",
    corpo: "Sua blindagem foi encerrada. Caso queira reativar, fale com a gente.",
  },
};

const ETAPAS_CONSULTA: Record<string, { titulo: string; corpo: string }> = {
  pago: {
    titulo: "Pagamento confirmado ✓",
    corpo: "Recebemos seu pagamento. Estamos consultando seu CPF agora.",
  },
  executada: {
    titulo: "Consulta realizada",
    corpo: "Sua consulta de CPF foi realizada. Em instantes você recebe o relatório completo.",
  },
  entregue: {
    titulo: "📨 Seu relatório está pronto!",
    corpo: "Acesse sua área no site pra ver o relatório completo da sua consulta de CPF.",
  },
};

const TEMPLATES: Record<string, Record<string, { titulo: string; corpo: string }>> = {
  limpeza:   ETAPAS_LIMPEZA,
  blindagem: ETAPAS_BLINDAGEM,
  consulta:  ETAPAS_CONSULTA,
};

export function getTemplateEtapa(tipo: string, etapa: string) {
  return TEMPLATES[tipo]?.[etapa] || null;
}

/**
 * Renderiza HTML do email com identidade visual LNB.
 */
export function renderEmailHTML({
  titulo, corpo, mensagemExtra, nomeCliente, ctaUrl, ctaTexto,
}: {
  titulo: string;
  corpo: string;
  mensagemExtra?: string;
  nomeCliente?: string;
  ctaUrl?: string;
  ctaTexto?: string;
}): string {
  const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://lnb-painel.vercel.app";
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${titulo}</title>
</head>
<body style="margin:0;padding:0;background:#f5f0e7;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#13312e;">
  <div style="max-width:580px;margin:0 auto;padding:24px;">
    <div style="background:#13312e;color:#fff;padding:24px;border-radius:16px 16px 0 0;text-align:center;">
      <p style="margin:0;font-size:24px;font-weight:bold;letter-spacing:1px;">
        <span style="color:#0298d9;">LNB</span> · LIMPA NOME BRAZIL
      </p>
    </div>
    <div style="background:#fff;padding:32px 24px;border-radius:0 0 16px 16px;">
      ${nomeCliente ? `<p style="margin:0 0 16px;font-size:14px;color:#666;">Olá, ${nomeCliente}!</p>` : ''}
      <h1 style="margin:0 0 16px;font-size:24px;color:#13312e;line-height:1.3;">${titulo}</h1>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#444;">${corpo}</p>
      ${mensagemExtra ? `<div style="margin:16px 0;padding:16px;background:#f5f0e7;border-radius:12px;border-left:4px solid #0298d9;font-size:14px;line-height:1.6;color:#333;">${mensagemExtra}</div>` : ''}
      ${ctaUrl && ctaTexto ? `
        <div style="margin:24px 0;text-align:center;">
          <a href="${ctaUrl}" style="display:inline-block;background:#0298d9;color:#fff;text-decoration:none;padding:14px 28px;border-radius:12px;font-weight:600;font-size:15px;">
            ${ctaTexto}
          </a>
        </div>
      ` : ''}
    </div>
    <div style="text-align:center;padding:16px 8px;font-size:12px;color:#888;line-height:1.6;">
      <p style="margin:0;">© ${new Date().getFullYear()} Limpa Nome Brazil. Todos os direitos reservados.</p>
      <p style="margin:8px 0 0;">
        <a href="${SITE}" style="color:#0298d9;text-decoration:none;">Acessar site</a>
        &nbsp;·&nbsp;
        <a href="${SITE}/conta/login" style="color:#0298d9;text-decoration:none;">Minha conta</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}
