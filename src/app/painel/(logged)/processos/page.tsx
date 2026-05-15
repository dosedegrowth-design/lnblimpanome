import { requireAdmin } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Briefcase } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { ProcessosKanban } from "./processos-kanban";
import { getEtapas, getTags } from "@/lib/kanban";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ tag?: string; q?: string; tipo?: string; funil?: string }>;
}

const LEGACY_TIPO_TAG: Record<string, string> = {
  limpeza:   "limpeza_cpf,limpeza_cnpj",
  blindagem: "blindagem",
  consulta:  "consulta_cpf,consulta_cnpj",
};

export interface ProcessoKanban {
  id: string;
  cpf: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  tag_servico: string | null;
  etapa: string;
  valor_pago: number | null;
  pdf_url: string | null;
  tem_pendencia: boolean | null;
  score: number | null;
  qtd_pendencias: number | null;
  total_dividas: number | null;
  created_at: string;
  updated_at: string;
}

export default async function ProcessosPage({ searchParams }: Props) {
  await requireAdmin();
  const sp = await searchParams;

  if (sp.tipo && LEGACY_TIPO_TAG[sp.tipo]) {
    redirect(`/painel/processos?tag=${LEGACY_TIPO_TAG[sp.tipo]}${sp.q ? `&q=${encodeURIComponent(sp.q)}` : ""}`);
  }

  const supa = await createClient();
  const [etapas, tags, processosResult] = await Promise.all([
    getEtapas(),
    getTags(),
    supa.rpc("admin_clientes_list"),
  ]);

  const processos = ((processosResult.data as { clientes?: ProcessoKanban[] } | null)?.clientes ?? []) as ProcessoKanban[];

  return (
    <div className="p-6 sm:p-8 max-w-[1600px] mx-auto">
      <PageHeader
        title="Processos"
        subtitle={`${processos.length} processo(s) · Kanban unificado com 2 funis`}
        icon={Briefcase}
      />

      <ProcessosKanban etapas={etapas} tags={tags} processos={processos} />
    </div>
  );
}
