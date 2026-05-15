"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Mail, Phone, MessageCircle, FileText, ExternalLink, ArrowRight,
  Loader2, Sparkles, Tag as TagIcon, AlertCircle, CheckCircle2,
} from "lucide-react";
import { Sheet, SheetHeader, SheetBody, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { corClasses, type Etapa, type Tag } from "@/lib/kanban-shared";
import { formatBRL, formatDateTimeBR, formatPhone, maskCPF } from "@/lib/utils";

interface Processo {
  id: string;
  cpf: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  tipo: string | null;
  tag_servico: string | null;
  etapa: string;
  valor_pago: number | null;
  pdf_url: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  finalizado_em: string | null;
}

interface Consulta {
  tem_pendencia?: boolean | null;
  qtd_pendencias?: number | null;
  total_dividas?: number | null;
  resumo?: string | null;
  pdf_url?: string | null;
  score?: number | null;
}

interface Evento {
  id: string;
  tipo: string;
  etapa_anterior: string | null;
  etapa_nova: string | null;
  mensagem: string | null;
  autor_nome: string | null;
  created_at: string;
}

interface Detail {
  processo: Processo;
  eventos: Evento[];
  consulta: Consulta | null;
}

export function ProcessoDrawer({
  processoId,
  open,
  onOpenChange,
  etapas,
  tags,
}: {
  processoId: string | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  etapas: Etapa[];
  tags: Tag[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [acaoLoading, setAcaoLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !processoId) {
      setDetail(null);
      return;
    }
    setLoading(true);
    fetch(`/api/admin/processos/${processoId}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) setDetail({ processo: j.processo, eventos: j.eventos ?? [], consulta: j.consulta });
        else console.error("[drawer]", j.error);
      })
      .catch((e) => console.error("[drawer]", e))
      .finally(() => setLoading(false));
  }, [open, processoId]);

  function findTag(codigo: string | null | undefined): Tag | null {
    if (!codigo) return null;
    return tags.find((t) => t.codigo === codigo) || null;
  }
  function findEtapa(codigo: string | null | undefined): Etapa | null {
    if (!codigo) return null;
    return etapas.find((e) => e.codigo === codigo) || null;
  }

  async function moverEtapa(novaEtapa: string) {
    if (!processoId) return;
    setAcaoLoading("mover");
    try {
      const r = await fetch("/api/admin/processos/mover-etapa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          processo_id: processoId,
          nova_etapa: novaEtapa,
          mensagem: null,
          notificar_cliente: false,
        }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "Erro");
      // Recarrega
      const r2 = await fetch(`/api/admin/processos/${processoId}`);
      const j2 = await r2.json();
      if (j2.ok) setDetail({ processo: j2.processo, eventos: j2.eventos ?? [], consulta: j2.consulta });
      router.refresh();
    } catch (e) {
      alert(`Erro: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setAcaoLoading(null);
    }
  }

  async function finalizarLimpeza() {
    if (!processoId || !detail) return;
    if (!confirm(
      `Finalizar limpeza de ${detail.processo.nome}?\n\nVai disparar nova consulta (~R$ 8,29), gerar PDF atualizado e notificar o cliente.`
    )) return;
    setAcaoLoading("finalizar");
    try {
      const r = await fetch("/api/admin/processos/finalizar-limpeza", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ processo_id: processoId }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "Erro");
      const r2 = await fetch(`/api/admin/processos/${processoId}`);
      const j2 = await r2.json();
      if (j2.ok) setDetail({ processo: j2.processo, eventos: j2.eventos ?? [], consulta: j2.consulta });
      router.refresh();
    } catch (e) {
      alert(`Erro: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setAcaoLoading(null);
    }
  }

  const p = detail?.processo;
  const tag = findTag(p?.tag_servico);
  const etapa = findEtapa(p?.etapa);
  const proximaEtapa = etapa
    ? etapas.find((e) => e.ordem > etapa.ordem && e.ativo) || null
    : null;
  const podeFinalizar = p?.etapa === "em_tratativa";

  const initials = p?.nome
    ? p.nome.split(" ").slice(0, 2).map((s) => s.charAt(0).toUpperCase()).join("")
    : "?";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {loading || !p ? (
        <div className="flex-1 grid place-items-center text-gray-400">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : (
        <>
          <SheetHeader
            onClose={() => onOpenChange(false)}
            actions={
              <Link
                href={`/painel/processos/${p.id}`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-forest-800 hover:bg-forest-900 text-white text-xs font-semibold px-3 py-2 transition"
              >
                Ver detalhe
                <ExternalLink className="size-3.5" />
              </Link>
            }
          >
            <div className="flex items-start gap-3">
              <div className="size-12 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 grid place-items-center text-white font-bold text-base shadow-md shrink-0">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                {tag && (() => {
                  const c = corClasses(tag.cor);
                  return (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${c.bg} ${c.text} ${c.border} border text-[10px] font-semibold mb-1`}>
                      {tag.emoji} {tag.nome}
                    </span>
                  );
                })()}
                <h2 className="font-display text-xl text-forest-800 truncate">{p.nome}</h2>
                <p className="text-xs text-gray-500 font-mono">{maskCPF(p.cpf)}</p>
              </div>
            </div>
          </SheetHeader>

          <SheetBody className="space-y-5">
            {/* Etapa atual + acoes rapidas */}
            {etapa && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-2">Etapa atual</p>
                {(() => {
                  const c = corClasses(etapa.cor);
                  return (
                    <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg ${c.bg} ${c.text} ${c.border} border text-sm font-semibold`}>
                      <span className="text-lg">{etapa.emoji}</span>
                      <span>{etapa.nome}</span>
                    </div>
                  );
                })()}
                {etapa.descricao && (
                  <p className="text-xs text-gray-500 mt-2">{etapa.descricao}</p>
                )}

                {proximaEtapa && (
                  <button
                    onClick={() => moverEtapa(proximaEtapa.codigo)}
                    disabled={acaoLoading === "mover"}
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:text-brand-800 disabled:opacity-50"
                  >
                    {acaoLoading === "mover" ? <Loader2 className="size-3.5 animate-spin" /> : <ArrowRight className="size-3.5" />}
                    Avançar para: {proximaEtapa.emoji} {proximaEtapa.nome}
                  </button>
                )}

                {podeFinalizar && (
                  <button
                    onClick={finalizarLimpeza}
                    disabled={acaoLoading === "finalizar"}
                    className="mt-3 w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-3 py-2 transition disabled:opacity-60"
                  >
                    {acaoLoading === "finalizar" ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                    Finalizar Limpeza
                  </button>
                )}
              </div>
            )}

            {/* Contatos */}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-2">Contato</p>
              <div className="grid grid-cols-1 gap-2">
                {p.email && (
                  <a href={`mailto:${p.email}`} className="flex items-center gap-2 text-sm text-gray-700 hover:text-brand-700 group">
                    <Mail className="size-4 text-gray-400 group-hover:text-brand-600" />
                    <span className="truncate">{p.email}</span>
                  </a>
                )}
                {p.telefone && (
                  <a
                    href={`https://wa.me/${p.telefone.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener"
                    className="flex items-center gap-2 text-sm text-gray-700 hover:text-emerald-700 group"
                  >
                    <MessageCircle className="size-4 text-gray-400 group-hover:text-emerald-600" />
                    <span>{formatPhone(p.telefone)}</span>
                    <span className="text-[10px] text-emerald-600 font-semibold">WhatsApp</span>
                  </a>
                )}
              </div>
            </div>

            {/* Resumo financeiro / consulta */}
            <div className="grid grid-cols-2 gap-3">
              {p.valor_pago != null && Number(p.valor_pago) > 0 && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-emerald-700 font-semibold">Pago</p>
                  <p className="font-display text-xl text-emerald-800 mt-0.5">{formatBRL(Number(p.valor_pago))}</p>
                </div>
              )}
              {detail.consulta?.score != null && (
                <div className={`rounded-lg border p-3 ${
                  detail.consulta.score >= 701 ? "border-emerald-200 bg-emerald-50/40" :
                  detail.consulta.score >= 501 ? "border-amber-200 bg-amber-50/40" :
                  "border-red-200 bg-red-50/40"
                }`}>
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-600">Score</p>
                  <p className={`font-display text-xl mt-0.5 ${
                    detail.consulta.score >= 701 ? "text-emerald-800" :
                    detail.consulta.score >= 501 ? "text-amber-800" :
                    "text-red-800"
                  }`}>{detail.consulta.score}</p>
                </div>
              )}
            </div>

            {/* Consulta */}
            {detail.consulta && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-2">Consulta CPF</p>
                <div className="rounded-lg border border-gray-200 p-3 space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    {detail.consulta.tem_pendencia ? (
                      <Badge variant="danger">
                        <AlertCircle className="size-3 mr-1" />
                        Com pendências
                      </Badge>
                    ) : (
                      <Badge variant="success">
                        <CheckCircle2 className="size-3 mr-1" />
                        Nome limpo
                      </Badge>
                    )}
                  </div>
                  {detail.consulta.tem_pendencia && (
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                      <div>
                        <span className="block text-gray-400">Pendências</span>
                        <span className="font-bold text-forest-800">{detail.consulta.qtd_pendencias ?? 0}</span>
                      </div>
                      <div>
                        <span className="block text-gray-400">Total dívidas</span>
                        <span className="font-bold text-forest-800">
                          {detail.consulta.total_dividas ? formatBRL(detail.consulta.total_dividas) : "—"}
                        </span>
                      </div>
                    </div>
                  )}
                  {p.pdf_url && (
                    <a
                      href={p.pdf_url}
                      target="_blank"
                      rel="noopener"
                      className="inline-flex items-center gap-1.5 text-xs text-brand-700 hover:text-brand-800 font-semibold pt-1"
                    >
                      <FileText className="size-3.5" />
                      Abrir relatório PDF
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Timeline */}
            {detail.eventos.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-2">Histórico</p>
                <ol className="relative space-y-3 pl-4 border-l-2 border-gray-100">
                  {detail.eventos.slice(0, 8).map((e) => (
                    <li key={e.id} className="relative">
                      <span className="absolute -left-[21px] top-1 size-3 rounded-full bg-brand-400 ring-2 ring-white" />
                      <p className="text-sm text-forest-800 font-medium">
                        {e.tipo === "etapa" && e.etapa_nova
                          ? <>
                              {e.etapa_anterior && (
                                <span className="text-gray-400 text-xs">{findEtapa(e.etapa_anterior)?.nome ?? e.etapa_anterior} → </span>
                              )}
                              <span>{findEtapa(e.etapa_nova)?.emoji} {findEtapa(e.etapa_nova)?.nome ?? e.etapa_nova}</span>
                            </>
                          : <span className="capitalize">{e.tipo}</span>}
                      </p>
                      {e.mensagem && (
                        <p className="text-xs text-gray-600 mt-0.5 italic">{e.mensagem}</p>
                      )}
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {e.autor_nome && <>{e.autor_nome} · </>}
                        {formatDateTimeBR(e.created_at)}
                      </p>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Observacoes */}
            {p.observacoes && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-2">Observações</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed bg-gray-50 rounded-lg p-3 border border-gray-100">
                  {p.observacoes}
                </p>
              </div>
            )}

            {/* Metadados */}
            <div className="pt-3 border-t border-gray-100 text-[11px] text-gray-400 space-y-0.5">
              <p>Criado em {formatDateTimeBR(p.created_at)}</p>
              <p>Atualizado em {formatDateTimeBR(p.updated_at)}</p>
              {p.finalizado_em && <p>Finalizado em {formatDateTimeBR(p.finalizado_em)}</p>}
            </div>
          </SheetBody>

          <SheetFooter>
            {p.telefone && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`https://wa.me/${p.telefone!.replace(/\D/g, "")}`, "_blank")}
              >
                <MessageCircle className="size-4 mr-1" />
                WhatsApp
              </Button>
            )}
            <Link href={`/painel/processos/${p.id}`}>
              <Button size="sm">
                <TagIcon className="size-4 mr-1" />
                Ver detalhe completo
              </Button>
            </Link>
          </SheetFooter>
        </>
      )}
    </Sheet>
  );
}
