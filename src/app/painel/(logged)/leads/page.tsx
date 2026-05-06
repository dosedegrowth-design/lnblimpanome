import { requireAdmin } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPhone, formatDateBR, maskCPF } from "@/lib/utils";
import type { CRMRow } from "@/lib/supabase/types";
import { Users, MessageCircle, Globe } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { SearchInput } from "@/components/admin/search-input";
import { FilterSelect } from "@/components/admin/filter-select";
import { LeadStageSelect } from "@/components/admin/lead-stage-select";
import { EmptyState } from "@/components/admin/empty-state";

export const dynamic = "force-dynamic";

function statusOf(r: CRMRow): { label: string; variant: "default" | "brand" | "success" | "warning" | "danger"; key: string } {
  if (r.Fechado) return { label: "Fechado", variant: "success", key: "fechado" };
  if (r.perdido) return { label: "Perdido", variant: "danger",  key: "perdido" };
  if (r.Agendado) return { label: "Agendado", variant: "warning", key: "agendado" };
  if (r.Interessado) return { label: "Interessado", variant: "brand", key: "interessado" };
  return { label: "Lead", variant: "default", key: "lead" };
}

interface PageProps {
  searchParams: Promise<{ q?: string; status?: string; origem?: string }>;
}

export default async function LeadsPage({ searchParams }: PageProps) {
  await requireAdmin();
  const sp = await searchParams;
  const q = sp.q?.trim();
  const filterStatus = sp.status;
  const filterOrigem = sp.origem;

  const supa = await createClient();

  let query = supa
    .from("LNB - CRM")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);

  if (filterOrigem) query = query.eq("origem", filterOrigem);
  if (q) query = query.or(`nome.ilike.%${q}%,CPF.ilike.%${q}%,telefone.ilike.%${q}%,e-mail.ilike.%${q}%`);

  const { data } = await query;
  let leads = (data ?? []) as CRMRow[];

  if (filterStatus) {
    leads = leads.filter((r) => statusOf(r).key === filterStatus);
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Leads & CRM"
        subtitle={`${leads.length} contato(s)`}
        icon={Users}
      />

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <SearchInput placeholder="Buscar por nome, CPF, telefone, email..." />
        <FilterSelect
          paramName="status"
          defaultLabel="Todos os status"
          options={[
            { value: "lead",        label: "Lead" },
            { value: "interessado", label: "Interessado" },
            { value: "agendado",    label: "Agendado" },
            { value: "fechado",     label: "Fechado" },
            { value: "perdido",     label: "Perdido" },
          ]}
        />
        <FilterSelect
          paramName="origem"
          defaultLabel="Todas as origens"
          options={[
            { value: "site",     label: "Site" },
            { value: "whatsapp", label: "WhatsApp" },
            { value: "admin",    label: "Manual" },
          ]}
        />
      </div>

      <Card className="overflow-hidden">
        {leads.length === 0 ? (
          <EmptyState icon={Users} title="Nenhum lead encontrado" description="Ajuste os filtros ou aguarde novos contatos." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-sand-50 border-b border-gray-200">
                <tr className="text-left text-gray-500 text-xs uppercase tracking-wider">
                  <th className="px-5 py-4 font-semibold">Nome</th>
                  <th className="px-5 py-4 font-semibold">Telefone</th>
                  <th className="px-5 py-4 font-semibold">CPF</th>
                  <th className="px-5 py-4 font-semibold">Email</th>
                  <th className="px-5 py-4 font-semibold">Origem</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 font-semibold">Stage</th>
                  <th className="px-5 py-4 font-semibold">Criado</th>
                  <th className="px-5 py-4 font-semibold w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {leads.map((r) => {
                  const s = statusOf(r);
                  const tel = r.telefone ?? "";
                  return (
                    <tr key={r.id} className="hover:bg-sand-50/40 transition-colors">
                      <td className="px-5 py-3 font-semibold text-forest-800">{r.nome ?? "—"}</td>
                      <td className="px-5 py-3 text-gray-700">{tel ? formatPhone(tel) : "—"}</td>
                      <td className="px-5 py-3 text-gray-700 font-mono text-xs">{r.CPF ? maskCPF(r.CPF) : "—"}</td>
                      <td className="px-5 py-3 text-gray-700 truncate max-w-[200px]">{r["e-mail"] ?? "—"}</td>
                      <td className="px-5 py-3">
                        {r.origem === "site" ? (
                          <span className="inline-flex items-center gap-1 text-xs text-brand-700"><Globe className="size-3.5" /> Site</span>
                        ) : r.origem === "whatsapp" ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-700"><MessageCircle className="size-3.5" /> WhatsApp</span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3"><Badge variant={s.variant}>{s.label}</Badge></td>
                      <td className="px-5 py-3">
                        {tel && <LeadStageSelect telefone={tel} current={s.key} />}
                      </td>
                      <td className="px-5 py-3 text-gray-500">{formatDateBR(r.created_at)}</td>
                      <td className="px-5 py-3">
                        {tel && (
                          <a
                            href={`https://wa.me/${tel.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noopener"
                            className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700"
                            aria-label="Abrir WhatsApp"
                          >
                            <MessageCircle className="size-4" />
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
