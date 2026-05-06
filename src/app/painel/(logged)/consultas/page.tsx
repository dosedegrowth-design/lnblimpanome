import { requireAdmin } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatBRL, formatDateTimeBR, maskCPF } from "@/lib/utils";
import type { ConsultaRow } from "@/lib/supabase/types";
import { FileSearch, Globe, MessageCircle, Download } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { SearchInput } from "@/components/admin/search-input";
import { FilterSelect } from "@/components/admin/filter-select";
import { EmptyState } from "@/components/admin/empty-state";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ q?: string; status?: string; origem?: string }>;
}

export default async function ConsultasPage({ searchParams }: PageProps) {
  await requireAdmin();
  const sp = await searchParams;
  const q = sp.q?.trim();
  const filterStatus = sp.status;
  const filterOrigem = sp.origem;

  const supa = await createClient();
  let query = supa
    .from("LNB_Consultas")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);

  if (filterOrigem) query = query.eq("origem", filterOrigem);
  if (filterStatus === "paga")     query = query.eq("consulta_paga", true);
  if (filterStatus === "nao_paga") query = query.eq("consulta_paga", false);
  if (filterStatus === "limpa")    query = query.eq("tem_pendencia", false);
  if (filterStatus === "suja")     query = query.eq("tem_pendencia", true);

  if (q) query = query.or(`nome.ilike.%${q}%,cpf.ilike.%${q}%,email.ilike.%${q}%`);

  const { data } = await query;
  const consultas = (data ?? []) as ConsultaRow[];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <PageHeader title="Consultas" subtitle={`${consultas.length} consulta(s)`} icon={FileSearch} />

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <SearchInput placeholder="Nome, CPF, email..." />
        <FilterSelect
          paramName="status"
          defaultLabel="Todos os status"
          options={[
            { value: "paga",     label: "Pagas" },
            { value: "nao_paga", label: "Não pagas" },
            { value: "suja",     label: "Com pendência" },
            { value: "limpa",    label: "Nome limpo" },
          ]}
        />
        <FilterSelect
          paramName="origem"
          defaultLabel="Todas as origens"
          options={[
            { value: "site",     label: "Site" },
            { value: "whatsapp", label: "WhatsApp" },
          ]}
        />
      </div>

      <Card className="overflow-hidden">
        {consultas.length === 0 ? (
          <EmptyState icon={FileSearch} title="Nenhuma consulta encontrada" description="Ajuste os filtros ou aguarde." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-sand-50 border-b border-gray-200">
                <tr className="text-left text-gray-500 text-xs uppercase tracking-wider">
                  <th className="px-5 py-4 font-semibold">Cliente</th>
                  <th className="px-5 py-4 font-semibold">CPF</th>
                  <th className="px-5 py-4 font-semibold">Pendências</th>
                  <th className="px-5 py-4 font-semibold">Total Débito</th>
                  <th className="px-5 py-4 font-semibold">Origem</th>
                  <th className="px-5 py-4 font-semibold">Pago?</th>
                  <th className="px-5 py-4 font-semibold">Fechou?</th>
                  <th className="px-5 py-4 font-semibold">PDF</th>
                  <th className="px-5 py-4 font-semibold">Realizada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {consultas.map((c) => (
                  <tr key={c.id} className="hover:bg-sand-50/40 transition-colors">
                    <td className="px-5 py-3 font-semibold text-forest-800">{c.nome ?? "—"}</td>
                    <td className="px-5 py-3 text-gray-700 font-mono text-xs">{maskCPF(c.cpf)}</td>
                    <td className="px-5 py-3">
                      {c.tem_pendencia ? (
                        <Badge variant="danger">{c.qtd_pendencias ?? 0} pendência(s)</Badge>
                      ) : (
                        <Badge variant="success">Limpo</Badge>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-700">{c.total_dividas ? formatBRL(c.total_dividas) : "—"}</td>
                    <td className="px-5 py-3">
                      {c.origem === "site" ? (
                        <span className="inline-flex items-center gap-1 text-xs text-brand-700"><Globe className="size-3.5" /> Site</span>
                      ) : c.origem === "whatsapp" ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-700"><MessageCircle className="size-3.5" /> WA</span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={c.consulta_paga ? "success" : "warning"}>
                        {c.consulta_paga ? "Sim" : "Não"}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={c.fechou_limpeza ? "success" : "default"}>
                        {c.fechou_limpeza ? "Sim" : "—"}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">
                      {c.pdf_url ? (
                        <a href={c.pdf_url} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-700 text-xs font-semibold">
                          <Download className="size-3.5" /> Abrir
                        </a>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs whitespace-nowrap">{formatDateTimeBR(c.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
