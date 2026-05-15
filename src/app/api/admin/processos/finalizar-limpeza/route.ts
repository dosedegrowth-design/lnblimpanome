/**
 * POST /api/admin/processos/finalizar-limpeza
 *
 * Quando time termina a limpeza junto aos orgaos:
 *  1. Dispara nova consulta CPF (custo ~R$ 8,29 do provedor)
 *  2. Gera novo PDF "Nome Limpo"
 *  3. Atualiza pdf_url do processo
 *  4. Move etapa para 'aguardando_orgaos' (3-5 dias uteis pra constar em todo sistema)
 *  5. Envia email pro cliente avisando do prazo
 *  6. Cria evento de timeline
 *
 * Body: { processo_id: uuid }
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin";
import { consultarCPFCombinado } from "@/lib/api-full";
import { gerarESalvarRelatorio } from "@/lib/pdf/gerar-relatorio";

export const runtime = "nodejs";
export const maxDuration = 60;

interface ProcessoBasico {
  id: string;
  cpf: string;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  etapa: string;
  valor_pago: number | null;
}

export async function POST(req: Request) {
  const ctx = await requireAdmin(["owner", "admin"]);
  const { processo_id } = await req.json();

  if (!processo_id) {
    return NextResponse.json({ ok: false, error: "processo_id obrigatorio" }, { status: 400 });
  }

  const supa = await createClient();

  // 1) Carrega processo
  const { data: pData, error: pErr } = await supa
    .from("lnb_processos")
    .select("id, cpf, nome, email, telefone, etapa, valor_pago")
    .eq("id", processo_id)
    .maybeSingle<ProcessoBasico>();

  if (pErr || !pData) {
    return NextResponse.json({ ok: false, error: "processo nao encontrado" }, { status: 404 });
  }

  const cpf = pData.cpf.replace(/\D/g, "");

  // 2) Dispara nova consulta API Full
  let combo;
  try {
    combo = await consultarCPFCombinado(cpf);
    if (!combo.serasa && !combo.boaVista) {
      throw new Error(combo.serasaErro || combo.boaVistaErro || "Ambas fontes falharam");
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[finalizar-limpeza] consulta erro:", msg);
    return NextResponse.json(
      { ok: false, error: `Falha na consulta de verificacao: ${msg}` },
      { status: 502 }
    );
  }

  // 3) Gera novo PDF "Nome Limpo" (mesmo template; com dados atualizados)
  const scoreSerasa = combo.serasa?.score;
  const scoreBoaVista = undefined; // (BV n vem direto no parsed)
  const pendenciasCombo: Array<{ credor: string; valor: number; data?: string; origem?: string }> = [];
  if (combo.serasa?.pendencias) {
    for (const p of combo.serasa.pendencias) pendenciasCombo.push({ ...p, origem: "Serasa" });
  }

  let pdfUrl: string | null = null;
  try {
    const r = await gerarESalvarRelatorio({
      cpf,
      nome: pData.nome ?? undefined,
      email: pData.email ?? undefined,
      telefone: pData.telefone ?? undefined,
      score_serasa: scoreSerasa ?? undefined,
      score_boa_vista: scoreBoaVista ?? undefined,
      score: scoreSerasa ?? undefined,
      tem_pendencia: combo.tem_pendencia ?? false,
      qtd_pendencias: combo.qtd_pendencias ?? 0,
      total_dividas: combo.total_dividas ?? 0,
      qtd_protestos: combo.serasa?.qtd_protestos ?? undefined,
      qtd_cheques_sem_fundo: combo.serasa?.qtd_cheques_sem_fundo ?? undefined,
      pendencias: pendenciasCombo,
    });
    if (r.ok) pdfUrl = r.pdfUrl;
    else console.error("[finalizar-limpeza] PDF erro:", r.error);
  } catch (e) {
    console.error("[finalizar-limpeza] PDF exception:", e);
  }

  // 4) Move etapa pra aguardando_orgaos + atualiza pdf_url
  await supa.rpc("lnb_processo_mover_etapa", {
    p_processo_id: processo_id,
    p_etapa_codigo: "aguardando_orgaos",
  });

  if (pdfUrl) {
    await supa.from("lnb_processos").update({ pdf_url: pdfUrl }).eq("id", processo_id);
  }

  // 5) Email pro cliente com aviso de prazo
  if (pData.email) {
    try {
      const { sendEmail, renderEmailHTML } = await import("@/lib/email");
      const primeiroNome = (pData.nome || "amigo(a)").split(" ")[0];
      const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://limpanomebrazil.com.br";
      const titulo = combo.tem_pendencia
        ? "⏳ Limpeza em andamento — aguardando orgaos"
        : "✨ Limpamos seu nome! Aguarde a atualizacao";
      const corpo = combo.tem_pendencia
        ? `${primeiroNome}, finalizamos a tratativa com os credores. Em ate 3-5 dias uteis o resultado deve constar em todo o sistema. Vamos te confirmar quando estiver 100%.`
        : `${primeiroNome}, conseguimos limpar seu nome junto aos orgaos! Agora aguarde 3-5 dias uteis ate aparecer no Serasa Experian (app gratuito). Quando estiver 100% atualizado, te enviamos uma confirmacao final.`;

      await sendEmail({
        to: pData.email,
        subject: `[LNB] ${titulo}`,
        html: renderEmailHTML({
          titulo,
          corpo,
          mensagemExtra: pdfUrl
            ? `📄 <a href="${pdfUrl}" style="color:#0298d9;">Baixar relatorio atualizado</a>`
            : undefined,
          nomeCliente: primeiroNome,
          ctaUrl: `${SITE}/conta/dashboard`,
          ctaTexto: "Acompanhar no painel",
        }),
        text: `${titulo}\n\n${corpo}\n\nAcesse: ${SITE}/conta/dashboard`,
      });
    } catch (e) {
      console.error("[finalizar-limpeza] email erro (segue):", e);
    }
  }

  // 6) Audit log
  await supa.from("lnb_audit_log").insert({
    actor_id: ctx.user.id,
    actor_type: "admin",
    action: "finalizar_limpeza",
    resource_type: "lnb_processos",
    resource_id: processo_id,
    metadata: {
      pdf_url: pdfUrl,
      tem_pendencia: combo.tem_pendencia,
      score: scoreSerasa,
    },
  });

  return NextResponse.json({
    ok: true,
    processo_id,
    pdf_url: pdfUrl,
    tem_pendencia: combo.tem_pendencia,
    qtd_pendencias: combo.qtd_pendencias,
    score: scoreSerasa,
    proxima_etapa: "aguardando_orgaos",
  });
}
