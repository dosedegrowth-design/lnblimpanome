import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { consultarCPF, parseConsulta } from "@/lib/api-full";
import { sendEmail, renderEmailHTML } from "@/lib/email";
import { sendWhatsAppTemplate, sendWhatsApp } from "@/lib/chatwoot";

/**
 * GET /api/cron/blindagem-diaria
 *
 * Cron Vercel — roda diariamente às 09:00 BRT (configurado em vercel.json).
 * Itera todos os CPFs ativos em LNB_Blindagem com proxima_verificacao <= NOW(),
 * consulta API Full, atualiza estado e dispara alerta se aparecer nova pendência.
 *
 * Substitui o workflow n8n "Blindagem Cron LNB v03".
 *
 * Vercel envia header `x-vercel-cron-signature` (validado em produção).
 * Em dev, aceita sem signature.
 */
export async function GET(req: Request) {
  // Em produção: validar que veio do Vercel Cron
  if (process.env.NODE_ENV === "production") {
    const auth = req.headers.get("authorization");
    const expected = `Bearer ${process.env.CRON_SECRET || ""}`;
    if (process.env.CRON_SECRET && auth !== expected) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
  }

  const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://limpanomebrazil.com.br";
  const supa = await createClient();
  const t0 = Date.now();

  // Busca CPFs que precisam ser verificados hoje
  const { data: blindagens, error } = await supa
    .from("LNB_Blindagem")
    .select("id, cpf, nome, email, telefone, tem_pendencia_atual, ultima_verificacao")
    .eq("ativo", true)
    .or(`proxima_verificacao.is.null,proxima_verificacao.lte.${new Date().toISOString()}`);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const total = blindagens?.length || 0;
  let processadas = 0;
  let alertas = 0;
  let erros = 0;
  const detalhes: Array<Record<string, unknown>> = [];

  for (const b of blindagens || []) {
    try {
      const raw = await consultarCPF(b.cpf);
      const parsed = parseConsulta(raw);

      // Detecta NOVA pendência (não tinha, agora tem)
      const novaPendencia =
        !b.tem_pendencia_atual && parsed.tem_pendencia;

      // Atualiza estado via RPC SECURITY DEFINER
      await supa.rpc("blindagem_atualizar_verificacao" as never, {
        p_id: b.id,
        p_tem_pendencia: parsed.tem_pendencia,
        p_resultado_raw: raw as object,
        p_proxima_dias: 7, // próxima check em 7 dias
      } as never);

      processadas++;

      // Alerta se aparecer nova pendência
      if (novaPendencia) {
        alertas++;
        const titulo = "⚠️ Nova pendência detectada no seu CPF";
        const corpo = `Identificamos ${parsed.qtd_pendencias} pendência(s) no seu CPF totalizando R$ ${parsed.total_dividas.toFixed(2)}. Nossa equipe pode te ajudar a limpar.`;

        // Email
        if (b.email) {
          await sendEmail({
            to: b.email,
            subject: `[LNB · Blindagem] ${titulo}`,
            html: renderEmailHTML({
              titulo,
              corpo,
              nomeCliente: (b.nome || "").split(" ")[0],
              ctaUrl: `${SITE}/conta/blindagem`,
              ctaTexto: "Ver detalhes",
            }),
            text: `${titulo}\n\n${corpo}\n\nAcesse: ${SITE}/conta/blindagem`,
          });
        }

        // WhatsApp
        if (b.telefone) {
          const templateName = process.env.WPP_TEMPLATE_GENERICO;
          if (templateName) {
            await sendWhatsAppTemplate(
              b.telefone,
              {
                name: templateName,
                language: process.env.WPP_TEMPLATE_LANG || "pt_BR",
                parameters: [
                  (b.nome || "").split(" ")[0] || "Olá",
                  titulo,
                  corpo,
                  `${SITE}/conta/blindagem`,
                ],
              },
              b.nome || undefined
            );
          } else {
            await sendWhatsApp(
              b.telefone,
              `*${titulo}*\n\n${corpo}\n\n${SITE}/conta/blindagem`,
              b.nome || undefined
            );
          }
        }
      }

      detalhes.push({
        cpf: b.cpf,
        ok: true,
        tem_pendencia: parsed.tem_pendencia,
        nova_pendencia: novaPendencia,
        qtd: parsed.qtd_pendencias,
      });
    } catch (e) {
      erros++;
      detalhes.push({ cpf: b.cpf, ok: false, erro: String(e) });
    }
  }

  return NextResponse.json({
    ok: erros === 0,
    timestamp: new Date().toISOString(),
    duracao_ms: Date.now() - t0,
    resumo: { total, processadas, alertas, erros },
    detalhes,
  });
}
