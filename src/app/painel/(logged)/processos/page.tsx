import { requireAdmin } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Briefcase } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { SearchInput } from "@/components/admin/search-input";
import { ProcessosKanban } from "./processos-kanban";
import { getEtapas, getTags } from "@/lib/kanban";
import { TagFilter } from "./tag-filter";
import type { ProcessoRow } from "@/lib/processos";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ tag?: string; q?: string; tipo?: string }>;
}

// Mapeamento legado: ?tipo=X → ?tag=Y
const LEGACY_TIPO_TAG: Record<string, string> = {
  limpeza:   "limpeza_cpf,limpeza_cnpj",
  blindagem: "blindagem",
  consulta:  "consulta_cpf,consulta_cnpj",
};

export default async function ProcessosPage({ searchParams }: Props) {
  await requireAdmin();
  const sp = await searchParams;

  // Redirect 301 de deep links antigos (?tipo=X)
  if (sp.tipo && LEGACY_TIPO_TAG[sp.tipo]) {
    redirect(`/painel/processos?tag=${LEGACY_TIPO_TAG[sp.tipo]}${sp.q ? `&q=${encodeURIComponent(sp.q)}` : ""}`);
  }

  const tagsFiltro = (sp.tag || "").split(",").filter(Boolean);
  const q = sp.q?.trim() || "";

  const [etapasResult, tagsResult, processosResult] = await Promise.all([
    getEtapas(),
    getTags(),
    (async () => {
      const supa = await createClient();
      const { data } = await supa.rpc("admin_processos_list", {
        p_tipo: null,
        p_etapa: null,
        p_responsavel_id: null,
      });
      return (data ?? []) as (ProcessoRow & { tag_servico: string | null })[];
    })(),
  ]);

  const etapas = etapasResult;
  const tags = tagsResult;
  let processos = processosResult;

  // Filtro por tag
  if (tagsFiltro.length > 0) {
    processos = processos.filter((p) => p.tag_servico && tagsFiltro.includes(p.tag_servico));
  }

  // Filtro por busca
  if (q) {
    const lq = q.toLowerCase();
    const lqNum = lq.replace(/\D/g, "");
    processos = processos.filter(
      (p) =>
        p.nome.toLowerCase().includes(lq) ||
        p.cpf.includes(lqNum) ||
        (p.email || "").toLowerCase().includes(lq) ||
        (p.telefone || "").includes(lqNum)
    );
  }

  return (
    <div className="p-6 sm:p-8 max-w-[1400px] mx-auto">
      <PageHeader
        title="Processos"
        subtitle={`${processos.length} processo(s) ativo(s) · Kanban unificado`}
        icon={Briefcase}
      />

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <SearchInput placeholder="Nome, CPF, email, telefone..." />
        <TagFilter tags={tags} selecionadas={tagsFiltro} />
      </div>

      <ProcessosKanban etapas={etapas} tags={tags} processos={processos} />
    </div>
  );
}
