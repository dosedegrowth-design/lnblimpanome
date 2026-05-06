import { requireAdmin } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatBRL, formatDateTimeBR, maskCPF } from "@/lib/utils";
import type { BlindagemRow } from "@/lib/supabase/types";
import { ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { SearchInput } from "@/components/admin/search-input";
import { FilterSelect } from "@/components/admin/filter-select";
import { EmptyState } from "@/components/admin/empty-state";
import { BlindagemActions } from "@/components/admin/blindagem-actions";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ q?: string; status?: string }>;
}

export default async function BlindagemPage({ searchParams }: PageProps) {
  await requireAdmin();
  const sp = await searchParams;
  const q = sp.q?.trim();
  const filterStatus = sp.status;

  const supa = await createClient();
  let query = supa
    .from("LNB_Blindagem")
    .select("*")
    .order("created_at", { ascending: false });

  if (filterStatus === "ativa") query = query.eq("ativo", true);
  if (filterStatus === "pausada") query = query.eq("ativo", false);
  if (filterStatus === "alerta") query = query.eq("tem_pendencia_atual", true);
  if (q) query = query.or(`nome.ilike.%${q}%,cpf.ilike.%${q}%,email.ilike.%${q}%`);

  const { data } = await query;
  const items = (data ?? []) as BlindagemRow[];
  const ativas = items.filter((i) => i.ativo).length;
  const alertas = items.filter((i) => i.ativo && i.tem_pendencia_atual).length;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Blindagem"
        subtitle={`${ativas} ativa(s) · ${alertas} alerta(s) · ${items.length} total`}
        icon={ShieldCheck}
      />

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <SearchInput placeholder="Nome, CPF, email..." />
        <FilterSelect
          paramName="status"
          defaultLabel="Todos os status"
          options={[
            { value: "ativa",   label: "Ativa" },
            { value: "pausada", label: "Pausada" },
            { value: "alerta",  label: "Com alerta" },
          ]}
        />
      </div>

      <Card className="overflow-hidden">
        {items.length === 0 ? (
          <EmptyState icon={ShieldCheck} title="Nenhuma blindagem encontrada" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-sand-50 border-b border-gray-200">
                <tr className="text-left text-gray-500 text-xs uppercase tracking-wider">
                  <th className="px-5 py-4 font-semibold">Cliente</th>
                  <th className="px-5 py-4 font-semibold">CPF</th>
                  <th className="px-5 py-4 font-semibold">Plano</th>
                  <th className="px-5 py-4 font-semibold">Valor</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 font-semibold">Pendência?</th>
                  <th className="px-5 py-4 font-semibold">Próxima verif.</th>
                  <th className="px-5 py-4 font-semibold">Última verif.</th>
                  <th className="px-5 py-4 font-semibold">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((b) => (
                  <tr key={b.id} className="hover:bg-sand-50/40 transition-colors">
                    <td className="px-5 py-3 font-semibold text-forest-800">{b.nome ?? "—"}</td>
                    <td className="px-5 py-3 font-mono text-xs">{maskCPF(b.cpf)}</td>
                    <td className="px-5 py-3 text-gray-700">{b.plano ?? "—"}</td>
                    <td className="px-5 py-3 text-gray-700">{b.valor ? formatBRL(b.valor) : "—"}</td>
                    <td className="px-5 py-3">
                      <Badge variant={b.ativo ? "success" : "warning"}>{b.ativo ? "Ativa" : "Pausada"}</Badge>
                    </td>
                    <td className="px-5 py-3">
                      {b.tem_pendencia_atual === null
                        ? <span className="text-xs text-gray-400">—</span>
                        : <Badge variant={b.tem_pendencia_atual ? "danger" : "success"}>
                            {b.tem_pendencia_atual ? "Sim" : "Não"}
                          </Badge>}
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs whitespace-nowrap">{formatDateTimeBR(b.proxima_verificacao)}</td>
                    <td className="px-5 py-3 text-gray-500 text-xs whitespace-nowrap">{formatDateTimeBR(b.ultima_verificacao)}</td>
                    <td className="px-5 py-3">
                      <BlindagemActions cpf={b.cpf} ativa={b.ativo} />
                    </td>
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
