"use client";
import { useMemo, useState } from "react";
import { Filter, FileText, Globe, MessageCircle, AlertTriangle } from "lucide-react";
import type { ConsultaRow } from "@/lib/supabase/types";
import { formatBRL, formatDateBR, maskCPF } from "@/lib/utils";
import {
  TabsCounter, FilterChips, AvatarCircle, PriorityPill, TableToolbar,
  type TabItem, type ChipFiltro,
} from "@/components/ui/data-table-bits";

function statusKey(c: ConsultaRow): string {
  if (!c.consulta_paga) return "nao_paga";
  if (c.fechou_limpeza) return "fechou";
  if (c.tem_pendencia) return "suja";
  return "limpa";
}

export function ConsultasTable({ consultas }: { consultas: ConsultaRow[] }) {
  const [q, setQ] = useState("");
  const [aba, setAba] = useState<string>("todos");
  const [origemFiltro, setOrigemFiltro] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);

  const counts = useMemo(() => {
    const r: Record<string, number> = { todos: consultas.length };
    consultas.forEach((c) => {
      const k = statusKey(c);
      r[k] = (r[k] ?? 0) + 1;
    });
    return r;
  }, [consultas]);

  const tabs: TabItem[] = [
    { value: "todos",     label: "Todas",          count: counts.todos ?? 0 },
    { value: "nao_paga",  label: "Não pagas",      count: counts.nao_paga ?? 0 },
    { value: "suja",      label: "Com pendência",  count: counts.suja ?? 0 },
    { value: "limpa",     label: "Nome limpo",     count: counts.limpa ?? 0 },
    { value: "fechou",    label: "Fechou limpeza", count: counts.fechou ?? 0 },
  ];

  const filtrados = useMemo(() => {
    let r = consultas;
    if (aba !== "todos") {
      r = r.filter((c) => statusKey(c) === aba);
    }
    if (origemFiltro) r = r.filter((c) => c.origem === origemFiltro);
    if (q) {
      const lq = q.toLowerCase();
      const lqNum = lq.replace(/\D/g, "");
      r = r.filter(
        (c) =>
          (c.nome ?? "").toLowerCase().includes(lq) ||
          (c.cpf ?? "").includes(lqNum) ||
          (c.email ?? "").toLowerCase().includes(lq)
      );
    }
    return r;
  }, [consultas, q, aba, origemFiltro]);

  const chips: ChipFiltro[] = [];
  if (origemFiltro) chips.push({ key: "origem", label: "Origem", value: origemFiltro === "site" ? "Site" : "WhatsApp" });

  return (
    <>
      <TabsCounter tabs={tabs} value={aba} onChange={setAba} />

      <TableToolbar
        search={q}
        onSearchChange={setQ}
        searchPlaceholder="Pesquisar nome, CPF, email..."
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
              <th className="text-left py-3 px-4 font-normal">Cliente</th>
              <th className="text-left py-3 px-3 font-normal">Status</th>
              <th className="text-left py-3 px-3 font-normal">Score</th>
              <th className="text-left py-3 px-3 font-normal">Dívidas</th>
              <th className="text-left py-3 px-3 font-normal">Origem</th>
              <th className="text-center py-3 px-3 font-normal">PDF</th>
              <th className="text-left py-3 px-3 font-normal">Data</th>
              <th className="text-right py-3 px-3 font-normal">Cliente</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-gray-400 text-sm">
                  Nenhuma consulta encontrada
                </td>
              </tr>
            ) : (
              filtrados.map((c) => {
                const k = statusKey(c);
                const tone =
                  k === "nao_paga" ? "neutral" :
                  k === "suja" ? "warning" :
                  k === "limpa" ? "success" :
                  k === "fechou" ? "info" : "neutral";
                const label =
                  k === "nao_paga" ? "Não paga" :
                  k === "suja" ? "Pendência" :
                  k === "limpa" ? "Limpo" :
                  k === "fechou" ? "Fechou" : k;
                return (
                  <tr key={c.id} className="hover:bg-gray-50/40 border-b border-gray-50 last:border-0">
                    <td className="py-4 px-4">
                      <p className="font-medium text-gray-900">{c.nome || "—"}</p>
                      <p className="text-xs text-gray-400 font-mono mt-0.5">{c.cpf ? maskCPF(c.cpf) : "—"}</p>
                    </td>
                    <td className="py-4 px-3">
                      <PriorityPill tone={tone} label={label} />
                    </td>
                    <td className="py-4 px-3 font-mono text-xs">
                      {(() => {
                        const s = (c as unknown as { score?: number | null }).score;
                        if (s == null) return <span className="text-gray-300">—</span>;
                        const cls = s >= 701 ? "text-emerald-600 font-semibold" : s >= 501 ? "text-amber-600 font-semibold" : "text-red-600 font-semibold";
                        return <span className={cls}>{s}</span>;
                      })()}
                    </td>
                    <td className="py-4 px-3">
                      {c.tem_pendencia ? (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                          <AlertTriangle className="size-3.5" />
                          {c.total_dividas ? formatBRL(c.total_dividas) : `${c.qtd_pendencias ?? 0}`}
                        </span>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="py-4 px-3">
                      {c.origem === "site" ? (
                        <span className="inline-flex items-center gap-1 text-xs text-cyan-700">
                          <Globe className="size-3.5" /> Site
                        </span>
                      ) : c.origem === "whatsapp" ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
                          <MessageCircle className="size-3.5" /> WhatsApp
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-4 px-3 text-center">
                      {c.pdf_url ? (
                        <a href={c.pdf_url} target="_blank" rel="noopener" className="inline-flex text-gray-600 hover:text-gray-900">
                          <FileText className="size-4" />
                        </a>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="py-4 px-3 text-xs text-gray-500">{c.created_at ? formatDateBR(c.created_at) : "—"}</td>
                    <td className="py-4 px-3">
                      <div className="flex items-center justify-end">
                        <AvatarCircle name={c.nome || "?"} size={28} />
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
        Mostrando {filtrados.length} de {consultas.length} consulta(s)
      </p>
    </>
  );
}
