import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/admin";
import { notificarMudancaEtapa } from "@/lib/notify";

/**
 * POST /api/admin/processos/mover-etapa
 * { processo_id, nova_etapa, mensagem?, notificar_cliente=true }
 *
 * 1) Move etapa via RPC (registra evento na timeline)
 * 2) Se notificar_cliente: dispara email + WhatsApp
 */
export async function POST(req: Request) {
  await requireAdmin();
  const { processo_id, nova_etapa, mensagem, notificar_cliente = true } = await req.json();

  if (!processo_id || !nova_etapa) {
    return NextResponse.json({ ok: false, error: "Parâmetros inválidos" }, { status: 400 });
  }

  const supa = await createClient();
  const { data, error } = await supa.rpc("admin_processo_mover_etapa", {
    p_processo_id: processo_id,
    p_nova_etapa: nova_etapa,
    p_mensagem: mensagem ?? null,
    p_notificar_cliente: notificar_cliente,
  });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  if (data && (data as { ok: boolean }).ok === false) {
    return NextResponse.json(data, { status: 400 });
  }

  // Notificar cliente
  if (notificar_cliente) {
    try {
      const admin = createAdminClient();
      const { data: proc } = await admin
        .from("lnb_processos")
        .select("nome, email, telefone, tipo")
        .eq("id", processo_id)
        .single();

      if (proc) {
        const result = await notificarMudancaEtapa({
          tipo: proc.tipo as "limpeza" | "blindagem" | "consulta",
          etapa: nova_etapa,
          cliente: { nome: proc.nome, email: proc.email, telefone: proc.telefone },
          mensagemExtra: mensagem,
        });

        // Marca evento como notificado
        const eventoId = (data as { evento_id?: string })?.evento_id;
        if (eventoId) {
          await admin
            .from("lnb_processo_eventos")
            .update({
              notificou_email: result.email,
              notificou_wa: result.whatsapp,
            })
            .eq("id", eventoId);
        }
      }
    } catch (e) {
      console.error("[mover-etapa] notify erro:", e);
    }
  }

  return NextResponse.json({ ok: true });
}
