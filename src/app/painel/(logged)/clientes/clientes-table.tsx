"use client";
import { useMemo, useState } from "react";
import { Download, FileText, Filter, MessageCircle, AlertTriangle } from "lucide-react";
import type { Etapa, Tag } from "@/lib/kanban-shared";
import { corClasses } from "@/lib/kanban-shared";
import { formatBRL, formatPhone, maskCPF } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ProcessoDrawer } from "@/components/processo-drawer";
import {
  TabsCounter, FilterChips, AvatarCircle, PriorityPill, TableToolbar,
  type TabItem, type ChipFiltro,
} from "@/components/ui/data-table-bits";

interface Cliente {
  id: string;
  cpf: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  tag_servico: string | null;
  etapa: string;
  valor_pago: number | null;
  pdf_url: string | null;
  created_at: string;
  tem_pendencia: boolean | null;
  score: number | null;
  qtd_pendencias: number | null;
  total_dividas: number | null;
}

const ABA_ETAPAS: Record<string, string[]> = {
  todos: [],
  consulta_paga: ["consulta_paga"],
  limpeza_paga: ["limpeza_paga"],
  em_tratativa: ["em_tratativa", "aguardando_orgaos"],
  nome_limpo: ["nome_limpo"],
  perdido: ["perdido", "encerrada"],
};

