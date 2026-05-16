import { redirect } from "next/navigation";
import { getClienteSession, getClienteDashboardData } from "@/lib/auth/cliente";
import { getClienteProcessos } from "@/lib/auth/cliente-processos";
import { Card, CardContent } from "@/components/ui/card";
import {
  CheckCircle2, FileText, ShieldCheck, ArrowRight, Sparkles,
  MessageCircle, Clock, ChevronRight, AlertCircle,
} from "lucide-react";
import Link from "next/link";
import type { CRMRow, ConsultaRow, BlindagemRow } from "@/lib/supabase/types";
import { getEtapas, getTags } from "@/lib/kanban";
import { findEtapa, findTag, corClasses } from "@/lib/kanban-shared";
import { ProcessoTimelineCliente } from "./processo-timeline-cliente";

export const dynamic = "force-dynamic";

const WHATSAPP =
  "https://wa.me/5511997440101?text=" +
  encodeURIComponent("Olá! Sou cliente LNB e preciso de ajuda.");

export default async function ClienteDashboardPage() {
  const session = await getClienteSession();
  if (!session) redirect("/conta/login");

  const [dash, processos, etapas, tags] = await Promise.all([
    getClienteDashboardData(session.cpf),
    getClienteProcessos(session.cpf),
    getEtapas(),
    getTags(),
  ]);
  const _crm = dash.crm as CRMRow | null;
  const consulta = dash.consulta as ConsultaRow | null;
  const blindagem = dash.blindagem as BlindagemRow | null;
  void _crm;

  const etapasAtivas = etapas.filter((e) => e.ativo);

  return (
    <div className="space-y-5">
      {/* Header dark estilo Healthink */}
      <Card className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-0">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: "radial-gradient(circle at 20% 80%, rgba(16,185,129,0.5) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(139,92,246,0.4) 0%, transparent 50%)"
        }} />
        <CardContent className="p-6 sm:p-8 relative">
          <p className="text-emerald-300 text-xs uppercase tracking-wider font-bold mb-1">Bem-vindo</p>
          <h1 className="font-display text-2xl sm:text-3xl text-white tracking-tight">
            Olá, {session.nome.split(" ")[0]}
          </h1>
          <p className="text-gray-300 mt-1 text-sm">
            Acompanhe o seu processo e atualizações em tempo real.
          </p>
        </CardContent>
      </Card>

      {/* Processos com timeline */}
      {processos.length > 0 && (
        <div className="space-y-5">
          {processos.map((p) => {
            const tag = findTag(tags, (p as unknown as { tag_servico?: string }).tag_servico);
            const etapaAtual = findEtapa(etapasAtivas, p.etapa);
            const idxAtual = etapasAtivas.findIndex((e) => e.codigo === p.etapa);
            const progressPct = ((idxAtual + 1) / Math.max(1, etapasAtivas.length)) * 100;
            const finalizado = !!p.finalizado_em;

            return (
              <Card key={p.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-3 flex-wrap mb-5">
                    <div>
                      {tag && (() => {
                        const c = corClasses(tag.cor);
                        return (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md ${c.bg} ${c.text} text-[11px] font-semibold mb-1.5`}>
                            {tag.nome}
                          </span>
                        );
                      })()}
                      <h2 className="font-display text-lg text-gray-900 tracking-tight">
                        {finalizado ? "Processo concluído ✓" : "Em andamento"}
                      </h2>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {finalizado
                          ? `Finalizado em ${new Date(p.finalizado_em!).toLocaleDateString("pt-BR")}`
                          : "Acompanhe o avanço abaixo"}
                      </p>
                    </div>
                    {etapaAtual && (() => {
                      const c = corClasses(etapaAtual.cor);
                      return (
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md ${c.bg} ${c.text} text-sm font-semibold`}>
                          {etapaAtual.nome}
                        </span>
                      );
                    })()}
                  </div>

                  {/* Progress */}
                  <div className="mb-5">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-1000 rounded-full ${
                            finalizado
                              ? "bg-gradient-to-r from-emerald-400 to-emerald-500"
                              : "bg-gradient-to-r from-emerald-400 to-emerald-500"
                          }`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-gray-900 tabular-nums">{Math.round(progressPct)}%</span>
                    </div>

                    {/* Mini stepper */}
                    <ol className="flex gap-1.5 mt-3 overflow-x-auto pb-1">
                      {etapasAtivas.slice(0, 8).map((e, i) => {
                        const done = i <= idxAtual;
                        return (
                          <li key={e.codigo} className="flex-1 min-w-[60px]">
                            <div
                              className={`text-center text-[10px] font-medium px-2 py-1.5 rounded-md transition truncate ${
                                done
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-gray-50 text-gray-400"
                              }`}
                              title={e.nome}
                            >
                              {e.nome}
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  </div>

                  {/* Arquivos */}
                  {p.arquivos.length > 0 && (
                    <div className="mb-5">
                      <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-2">
                        Arquivos disponíveis
                      </p>
                      <ul className="space-y-2">
                        {p.arquivos.map((a) => (
                          <li
                            key={a.id}
                            className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100"
                          >
                            <FileText className="size-4 text-gray-400 shrink-0" />
                            <span className="flex-1 text-sm font-medium text-gray-900 truncate">
                              {a.nome_arquivo}
                            </span>
                            <ArquivoLink id={a.id} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Timeline */}
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-3">
                      Atualizações
                    </p>
                    <ProcessoTimelineCliente etapas={etapasAtivas} eventos={p.eventos} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Cards rápidos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Relatorio CPF */}
        <Card>
          <CardContent className="p-5">
            <div className="size-10 rounded-xl bg-emerald-50 grid place-items-center mb-3">
              <FileText className="size-5 text-emerald-600" />
            </div>
            <h3 className="font-display text-base font-semibold text-gray-900">Relatório CPF</h3>
            <p className="text-sm text-gray-500 mt-1 mb-3">
              {!consulta
                ? "Ainda não realizado"
                : consulta.pdf_url
                ? consulta.tem_pendencia ? "Com pendências" : "Nome limpo"
                : consulta.consulta_paga
                ? "Gerando relatório..."
                : "Aguardando pagamento"}
            </p>
            {consulta?.pdf_url ? (
              <Link href="/conta/relatorio" className="inline-flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700 font-semibold">
                Ver relatório <ChevronRight className="size-3.5" />
              </Link>
            ) : !consulta ? (
              <Link href="/consultar/cpf" className="inline-flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700 font-semibold">
                Fazer agora <ChevronRight className="size-3.5" />
              </Link>
            ) : consulta.consulta_paga ? (
              <Link href="/conta/relatorio" className="inline-flex items-center gap-1 text-sm text-amber-600 hover:text-amber-700 font-semibold">
                Acompanhar <ChevronRight className="size-3.5" />
              </Link>
            ) : (
              <p className="text-xs text-gray-400">Aguardando pagamento...</p>
            )}
          </CardContent>
        </Card>

        {/* Blindagem */}
        {blindagem?.ativo && (
          <Card>
            <CardContent className="p-5">
              <div className="size-10 rounded-xl bg-violet-50 grid place-items-center mb-3">
                <ShieldCheck className="size-5 text-violet-600" />
              </div>
              <h3 className="font-display text-base font-semibold text-gray-900">Monitoramento</h3>
              <p className="text-sm text-gray-500 mt-1 mb-3">
                {blindagem.tem_pendencia_atual ? "Pendência detectada" : "Tudo OK"}
              </p>
              <p className="text-[11px] text-gray-400">Monitoramento ativo</p>
            </CardContent>
          </Card>
        )}

        {/* Suporte */}
        <Card>
          <CardContent className="p-5">
            <div className="size-10 rounded-xl bg-amber-50 grid place-items-center mb-3">
              <MessageCircle className="size-5 text-amber-600" />
            </div>
            <h3 className="font-display text-base font-semibold text-gray-900">Suporte</h3>
            <p className="text-sm text-gray-500 mt-1 mb-3">Fale com nossa equipe</p>
            <a
              href={WHATSAPP}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700 font-semibold"
            >
              <MessageCircle className="size-3.5" /> WhatsApp
            </a>
          </CardContent>
        </Card>
      </div>

      {/* CTA primeira consulta */}
      {processos.length === 0 && !consulta && (
        <Card className="relative overflow-hidden bg-gradient-to-br from-emerald-600 to-emerald-700 border-0">
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: "radial-gradient(circle at 70% 30%, rgba(255,255,255,0.3) 0%, transparent 50%)"
          }} />
          <CardContent className="p-6 flex items-center justify-between gap-4 flex-wrap relative">
            <div className="flex items-center gap-4">
              <div className="size-12 rounded-xl bg-white/15 backdrop-blur grid place-items-center shrink-0">
                <Sparkles className="size-5 text-white" />
              </div>
              <div>
                <p className="font-display text-lg text-white">Faça sua primeira consulta</p>
                <p className="text-sm text-emerald-50">R$ 29,99 · Resultado em minutos</p>
              </div>
            </div>
            <Link href="/consultar/cpf" className="inline-flex items-center gap-2 rounded-lg bg-white text-emerald-700 px-5 h-11 font-semibold shadow-sm hover:shadow-md transition">
              Consultar agora <ArrowRight className="size-4" />
            </Link>
          </CardContent>
        </Card>
      )}

      {/* CTA limpeza pra quem tem pendencia */}
      {processos.length === 0 && consulta?.tem_pendencia && (
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4 flex-wrap">
              <div className="size-12 rounded-xl bg-amber-500 grid place-items-center shrink-0">
                <AlertCircle className="size-5 text-white" />
              </div>
              <div className="flex-1 min-w-[260px]">
                <p className="font-display text-lg text-amber-900">
                  Você tem {consulta.qtd_pendencias} pendência(s) no seu CPF
                </p>
                <p className="text-sm text-amber-800 mt-1">
                  A LNB pode limpar seu nome em até 20 dias úteis, sem você precisar quitar a dívida.
                </p>
                <a
                  href={WHATSAPP}
                  target="_blank"
                  rel="noopener"
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white px-5 h-11 font-semibold transition"
                >
                  <MessageCircle className="size-4" />
                  Falar com consultor
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Todos finalizados */}
      {processos.length > 0 && processos.every((p) => p.finalizado_em) && (
        <Card className="bg-emerald-50 border-emerald-200">
          <CardContent className="p-6 flex items-start gap-4">
            <CheckCircle2 className="size-10 text-emerald-600 shrink-0" />
            <div>
              <p className="font-display text-lg text-emerald-900">Processos concluídos!</p>
              <p className="text-sm text-emerald-800 mt-1">
                Acesse os arquivos acima a qualquer momento. Para qualquer dúvida, fale com nossa equipe.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Oferta blindagem pos-limpeza */}
      {processos.some((p) => p.etapa === "nome_limpo") && !blindagem?.ativo && (
        <Card className="relative overflow-hidden bg-gradient-to-br from-violet-600 to-violet-700 border-0">
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: "radial-gradient(circle at 70% 30%, rgba(255,255,255,0.3) 0%, transparent 50%)"
          }} />
          <CardContent className="p-6 flex items-center justify-between gap-4 flex-wrap relative">
            <div className="flex items-center gap-4">
              <div className="size-12 rounded-xl bg-white/15 backdrop-blur grid place-items-center shrink-0">
                <ShieldCheck className="size-5 text-white" />
              </div>
              <div>
                <p className="font-display text-lg text-white">Mantenha seu nome limpo</p>
                <p className="text-sm text-violet-50">Blindagem mensal · R$ 29,90/mês</p>
              </div>
            </div>
            <a
              href={WHATSAPP}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-2 rounded-lg bg-white text-violet-700 px-5 h-11 font-semibold shadow-sm hover:shadow-md transition"
            >
              Saiba mais <ArrowRight className="size-4" />
            </a>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ArquivoLink({ id }: { id: string }) {
  return (
    <a
      href={`/api/cliente/arquivo-url/${id}`}
      target="_blank"
      rel="noopener"
      onClick={async (e) => {
        e.preventDefault();
        try {
          const r = await fetch(`/api/cliente/arquivo-url/${id}`);
          const d = await r.json();
          if (d.ok && d.url) window.open(d.url, "_blank");
        } catch {}
      }}
      className="inline-flex items-center gap-1.5 px-3 h-8 rounded-md bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold transition shrink-0"
    >
      Baixar
    </a>
  );
}

void Clock;
