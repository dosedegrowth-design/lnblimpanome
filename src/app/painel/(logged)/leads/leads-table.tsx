"use client";
import { useMemo, useState } from "react";
import { Filter, Globe, MessageCircle } from "lucide-react";
import type { CRMRow } from "@/lib/supabase/types";
import { formatPhone, formatDateBR, maskCPF } from "@/lib/utils";
import {
  TabsCounter, FilterChips, AvatarCircle, PriorityPill, TableToolbar,
  type TabItem, type ChipFiltro,
} from "@/components/ui/data-table-bits";

function statusOf(r: CRMRow): { label: string; tone: "low" | "med" | "high" | "neutral" | "success" | "warning" | "danger" | "info"; key: string } {
  if (r.Fechado) return { label: "Fechado", tone: "success", key: "fechado" };
  if (r.perdido) return { label: "Perdido", tone: "danger", key: "perdido" };
  if (r.Agendado) return { label: "Agendado", tone: "warning", key: "agendado" };
  if (r.Interessado) return { label: "Interessado", tone: "info", key: "interessado" };
  return { label: "Lead", tone: "neutral", key: "lead" };
}

export function LeadsTable({ leads }: { leads: CRMRow[] }) {
  const [q, setQ] = useState("");
  const [aba, setAba] = useState<string>("todos");
  const [origemFiltro, setOrigemFiltro] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);

  const counts = useMemo(() => {
    const r: Record<string, number> = { todos: leads.length };
    leads.forEach((l) => {
      const k = statusOf(l).key;
      r[k] = (r[k] ?? 0) + 1;
    });
    return r;
  }, [leads]);

  const tabs: TabItem[] = [
    { value: "todos",        label: "Todos",        count: counts.todos ?? 0 },
    { value: "lead",         label: "Lead",         count: counts.lead ?? 0 },
    { value: "interessado",  label: "Interessado",  count: counts.interessado ?? 0 },
    { value: "agendado",     label: "Agendado",     count: counts.agendado ?? 0 },
    { value: "fechado",      label: "Fechado",      count: counts.fechado ?? 0 },
    { value: "perdido",      label: "Perdido",      count: counts.perdido ?? 0 },
  ];

  const filtrados = useMemo(() => {
    let r = leads;
    if (aba !== "todos") {
      r = r.filter((l) => statusOf(l).key === aba);
    }
    if (origemFiltro) r = r.filter((l) => l.origem === origemFiltro);
    if (q) {
      const lq = q.toLowerCase();
      const lqNum = lq.replace(/\D/g, "");
      r = r.filter(
        (l) =>
          (l.nome ?? "").toLowerCase().includes(lq) ||
          (l.CPF ?? "").includes(lqNum) ||
          (l["e-mail"] ?? "").toLowerCase().includes(lq) ||
          (l.telefone ?? "").includes(lqNum)
      );
    }
    return r;
  }, [leads, q, aba, origemFiltro]);

  const chips: ChipFiltro[] = [];
  if (origemFiltro) chips.push({ key: "origem", label: "Origem", value: origemFiltro === "site" ? "Site" : "WhatsApp" });

  return (
    <>
      <TabsCounter tabs={tabs} value={aba} onChange={setAba} />

      <TableToolbar
        search={q}
        onSearchChange={setQ}
        searchPlaceholder="Pesquisar nome, CPF, email, telefone..."
      >
        <button
          onClick={() => setShowFilters((s) => !s)}
          className="inline-flex items-center gap-1.5 text-sm text-emerald-700 hover:text-emerald-800 font-semibold"
        >
          <Filter className="size-4" />
          Filtros
        </button>
        <FilterChips filtros={chips} onRemove={(k) => k === "origem" && setOrigemFiltro("")} />
        {showFilters && (
          <select
            value={origemFiltro}
            onChange={(e) => setOrigemFiltro(e.target.value)}
            className="rounded-full border border-gray-200 px-3 py-1.5 text-xs bg-white"
          >
            <option value="">Todas origens</option>
            <option value="site">Site</option>
            <option value="whatsapp">WhatsApp</option>
          </select>
        )}
      </TableToolbar>

      <div className="rounded-xl bg-white border border-gray-100 shadow-[0_1px_3px_rgba(16,24,40,0.06)] overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-gray-400 text-xs">
            <tr className="border-b border-gray-100">
              <th className="text-left py-3 px-4 font-normal">Nome</th>
              <th className="text-left py-3 px-3 font-normal">Status</th>
              <th className="text-left py-3 px-3 font-normal">Origem</th>
              <th className="text-left py-3 px-3 font-normal">Serviço</th>
              <th className="text-left py-3 px-3 font-normal">Criado</th>
              <th className="text-right py-3 px-3 font-normal">Cliente</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-gray-400 text-sm">
                  Nenhum lead encontrado
                </td>
              </tr>
            ) : (
              filtrados.map((l) => {
                const st = statusOf(l);
                return (
                  <tr key={l.id} className="hover:bg-gray-50/40 border-b border-gray-50 last:border-0">
                    <td className="py-4 px-4">
                      <p className="font-medium text-gray-900">{l.nome || "—"}</p>
                      <p className="text-xs text-gray-400 font-mono mt-0.5">{l.CPF ? maskCPF(l.CPF) : "—"}</p>
                    </td>
                    <td className="py-4 px-3">
                      <PriorityPill tone={st.tone} label={st.label} />
                    </td>
                    <td className="py-4 px-3">
                      {l.origem === "site" ? (
                        <span className="inline-flex items-center gap-1 text-xs text-cyan-700">
                          <Globe className="size-3.5" /> Site
                        </span>
                      ) : l.origem === "whatsapp" ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
                          <MessageCircle className="size-3.5" /> WhatsApp
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-4 px-3 text-xs text-gray-600">{l.Servico || "—"}</td>
                    <td className="py-4 px-3 text-xs text-gray-500">{l.created_at ? formatDateBR(l.created_at) : "—"}</td>
                    <td className="py-4 px-3">
                      <div className="flex items-center justify-end gap-2">
                        {l.telefone && (
                          <a
                            href={`https://wa.me/${l.telefone.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noopener"
                            className="text-gray-400 hover:text-emerald-600 transition"
                            title="WhatsApp"
                          >
                            <MessageCircle className="size-4" />
                          </a>
                        )}
                        <AvatarCircle name={l.nome || "?"} size={28} />
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400 mt-3 text-center">
        Mostrando {filtrados.length} de {leads.length} lead(s)
      </p>
    </>
  );
}

void formatPhone;
