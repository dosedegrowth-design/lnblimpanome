"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Mail, Phone, MessageCircle, FileText, ExternalLink, ArrowRight,
  Loader2, Sparkles, AlertCircle, CheckCircle2,
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

  // Calcula progresso (0-100) baseado na ordem da etapa entre todas etapas ativas
  const etapasAtivas = etapas.filter((e) => e.ativo);
  const idxEtapa = etapa ? etapasAtivas.findIndex((e) => e.codigo === etapa.codigo) : 0;
  const progressoPct = etapasAtivas.length > 0
    ? Math.round(((idxEtapa + 1) / etapasAtivas.length) * 100)
    : 0;

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
                className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold px-3 py-2 transition"
              >
                Ver detalhe
                <ExternalLink className="size-3.5" />
              </Link>
            }
          >
            <div className="flex items-start gap-4">
              <div className="size-14 rounded-full bg-gradient-to-br from-violet-400 via-fuchsia-400 to-rose-400 grid place-items-center text-white font-semibold text-lg shadow-sm shrink-0">
                {initials}
              </div>
              <div className="flex-1 min-w-0 pt-1">
                <h2 className="font-display text-lg text-gray-900 truncate leading-tight">{p.nome}</h2>
                <p className="text-xs text-gray-500 mt-0.5">{p.email || maskCPF(p.cpf)}</p>
                {tag && (() => {
                  const c = corClasses(tag.cor);
                  return (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md ${c.bg} ${c.text} text-[10px] font-medium mt-2`}>
                      {tag.nome}
                    </span>
                  );
                })()}
              </div>
            </div>
          </SheetHeader>

          <SheetBody className="space-y-5">
            {/* Acoes rapidas (chat/mail/phone/more - estilo Plan) */}
            <div className="flex items-center gap-2">
              {p.telefone && (
                <a
                  href={`https://wa.me/${p.telefone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener"
                  className="size-9 grid place-items-center rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition"
                  title="WhatsApp"
                >
                  <MessageCircle className="size-4" />
                </a>
              )}
              {p.email && (
                <a
                  href={`mailto:${p.email}`}
                  className="size-9 grid place-items-center rounded-lg bg-cyan-50 hover:bg-cyan-100 text-cyan-600 transition"
                  title="Email"
                >
                  <Mail className="size-4" />
                </a>
              )}
              {p.telefone && (
                <a
                  href={`tel:${p.telefone}`}
                  className="size-9 grid place-items-center rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-600 transition"
                  title="Ligar"
                >
                  <Phone className="size-4" />
                </a>
              )}
            </div>

            {/* Grid 2x2 (estilo Plan: Lead owner / Location / Referral / Income) */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-y border-gray-100 py-4">
              <InfoField label="CPF" value={maskCPF(p.cpf)} mono />
              <InfoField label="Telefone" value={p.telefone ? formatPhone(p.telefone) : "—"} />
              <InfoField label="Origem" value={p.tipo || "—"} />
              <InfoField
                label="Pago"
                value={p.valor_pago && Number(p.valor_pago) > 0 ? formatBRL(Number(p.valor_pago)) : "—"}
                emphasize={p.valor_pago != null && Number(p.valor_pago) > 0}
              />
            </div>

            {/* Etapa atual + progress + acoes */}
            {etapa && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Progresso</p>
                  <span className="text-xs text-gray-500">{progressoPct}% concluído</span>
                </div>
                {/* Progress bar verde estilo Plan */}
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3 relative">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all"
                    style={{ width: `${progressoPct}%` }}
                  />
                </div>
                {(() => {
                  const c = corClasses(etapa.cor);
                  return (
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md ${c.bg} ${c.text} text-xs font-semibold`}>
                      <span>{etapa.nome}</span>
                    </div>
                  );
                })()}

                <div className="flex gap-2 mt-3">
                  {proximaEtapa && (
                    <button
                      onClick={() => moverEtapa(proximaEtapa.codigo)}
                      disabled={acaoLoading === "mover"}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 px-3 py-1.5 rounded-md transition disabled:opacity-50"
                    >
                      {acaoLoading === "mover" ? <Loader2 className="size-3.5 animate-spin" /> : <ArrowRight className="size-3.5" />}
                      {proximaEtapa.nome}
                    </button>
                  )}
                  {podeFinalizar && (
                    <button
                      onClick={finalizarLimpeza}
                      disabled={acaoLoading === "finalizar"}
                      className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 transition disabled:opacity-60"
                    >
                      {acaoLoading === "finalizar" ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                      Finalizar Limpeza
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Score badge */}
            {detail.consulta?.score != null && (
              <div className="grid grid-cols-2 gap-3">
                <div className={`rounded-lg p-3 ${
                  detail.consulta.score >= 701 ? "bg-emerald-50" :
                  detail.consulta.score >= 501 ? "bg-amber-50" :
                  "bg-red-50"
                }`}>
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-600">Score</p>
                  <p className={`font-display text-2xl mt-0.5 tabular-nums ${
                    detail.consulta.score >= 701 ? "text-emerald-700" :
                    detail.consulta.score >= 501 ? "text-amber-700" :
                    "text-red-700"
                  }`}>{detail.consulta.score}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-600">Pendências</p>
                  <p className="font-display text-2xl mt-0.5 tabular-nums text-gray-900">{detail.consulta.qtd_pendencias ?? 0}</p>
                </div>
              </div>
            )}

            {/* Relatorio PDF + Pendencias */}
            {detail.consulta && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Status da consulta</p>
                  {detail.consulta.tem_pendencia ? (
                    <Badge variant="danger" className="text-[10px]">
                      <AlertCircle className="size-3 mr-1" />
                      Com pendências
                    </Badge>
                  ) : (
                    <Badge variant="success" className="text-[10px]">
                      <CheckCircle2 className="size-3 mr-1" />
                      Nome limpo
                    </Badge>
                  )}
                </div>
                {p.pdf_url && (
                  <a
                    href={p.pdf_url}
                    target="_blank"
                    rel="noopener"
                    className="flex items-center gap-2 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-100 transition text-sm text-gray-700 group"
                  >
                    <FileText className="size-4 text-gray-400 group-hover:text-gray-700" />
                    <span className="flex-1">Relatório completo (PDF)</span>
                    <ExternalLink className="size-3.5 text-gray-400 group-hover:text-gray-700" />
                  </a>
                )}
              </div>
            )}

            {/* Latest Activities (estilo Plan) */}
            {detail.eventos.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-900">Atividades recentes</p>
                  <span className="inline-flex items-center justify-center size-5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">
                    {Math.min(detail.eventos.length, 8)}
                  </span>
                </div>
                <ol className="relative space-y-3 pl-4 border-l-2 border-gray-100">
                  {detail.eventos.slice(0, 8).map((e) => (
                    <li key={e.id} className="relative">
                      <span className="absolute -left-[21px] top-1 size-2.5 rounded-full bg-gray-900 ring-2 ring-white" />
                      <p className="text-sm text-gray-900">
                        {e.tipo === "etapa" && e.etapa_nova
                          ? <>
                              {e.etapa_anterior && (
                                <span className="text-gray-400 text-xs">{findEtapa(e.etapa_anterior)?.nome ?? e.etapa_anterior} → </span>
                              )}
                              <span className="font-medium">{findEtapa(e.etapa_nova)?.nome ?? e.etapa_nova}</span>
                            </>
                          : <span className="capitalize font-medium">{e.tipo}</span>}
                      </p>
                      {e.mensagem && (
                        <p className="text-xs text-gray-600 mt-0.5">{e.mensagem}</p>
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

            {/* Notas (estilo Plan) */}
            {p.observacoes && (
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-2">Observações</p>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {p.observacoes}
                  </p>
                </div>
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
            <Link href={`/painel/processos/${p.id}`}>
              <Button size="sm">
                <ExternalLink className="size-4 mr-1" />
                Ver detalhe completo
              </Button>
            </Link>
          </SheetFooter>
        </>
      )}
    </Sheet>
  );
}

function InfoField({
  label, value, mono, emphasize,
}: {
  label: string;
  value: string;
  mono?: boolean;
  emphasize?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium mb-0.5">{label}</p>
      <p className={`text-sm truncate ${mono ? "font-mono" : ""} ${emphasize ? "text-emerald-700 font-semibold" : "text-gray-900"}`}>
        {value}
      </p>
    </div>
  );
}