export function ClientesTable({
  clientes, etapas, tags,
}: {
  clientes: Cliente[];
  etapas: Etapa[];
  tags: Tag[];
}) {
  const [q, setQ] = useState("");
  const [tagFiltro, setTagFiltro] = useState<string>("");
  const [aba, setAba] = useState<string>("todos");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Counters por aba
  const counts = useMemo(() => {
    const r: Record<string, number> = { todos: clientes.length };
    Object.entries(ABA_ETAPAS).forEach(([key, ets]) => {
      if (key === "todos") return;
      r[key] = clientes.filter((c) => ets.includes(c.etapa)).length;
    });
    return r;
  }, [clientes]);

  const tabs: TabItem[] = [
    { value: "todos",          label: "Todos",          count: counts.todos ?? 0 },
    { value: "consulta_paga",  label: "Consulta paga",  count: counts.consulta_paga ?? 0 },
    { value: "limpeza_paga",   label: "Limpeza paga",   count: counts.limpeza_paga ?? 0 },
    { value: "em_tratativa",   label: "Em tratativa",   count: counts.em_tratativa ?? 0 },
    { value: "nome_limpo",     label: "Nome limpo",     count: counts.nome_limpo ?? 0 },
    { value: "perdido",        label: "Perdido",        count: counts.perdido ?? 0 },
  ];

  const filtrados = useMemo(() => {
    let r = clientes;

    // Filtro por aba
    const etapasAba = ABA_ETAPAS[aba];
    if (etapasAba && etapasAba.length > 0) {
      r = r.filter((c) => etapasAba.includes(c.etapa));
    }

    if (q) {
      const lq = q.toLowerCase();
      const lqNum = lq.replace(/\D/g, "");
      r = r.filter(
        (c) =>
          c.nome.toLowerCase().includes(lq) ||
          c.cpf.includes(lqNum) ||
          (c.email || "").toLowerCase().includes(lq) ||
          (c.telefone || "").includes(lqNum)
      );
    }
    if (tagFiltro) r = r.filter((c) => c.tag_servico === tagFiltro);
    return r;
  }, [clientes, q, tagFiltro, aba]);

  function findTag(codigo: string | null): Tag | null {
    return tags.find((t) => t.codigo === codigo) || null;
  }
  function findEtapa(codigo: string): Etapa | null {
    return etapas.find((e) => e.codigo === codigo) || null;
  }

  function baixarCSV(formato: "completo" | "operacional") {
    const params = new URLSearchParams({ formato });
    const etapasAba = ABA_ETAPAS[aba];
    if (etapasAba && etapasAba.length === 1) params.set("etapa", etapasAba[0]);
    window.open(`/api/admin/clientes/exportar?${params.toString()}`, "_blank");
  }

  // Chips de filtros ativos
  const chips: ChipFiltro[] = [];
  if (tagFiltro) {
    const t = findTag(tagFiltro);
    chips.push({ key: "tag", label: "Serviço", value: t?.nome || tagFiltro });
  }

  function removerChip(key: string) {
    if (key === "tag") setTagFiltro("");
  }

  return (
    <>
      {/* Tabs */}
      <TabsCounter tabs={tabs} value={aba} onChange={setAba} />

      {/* Toolbar com filtros + search */}
      <TableToolbar
        search={q}
        onSearchChange={setQ}
        searchPlaceholder="Pesquisar nome, CPF, email, telefone..."
        right={
          <div className="flex gap-2">
            <Button onClick={() => baixarCSV("operacional")} variant="outline" size="sm">
              <Download className="size-4 mr-1" />
              Nome+CPF
            </Button>
            <Button onClick={() => baixarCSV("completo")} size="sm">
              <Download className="size-4 mr-1" />
              Exportar
            </Button>
          </div>
        }
      >
        <button
          onClick={() => setShowFilters((s) => !s)}
          className="inline-flex items-center gap-1.5 text-sm text-emerald-700 hover:text-emerald-800 font-semibold"
        >
          <Filter className="size-4" />
          Filtros
        </button>
        <FilterChips filtros={chips} onRemove={removerChip} />
        {showFilters && (
          <select
            value={tagFiltro}
            onChange={(e) => setTagFiltro(e.target.value)}
            className="rounded-full border border-gray-200 px-3 py-1.5 text-xs bg-white"
          >
            <option value="">Todos os serviços</option>
            {tags.map((t) => (
              <option key={t.codigo} value={t.codigo}>{t.emoji} {t.nome}</option>
            ))}
          </select>
        )}
      </TableToolbar>

      {/* Tabela */}
      <div className="rounded-xl border border-gray-100 bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-gray-400 text-xs">
            <tr className="border-b border-gray-100">
              <th className="text-left py-3 px-4 font-normal">
                <span className="inline-flex items-center gap-2">
                  <input type="checkbox" className="rounded border-gray-300" />
                  Nome
                </span>
              </th>
              <th className="text-left py-3 px-3 font-normal">Serviço</th>
              <th className="text-left py-3 px-3 font-normal">Etapa</th>
              <th className="text-left py-3 px-3 font-normal">Score</th>
              <th className="text-left py-3 px-3 font-normal">Dívidas</th>
              <th className="text-right py-3 px-3 font-normal">Pago</th>
              <th className="text-center py-3 px-3 font-normal">PDF</th>
              <th className="text-right py-3 px-3 font-normal">Cliente</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-gray-400 text-sm">
                  Nenhum cliente encontrado
                </td>
              </tr>
            ) : (
              filtrados.map((c) => {
                const tag = findTag(c.tag_servico);
                const etapa = findEtapa(c.etapa);
                const tagCor = tag ? corClasses(tag.cor) : null;
                return (
                  <tr
                    key={c.id}
                    className="hover:bg-gray-50/40 cursor-pointer border-b border-gray-50 last:border-0 transition"
                    onClick={() => setSelectedId(c.id)}
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div>
                          <p className="font-medium text-forest-800">{c.nome}</p>
                          <p className="text-xs text-gray-400 font-mono mt-0.5">{maskCPF(c.cpf)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-3">
                      {tag && tagCor && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${tagCor.bg} ${tagCor.text} text-[11px] font-medium`}>
                          {tag.emoji} {tag.nome}
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-3">
                      {etapa && (
                        <PriorityPill
                          tone={
                            etapa.cor === "emerald" ? "success" :
                            etapa.cor === "red" ? "danger" :
                            etapa.cor === "amber" ? "warning" :
                            etapa.cor === "violet" ? "info" :
                            etapa.cor === "brand" ? "info" :
                            "neutral"
                          }
                          label={etapa.nome}
                        />
                      )}
                    </td>
                    <td className="py-4 px-3 font-mono text-xs">
                      {c.score != null ? (
                        <span className={
                          c.score >= 701 ? "text-emerald-700 font-semibold" :
                          c.score >= 501 ? "text-amber-700 font-semibold" :
                          "text-red-700 font-semibold"
                        }>
                          {c.score}
                        </span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="py-4 px-3">
                      {c.tem_pendencia ? (
                        <span className="inline-flex items-center gap-1 text-amber-700 text-xs font-medium">
                          <AlertTriangle className="size-3.5" />
                          {c.qtd_pendencias ?? 0}
                        </span>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="py-4 px-3 text-right font-mono text-xs">
                      {c.valor_pago && Number(c.valor_pago) > 0 ? (
                        <span className="text-emerald-700 font-semibold">{formatBRL(Number(c.valor_pago))}</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="py-4 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                      {c.pdf_url ? (
                        <a href={c.pdf_url} target="_blank" rel="noopener" className="inline-flex text-brand-600 hover:text-brand-700">
                          <FileText className="size-4" />
                        </a>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="py-4 px-3">
                      <div className="flex items-center justify-end gap-2">
                        {c.telefone && (
                          <a
                            href={`https://wa.me/${c.telefone.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noopener"
                            onClick={(e) => e.stopPropagation()}
                            className="text-gray-400 hover:text-emerald-600 transition"
                            title="Abrir WhatsApp"
                          >
                            <MessageCircle className="size-4" />
                          </a>
                        )}
                        <AvatarCircle name={c.nome} size={28} />
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
        Mostrando {filtrados.length} de {clientes.length} cliente(s)
      </p>

      <ProcessoDrawer
        processoId={selectedId}
        open={!!selectedId}
        onOpenChange={(o) => !o && setSelectedId(null)}
        etapas={etapas}
        tags={tags}
      />
    </>
  );
}
