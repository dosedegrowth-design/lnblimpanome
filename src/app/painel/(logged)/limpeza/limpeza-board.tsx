"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Clock, MessageCircle, Sparkles, FileText, Loader2 } from "lucide-react";
import type { Etapa, Tag } from "@/lib/kanban-shared";
import { corClasses } from "@/lib/kanban-shared";
import { formatPhone, maskCPF, formatBRL } from "@/lib/utils";

interface Processo {
  id: string;
  cpf: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  etapa: string;
  tag_servico?: string | null;
  pdf_url?: string | null;
  valor_pago?: number | null;
  updated_at: string;
  dias_na_etapa?: number;
}

interface Props {
  etapas: Etapa[];
  tags: Tag[];
  processos: Processo[];
}

const COL_CORES: Record<string, { bg: string; border: string; text: string; chip: string }> = {
  brand:   { bg: "bg-brand-50",    border: "border-brand-200",   text: "text-brand-700",   chip: "bg-brand-500" },
  amber:   { bg: "bg-amber-50",    border: "border-amber-200",   text: "text-amber-700",   chip: "bg-amber-500" },
  violet:  { bg: "bg-violet-50",   border: "border-violet-200",  text: "text-violet-700",  chip: "bg-violet-500" },
  forest:  { bg: "bg-forest-50",   border: "border-forest-200",  text: "text-forest-700",  chip: "bg-forest-700" },
  emerald: { bg: "bg-emerald-50",  border: "border-emerald-200", text: "text-emerald-700", chip: "bg-emerald-500" },
  red:     { bg: "bg-red-50",      border: "border-red-200",     text: "text-red-700",     chip: "bg-red-500" },
  gray:    { bg: "bg-gray-50",     border: "border-gray-200",    text: "text-gray-700",    chip: "bg-gray-500" },
};

export function LimpezaBoard({ etapas, tags, processos }: Props) {
  const router = useRouter();
  const [finalizandoId, setFinalizandoId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  function findTag(codigo: string | null | undefined): Tag | null {
    if (!codigo) return null;
    return tags.find((t) => t.codigo === codigo) || null;
  }

  function showMsg(tipo: "ok" | "erro", texto: string) {
    setMsg({ tipo, texto });
    setTimeout(() => setMsg(null), 8000);
  }

  async function finalizarLimpeza(processoId: string, nome: string) {
    if (!confirm(
      `Confirmar finalização da limpeza de ${nome}?\n\n` +
      `Isso vai:\n` +
      `• Disparar nova consulta (custo ~R$ 8,29)\n` +
      `• Gerar PDF atualizado\n` +
      `• Mover pra "Aguardando órgãos"\n` +
      `• Enviar email pro cliente com prazo de 3-5 dias úteis`
    )) return;

    setFinalizandoId(processoId);
    try {
      const r = await fetch("/api/admin/processos/finalizar-limpeza", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ processo_id: processoId }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || `HTTP ${r.status}`);

      showMsg("ok", `✅ ${nome} finalizado · Score ${j.score ?? "—"} · ${j.tem_pendencia ? "ainda com pendências" : "nome limpo"}`);
      router.refresh();
    } catch (e) {
      showMsg("erro", `❌ Erro: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setFinalizandoId(null);
    }
  }

  function porEtapa(codigo: string) {
    return processos.filter((p) => p.etapa === codigo);
  }

  return (
    <>
      {msg && (
        <div
          className={`mb-4 rounded-lg px-4 py-3 text-sm ${
            msg.tipo === "ok"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-red-50 border border-red-200 text-red-800"
          }`}
        >
          {msg.texto}
        </div>
      )}

      <div className="flex gap-4 overflow-x-auto pb-4">
        {etapas.map((etapa) => {
          const lista = porEtapa(etapa.codigo);
          const cor = COL_CORES[etapa.cor] || COL_CORES.gray;
          const podeFinalizar = etapa.codigo === "em_tratativa";
          return (
            <div
              key={etapa.codigo}
              className={`min-w-[320px] w-[320px] shrink-0 rounded-xl border ${cor.border} ${cor.bg} p-3`}
            >
              <header className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <span className={`inline-block size-2 rounded-full ${cor.chip}`} />
                  <p className={`font-bold text-sm ${cor.text}`}>
                    {etapa.emoji} {etapa.nome}
                  </p>
                </div>
                <span className="text-xs font-bold text-gray-500">{lista.length}</span>
              </header>

              <div className="space-y-2">
                {lista.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6">Vazio</p>
                ) : (
                  lista.map((p) => {
                    const tag = findTag(p.tag_servico);
                    const tagCor = tag ? corClasses(tag.cor) : null;
                    const isFinalizando = finalizandoId === p.id;
                    return (
                      <div
                        key={p.id}
                        className="bg-white rounded-lg border border-gray-200 p-3 hover:shadow-md hover:border-brand-300 transition group"
                      >
                        <Link href={`/painel/processos/${p.id}`} className="block">
                          {tag && tagCor && (
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${tagCor.bg} ${tagCor.text} ${tagCor.border} border text-[10px] font-semibold mb-2`}
                            >
                              {tag.emoji && <span>{tag.emoji}</span>}
                              <span>{tag.nome}</span>
                            </span>
                          )}
                          <p className="font-bold text-forest-800 text-sm truncate group-hover:text-brand-700">
                            {p.nome}
                          </p>
                          <p className="text-xs text-gray-500 font-mono mt-0.5">{maskCPF(p.cpf)}</p>
                          {p.telefone && (
                            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                              <MessageCircle className="size-3" /> {formatPhone(p.telefone)}
                            </p>
                          )}
                          <div className="flex items-center justify-between mt-2 text-xs">
                            {typeof p.dias_na_etapa === "number" && (
                              <span className="text-gray-400 flex items-center gap-1">
                                <Clock className="size-3" /> {p.dias_na_etapa}d
                              </span>
                            )}
                            {p.valor_pago && Number(p.valor_pago) > 0 && (
                              <span className="text-emerald-700 font-semibold">
                                {formatBRL(Number(p.valor_pago))}
                              </span>
                            )}
                          </div>
                          {p.pdf_url && (
                            <p className="text-[10px] text-brand-600 mt-1 flex items-center gap-1">
                              <FileText className="size-3" /> Relatório disponível
                            </p>
                          )}
                        </Link>

                        {podeFinalizar && (
                          <button
                            onClick={() => finalizarLimpeza(p.id, p.nome)}
                            disabled={isFinalizando}
                            className="mt-3 w-full inline-flex items-center justify-center gap-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2 transition disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {isFinalizando ? (
                              <>
                                <Loader2 className="size-3.5 animate-spin" /> Processando...
                              </>
                            ) : (
                              <>
                                <Sparkles className="size-3.5" /> Finalizar Limpeza
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
