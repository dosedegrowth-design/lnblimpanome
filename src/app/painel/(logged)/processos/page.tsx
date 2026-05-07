import { requireAdmin } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";
import { Briefcase } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { FilterSelect } from "@/components/admin/filter-select";
import { SearchInput } from "@/components/admin/search-input";
import { ProcessosKanban } from "./processos-kanban";
import { TIPOS_LABEL, type TipoServico, type ProcessoRow } from "@/lib/processos";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ tipo?: string; q?: string }>;
}

export default async function ProcessosPage({ searchParams }: Props) {
  await requireAdmin();
  const sp = await searchParams;
  const tipo = (sp.tipo as TipoServico | undefined) || "limpeza";
  const q = sp.q?.trim() || "";

  const supa = await createClient();
  const { data } = await supa.rpc("admin_processos_list", {
    p_tipo: tipo,
    p_etapa: null,
    p_responsavel_id: null,
  });

  let processos = (data ?? []) as ProcessoRow[];

  if (q) {
    const lq = q.toLowerCase();
    processos = processos.filter(
      (p) =>
        p.nome.toLowerCase().includes(lq) ||
        p.cpf.includes(lq.replace(/\D/g, "")) ||
        (p.email || "").toLowerCase().includes(lq) ||
        (p.telefone || "").includes(lq.replace(/\D/g, ""))
    );
  }

  return (
    <div className="p-6 sm:p-8 max-w-[1400px] mx-auto">
      <PageHeader
        title="Processos"
        subtitle={`${processos.length} processo(s) ativo(s) · ${TIPOS_LABEL[tipo]}`}
        icon={Briefcase}
      />

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <SearchInput placeholder="Nome, CPF, email, telefone..." />
        <FilterSelect
          paramName="tipo"
          defaultLabel="Limpeza de Nome"
          options={[
            { value: "limpeza",   label: "Limpeza de Nome" },
            { value: "blindagem", label: "Blindagem CPF" },
            { value: "consulta",  label: "Consulta CPF" },
          ]}
        />
      </div>

      <ProcessosKanban tipo={tipo} processos={processos} />
    </div>
  );
}
