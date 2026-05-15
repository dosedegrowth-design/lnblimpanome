"use client";
import { useMemo, useState } from "react";
import { Clock, MessageCircle, FileText, AlertTriangle, Filter, Plus } from "lucide-react";
import type { Etapa, Tag } from "@/lib/kanban-shared";
import { corClasses } from "@/lib/kanban-shared";
import { formatPhone, formatBRL } from "@/lib/utils";
import { ProcessoDrawer } from "@/components/processo-drawer";
import {
  TabsCounter, FilterChips, AvatarCircle, TableToolbar,
  type TabItem, type ChipFiltro,
} from "@/components/ui/data-table-bits";
import type { ProcessoKanban } from "./page";

interface Props {
  etapas: Etapa[];
  tags: Tag[];
  processos: ProcessoKanban[];
}

// Headers coloridos por etapa - cores mais saturadas pra contraste real
const COL_HEADERS: Record<string, { headerBg: string; headerText: string; dot: string; lineGrad: string }> = {
  brand:   { headerBg: "bg-cyan-100",    headerText: "text-cyan-900",    dot: "bg-cyan-600",    lineGrad: "from-cyan-300 to-cyan-500" },
  amber:   { headerBg: "bg-amber-100",   headerText: "text-amber-900",   dot: "bg-amber-600",   lineGrad: "from-amber-300 to-amber-500" },
  violet:  { headerBg: "bg-violet-100",  headerText: "text-violet-900",  dot: "bg-violet-600",  lineGrad: "from-violet-300 to-violet-500" },
  forest:  { headerBg: "bg-teal-100",    headerText: "text-teal-900",    dot: "bg-teal-600",    lineGrad: "from-teal-300 to-teal-500" },
  emerald: { headerBg: "bg-emerald-100", headerText: "text-emerald-900", dot: "bg-emerald-600", lineGrad: "from-emerald-300 to-emerald-500" },
  red:     { headerBg: "bg-rose-100",    headerText: "text-rose-900",    dot: "bg-rose-600",    lineGrad: "from-rose-300 to-rose-500" },
  gray:    { headerBg: "bg-gray-200",    headerText: "text-gray-800",    dot: "bg-gray-500",    lineGrad: "from-gray-300 to-gray-400" },
};

