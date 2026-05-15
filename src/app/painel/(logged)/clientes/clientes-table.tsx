"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Download, Search, FileText, ExternalLink } from "lucide-react";
import type { Etapa, Tag } from "@/lib/kanban-shared";
import { corClasses } from "@/lib/kanban-shared";
import { formatBRL, formatPhone, maskCPF } from "@/lib/utils";
import { Button } from "@/components/ui/button";

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

export function ClientesTable({
  clientes, etapas, tags,
}: {
  clientes: Cliente[];
  etapas: Etapa[];
  tags: Tag[];
}) {
  const [q, setQ] = useState("");
  const [tagFiltro, setTagFiltro] = useState<string>("");
  const [etapaFiltro, setEtapaFiltro] = useState<string>("");

  const filtrados = useMemo(() => {
    let r = clientes;
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
    if (etapaFiltro) r = r.filter((c) => c.etapa === etapaFiltro);
    return r;
  }, [clientes, q, tagFiltro, etapaFiltro]);

  function findTag(codigo: string | null): Tag | null {
    return tags.find((t) => t.codigo === codigo) || null;
  }

  function findEtapa(codigo: string): Etapa | null {
    return etapas.find((e) => e.codigo === codigo) || null;
  }

  function baixarCSV(formato: "completo" | "operacional") {
    const params = new URLSearchParams({ formato });
    if (etapaFiltro) params.set("etapa", etapaFiltro);
    window.open(`/api/admin/clientes/exportar?${params.toString()}`, "_blank");
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nome, CPF, email, telefone..."
            className="w-full pl-9 pr-3 py-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
        </div>

        <select
          value={tagFiltro}
          onChange={(e) => setTagFiltro(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
        >
          <option value="">Todas as tags</option>
          {tags.map((t) => (
            <option key={t.codigo} value={t.codigo}>{t.emoji} {t.nome}</option>
          ))}
        </select>

        <select
          value={etapaFiltro}
          onChange={(e) => setEtapaFiltro(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
        >
          <option value="">Todas as etapas</option>
          {etapas.map((e) => (
            <option key={e.codigo} value={e.codigo}>{e.emoji} {e.nome}</option>
          ))}
        </select>

        <div className="flex gap-2 ml-auto">
          <Button onClick={() => baixarCSV("completo")} variant="outline" size="sm">
            <Download className="size-4 mr-1" />
            Export completo
          </Button>
          <Button onClick={() => baixarCSV("operacional")} size="sm">
            <Download className="size-4 mr-1" />
            Export Nome+CPF
          </Button>
        </div>
      </div>

      <p className="text-xs text-gray-500 mb-3">{filtrados.length} cliente(s) mostrado(s) de {clientes.length} total</p>

      <div className="rounded-lg border border-gray-200 bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500 border-b border-gray-200">
            <tr>
              <th className="text-left py-3 px-3 font-semibold">Cliente</th>
              <th className="text-left py-3 px-3 font-semibold">Tag</th>
              <th className="text-left py-3 px-3 font-semibold">Etapa</th>
              <th className="text-left py-3 px-3 font-semibold">Score</th>
              <th className="text-right py-3 px-3 font-semibold">Pagou</th>
              <th className="text-center py-3 px-3 font-semibold">PDF</th>
              <th className="text-left py-3 px-3 font-semibold">Criado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtrados.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-gray-400 text-sm">
                  Nenhum cliente encontrado
                </td>
              </tr>
            ) : (
              filtrados.map((c) => {
                const tag = findTag(c.tag_servico);
                const etapa = findEtapa(c.etapa);
                const tagCor = tag ? corClasses(tag.cor) : null;
                const etapaCor = etapa ? corClasses(etapa.cor) : null;
                return (
                  <tr key={c.id} className="hover:bg-gray-50/50">
                    <td className="py-3 px-3">
                      <Link href={`/painel/processos/${c.id}`} className="block hover:text-brand-700">
                        <p className="font-semibold text-forest-800">{c.nome}</p>
                        <p className="text-xs text-gray-500 font-mono">{maskCPF(c.cpf)}</p>
                        {c.telefone && (
                          <p className="text-[10px] text-gray-400">{formatPhone(c.telefone)}</p>
                        )}
                      </Link>
                    </td>
                    <td className="py-3 px-3">
                      {tag && tagCor && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${tagCor.bg} ${tagCor.text} ${tagCor.border} border text-[10px] font-semibold`}>
                          {tag.emoji} {tag.nome}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {etapa && etapaCor && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded ${etapaCor.bg} ${etapaCor.text} text-[10px] font-semibold`}>
                          {etapa.emoji} {etapa.nome}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono text-xs">
                      {c.score != null ? (
                        <span className={
                          c.score >= 701 ? "text-emerald-700 font-bold" :
                          c.score >= 501 ? "text-amber-700 font-bold" :
                          "text-red-700 font-bold"
                        }>
                          {c.score}
                        </span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-xs text-emerald-700 font-semibold">
                      {c.valor_pago && Number(c.valor_pago) > 0 ? formatBRL(Number(c.valor_pago)) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {c.pdf_url ? (
                        <a href={c.pdf_url} target="_blank" rel="noopener" className="inline-flex text-brand-600 hover:text-brand-700">
                          <FileText className="size-4" />
                        </a>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="py-3 px-3 text-xs text-gray-500 whitespace-nowrap">
                      {c.created_at?.slice(0, 10)}
                      <Link href={`/painel/processos/${c.id}`} className="ml-2 text-brand-500 hover:text-brand-700 inline-flex">
                        <ExternalLink className="size-3" />
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
