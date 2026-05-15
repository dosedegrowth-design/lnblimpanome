import { requireAdmin } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";
import { Sparkles } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { LimpezaBoard } from "./limpeza-board";
import { getEtapas, getTags } from "@/lib/kanban";
import type { ProcessoRow } from "@/lib/processos";

export const dynamic = "force-dynamic";

type ProcessoLimpeza = ProcessoRow & {
  tag_servico?: string | null;
  pdf_url?: string | null;
  valor_pago?: number | null;
};

export default async function LimpezaPage() {
  await requireAdmin();

  const [etapas, tags, processos] = await Promise.all([
    getEtapas(),
    getTags(),
    (async () => {
      const supa = await createClient();
      const { data } = await supa.rpc("admin_processos_list", {
        p_tipo: null,
        p_etapa: null,
        p_responsavel_id: null,
      });
      return (data ?? []) as ProcessoLimpeza[];
    })(),
  ]);

  // Mostra apenas processos relevantes para o time operacional de limpeza:
  // - Quem pagou limpeza (limpeza_paga, em_tratativa, aguardando_orgaos, nome_limpo)
  // - Nao mostra Leads sem pagamento nem Blindagem ativa
  const etapasRelevantes = ["limpeza_paga", "em_tratativa", "aguardando_orgaos", "nome_limpo"];
  const filtrados = processos.filter((p) => etapasRelevantes.includes(p.etapa));

  const etapasFiltradas = etapas.filter((e) => etapasRelevantes.includes(e.codigo));

  return (
    <div className="p-6 sm:p-8 max-w-[1400px] mx-auto">
      <PageHeader
        title="Limpeza de Nome"
        subtitle={`${filtrados.length} processo(s) em tratativa · Vista operacional do time`}
        icon={Sparkles}
      />

      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800 mb-6 leading-snug">
        <strong>Como funciona:</strong> processos chegam aqui assim que cliente paga a limpeza.
        Movimente entre as etapas conforme avança o trabalho com os órgãos.
        Quando concluir, clique em <strong>Finalizar Limpeza</strong> no card —
        o sistema vai disparar nova consulta (custo ~R$ 8,29), gerar PDF atualizado e notificar o cliente
        que pode demorar 3-5 dias úteis para constar no Serasa Experian.
      </div>

      <LimpezaBoard etapas={etapasFiltradas} tags={tags} processos={filtrados} />
    </div>
  );
}
