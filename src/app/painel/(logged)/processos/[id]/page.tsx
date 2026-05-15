import { requireAdmin } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Briefcase, FileSearch } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatBRL, formatDateTimeBR, formatPhone, maskCPF } from "@/lib/utils";
import { getEtapas, getTags, findEtapa, findTag, corClasses } from "@/lib/kanban";
import type { ProcessoRow, EventoRow, ArquivoRow } from "@/lib/processos";
import { ProcessoActions } from "./processo-actions";
import { ProcessoTimeline } from "./processo-timeline";
import { ProcessoArquivos } from "./processo-arquivos";

export const dynamic = "force-dynamic";

interface Consulta {
  id?: string;
  cpf?: string;
  nome?: string | null;
  tem_pendencia?: boolean | null;
  qtd_pendencias?: number | null;
  total_dividas?: number | null;
  resumo?: string | null;
  pdf_url?: string | null;
  created_at?: string;
}

interface DetailResp {
  processo: (ProcessoRow & {
    tag_servico?: string | null;
    pdf_url?: string | null;
    valor_pago?: number | null;
  }) | null;
  eventos: EventoRow[];
  arquivos: ArquivoRow[];
  consulta: (Consulta & { resultado_raw?: unknown }) | null;
  error?: string;
}

export default async function ProcessoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const supa = await createClient();

  const [{ data, error }, etapas, tags] = await Promise.all([
    supa.rpc("admin_processo_detail", { p_processo_id: id }),
    getEtapas(),
    getTags(),
  ]);

  if (error) redirect("/painel/processos");
  const detail = data as DetailResp & { processo: (ProcessoRow & { tag_servico?: string | null }) | null };
  if (!detail?.processo) redirect("/painel/processos");

  const p = detail.processo;
  const etapa = findEtapa(etapas, p.etapa);
  const tagAtual = findTag(tags, p.tag_servico);

  return (
    <div className="p-6 sm:p-8 max-w-6xl mx-auto">
      <Link
        href="/painel/processos"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-forest-700 mb-4"
      >
        <ArrowLeft className="size-4" />
        Voltar pra lista
      </Link>

      <header className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-4">
          <div className="size-12 rounded-xl bg-brand-50 grid place-items-center shrink-0">
            <Briefcase className="size-5 text-brand-600" />
          </div>
          <div>
            {tagAtual && (() => {
              const tc = corClasses(tagAtual.cor);
              return (
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full ${tc.bg} ${tc.text} ${tc.border} border text-xs font-semibold mb-1`}>
                  {tagAtual.emoji && <span>{tagAtual.emoji}</span>}
                  <span>{tagAtual.nome}</span>
                </span>
              );
            })()}
            <h1 className="font-display text-3xl text-forest-800">{p.nome}</h1>
            <p className="text-sm text-gray-500 font-mono mt-1">{maskCPF(p.cpf)}</p>
          </div>
        </div>
        {etapa && (
          <Badge variant="brand" className="text-sm py-1 px-3">
            {etapa.emoji} {etapa.nome}
          </Badge>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {/* Ações */}
          <Card>
            <CardHeader>
              <CardTitle>Ações do processo</CardTitle>
            </CardHeader>
            <CardContent>
              <ProcessoActions
                processoId={p.id}
                etapas={etapas}
                etapaAtual={p.etapa}
                cliente={{ nome: p.nome, telefone: p.telefone, email: p.email }}
              />
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <ProcessoTimeline etapas={etapas} eventos={detail.eventos} />
            </CardContent>
          </Card>

          {/* Arquivos */}
          <Card>
            <CardHeader>
              <CardTitle>Arquivos</CardTitle>
            </CardHeader>
            <CardContent>
              <ProcessoArquivos processoId={p.id} arquivos={detail.arquivos} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {/* Dados cliente */}
          <Card>
            <CardHeader>
              <CardTitle>Cliente</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <Row label="Nome" value={p.nome} />
              <Row label="CPF" value={maskCPF(p.cpf)} mono />
              <Row label="Email" value={p.email || "—"} />
              <Row label="Telefone" value={p.telefone ? formatPhone(p.telefone) : "—"} />
              <Row label="Criado em" value={formatDateTimeBR(p.created_at)} />
              <Row label="Atualizado em" value={formatDateTimeBR(p.updated_at)} />
              {p.finalizado_em && <Row label="Finalizado em" value={formatDateTimeBR(p.finalizado_em)} />}
            </CardContent>
          </Card>

          {/* Pagamento */}
          {p.valor_pago != null && Number(p.valor_pago) > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Pagamento</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <Row label="Total pago" value={<span className="text-emerald-700">{formatBRL(Number(p.valor_pago))}</span>} />
              </CardContent>
            </Card>
          )}

          {/* Consulta CPF (se tem) */}
          {detail.consulta && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <FileSearch className="size-4 text-brand-600" />
                  <CardTitle>Relatório CPF</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <Row
                  label="Situação"
                  value={
                    detail.consulta.tem_pendencia
                      ? <Badge variant="danger">Com pendências</Badge>
                      : <Badge variant="success">Limpo</Badge>
                  }
                />
                <Row label="Pendências" value={`${detail.consulta.qtd_pendencias ?? 0}`} />
                <Row label="Total dívidas" value={detail.consulta.total_dividas ? formatBRL(detail.consulta.total_dividas) : "—"} />
                {detail.consulta.resumo && (
                  <p className="text-xs text-gray-600 mt-3 pt-3 border-t border-gray-100 italic leading-relaxed">
                    {detail.consulta.resumo}
                  </p>
                )}
                {detail.consulta.pdf_url && (
                  <a
                    href={detail.consulta.pdf_url}
                    target="_blank"
                    rel="noopener"
                    className="block mt-3 text-center text-xs text-brand-600 hover:underline font-semibold"
                  >
                    Abrir PDF da consulta
                  </a>
                )}
              </CardContent>
            </Card>
          )}

          {p.observacoes && (
            <Card>
              <CardHeader>
                <CardTitle>Observações</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{p.observacoes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-3 py-1.5 border-b border-gray-100 last:border-0">
      <span className="text-gray-500 text-xs uppercase tracking-wider">{label}</span>
      <span className={`font-semibold text-forest-800 text-right ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}