export function ProcessosKanban({ etapas, tags, processos }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [aba, setAba] = useState<"todos" | "pre" | "pos">("pre");
  const [q, setQ] = useState("");
  const [tagFiltro, setTagFiltro] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);

  function findTag(codigo: string | null | undefined): Tag | null {
    if (!codigo) return null;
    return tags.find((t) => t.codigo === codigo) || null;
  }

  // Counters por funil
  const etapasPre = etapas.filter((e) => e.codigo === "lead" || e.codigo === "interessado" || e.codigo === "qualificado" || e.codigo === "consulta_paga" || e.codigo === "limpeza_paga" || e.codigo === "perdido");
  const etapasPos = etapas.filter((e) => e.codigo === "em_tratativa" || e.codigo === "aguardando_orgaos" || e.codigo === "nome_limpo" || e.codigo === "blindagem_ativa" || e.codigo === "encerrada");
  const codigosPre = etapasPre.map((e) => e.codigo);
  const codigosPos = etapasPos.map((e) => e.codigo);

  const countPre = processos.filter((p) => codigosPre.includes(p.etapa)).length;
  const countPos = processos.filter((p) => codigosPos.includes(p.etapa)).length;

  const tabs: TabItem[] = [
    { value: "pre",    label: "Pré-pagamento",  count: countPre },
    { value: "pos",    label: "Pós-pagamento",  count: countPos },
    { value: "todos",  label: "Todos",          count: processos.length },
  ];

  // Etapas visiveis baseado na aba
  const etapasVisiveis = aba === "pre" ? etapasPre : aba === "pos" ? etapasPos : etapas;

  // Filtro por busca + tag
  const filtrados = useMemo(() => {
    let r = processos;
    if (aba === "pre") r = r.filter((p) => codigosPre.includes(p.etapa));
    else if (aba === "pos") r = r.filter((p) => codigosPos.includes(p.etapa));

    if (q) {
      const lq = q.toLowerCase();
      const lqNum = lq.replace(/\D/g, "");
      r = r.filter(
        (p) =>
          p.nome.toLowerCase().includes(lq) ||
          p.cpf.includes(lqNum) ||
          (p.email || "").toLowerCase().includes(lq) ||
          (p.telefone || "").includes(lqNum)
      );
    }
    if (tagFiltro) r = r.filter((p) => p.tag_servico === tagFiltro);
    return r;
  }, [processos, q, tagFiltro, aba, codigosPre, codigosPos]);

  const chips: ChipFiltro[] = [];
  if (tagFiltro) {
    const t = findTag(tagFiltro);
    chips.push({ key: "tag", label: "Serviço", value: t?.nome || tagFiltro });
  }

  return (
    <>
      <TabsCounter tabs={tabs} value={aba} onChange={(v) => setAba(v as typeof aba)} />

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
        <FilterChips filtros={chips} onRemove={(k) => k === "tag" && setTagFiltro("")} />
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

      <div className="flex gap-4 overflow-x-auto pb-6">
        {etapasVisiveis.map((etapa) => {
          const lista = filtrados.filter((p) => p.etapa === etapa.codigo);
          const h = COL_HEADERS[etapa.cor] || COL_HEADERS.gray;
          return (
            <div
              key={etapa.codigo}
              className="min-w-[300px] w-[300px] shrink-0 flex flex-col"
            >
              {/* Header colorido por coluna (Fixolaw style) */}
              <div className={`rounded-lg ${h.headerBg} px-3 py-2.5 mb-3 flex items-center justify-between shadow-sm`}>
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`inline-block size-1.5 rounded-full ${h.dot}`} />
                  <p className={`font-semibold text-sm ${h.headerText} truncate`}>{etapa.nome}</p>
                  <span className={`text-xs ${h.headerText} opacity-70 tabular-nums`}>{lista.length}</span>
                </div>
                <button className="size-6 grid place-items-center text-gray-500 hover:text-gray-900 hover:bg-white rounded transition shrink-0" title="Adicionar (em breve)">
                  <Plus className="size-3.5" />
                </button>
              </div>

              <div className="space-y-2 min-h-[80px] pb-2">
                {lista.length === 0 ? (
                  <div className="text-xs text-gray-300 text-center py-8 border border-dashed border-gray-200 rounded-lg">
                    Vazio
                  </div>
                ) : (
                  lista.map((p) => {
                    const tag = findTag(p.tag_servico);
                    const tagCor = tag ? corClasses(tag.cor) : null;
                    return (
                      <button
                        key={p.id}
                        onClick={() => setSelectedId(p.id)}
                        className="block w-full text-left bg-white rounded-lg p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:-translate-y-px transition-all group"
                      >
                        {/* Tag pill no topo */}
                        {tag && tagCor && (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md ${tagCor.bg} ${tagCor.text} text-[10px] font-medium mb-2`}>
                            <span>{tag.nome}</span>
                          </span>
                        )}

                        {/* Header com nome + avatar */}
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="font-medium text-gray-900 text-sm truncate flex-1 min-w-0">
                            {p.nome}
                          </p>
                          <AvatarCircle name={p.nome} size={24} />
                        </div>

                        {/* Score + Pendência */}
                        {(p.score != null || p.tem_pendencia) && (
                          <div className="flex items-center gap-3 text-[11px] mb-2">
                            {p.score != null && (
                              <span className={
                                p.score >= 701 ? "text-emerald-600 font-semibold" :
                                p.score >= 501 ? "text-amber-600 font-semibold" :
                                "text-red-600 font-semibold"
                              }>
                                Score {p.score}
                              </span>
                            )}
                            {p.tem_pendencia && (
                              <span className="inline-flex items-center gap-0.5 text-amber-600">
                                <AlertTriangle className="size-3" />
                                {p.qtd_pendencias ?? 0}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Footer: telefone + tempo + valor + pdf */}
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                          <div className="flex items-center gap-1.5 text-gray-400">
                            {p.telefone && <MessageCircle className="size-3" />}
                            {p.pdf_url && <FileText className="size-3" />}
                          </div>
                          {p.valor_pago != null && Number(p.valor_pago) > 0 && (
                            <span className="text-[11px] text-emerald-600 font-semibold tabular-nums">{formatBRL(Number(p.valor_pago))}</span>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

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
