import { redirect } from "next/navigation";
import { getClienteSession, getClienteDashboardData } from "@/lib/auth/cliente";
import { getClienteProcessos } from "@/lib/auth/cliente-processos";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, FileText, ShieldCheck, ArrowRight, Sparkles, MessageCircle, Clock } from "lucide-react";
import Link from "next/link";
import type { CRMRow, ConsultaRow, BlindagemRow } from "@/lib/supabase/types";
import { TIPOS_LABEL, getEtapa, getEtapas, type TipoServico } from "@/lib/processos";
import { ProcessoTimelineCliente } from "./processo-timeline-cliente";

export const dynamic = "force-dynamic";

const WHATSAPP =
  "https://wa.me/5511997440101?text=" +
  encodeURIComponent("Olá! Sou cliente LNB e preciso de ajuda.");

export default async function ClienteDashboardPage() {
  const session = await getClienteSession();
  if (!session) redirect("/conta/login");

  const [dash, processos] = await Promise.all([
    getClienteDashboardData(session.cpf),
    getClienteProcessos(session.cpf),
  ]);
  const crm = dash.crm as CRMRow | null;
  const consulta = dash.consulta as ConsultaRow | null;
  const blindagem = dash.blindagem as BlindagemRow | null;

  return (
    <div className="space-y-6">
      <header className="bg-gradient-to-br from-forest-700 to-forest-900 rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/15 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <h1 className="font-display text-2xl sm:text-3xl">Olá, {session.nome.split(" ")[0]}!</h1>
          <p className="text-sand-100/80 mt-1 text-sm sm:text-base">
            Acompanhe seus processos e atualizações em tempo real.
          </p>
        </div>
      </header>

      {/* Processos ativos com timeline */}
      {processos.length > 0 && (
        <div className="space-y-6">
          {processos.map((p) => {
            const etapas = getEtapas(p.tipo as TipoServico);
            const etapaAtual = getEtapa(p.tipo as TipoServico, p.etapa);
            const idxAtual = etapas.findIndex((e) => e.id === p.etapa);
            const progressPct = ((idxAtual + 1) / etapas.length) * 100;
            const finalizado = !!p.finalizado_em;

            return (
              <Card key={p.id} className="overflow-hidden">
                <CardHeader className="flex flex-row items-start justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
                      {TIPOS_LABEL[p.tipo as TipoServico]}
                    </p>
                    <CardTitle className="mt-1">
                      {finalizado ? "Processo concluído ✓" : "Em andamento"}
                    </CardTitle>
                  </div>
                  {etapaAtual && (
                    <Badge variant={finalizado ? "success" : "brand"} className="text-sm py-1 px-3">
                      {etapaAtual.emoji} {etapaAtual.label}
                    </Badge>
                  )}
                </CardHeader>

                <CardContent className="space-y-5">
                  {/* Barra de progresso */}
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-1000 ${
                            finalizado
                              ? "bg-gradient-to-r from-emerald-400 to-emerald-500"
                              : "bg-gradient-to-r from-brand-400 to-brand-500"
                          }`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-forest-800">{Math.round(progressPct)}%</span>
                    </div>

                    {/* Mini stepper */}
                    <ol className="flex gap-1.5 mt-3 overflow-x-auto pb-1">
                      {etapas.map((e, i) => {
                        const done = i <= idxAtual;
                        return (
                          <li key={e.id} className="flex-1 min-w-[60px]">
                            <div
                              className={`text-center text-[10px] font-semibold px-2 py-1.5 rounded-md transition ${
                                done
                                  ? "bg-brand-50 text-brand-700"
                                  : "bg-gray-50 text-gray-400"
                              }`}
                            >
                              {e.emoji} {e.label}
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  </div>

                  {/* Arquivos */}
                  {p.arquivos.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">
                        📎 Arquivos disponíveis
                      </p>
                      <ul className="space-y-2">
                        {p.arquivos.map((a) => (
                          <li
                            key={a.id}
                            className="flex items-center gap-3 p-3 rounded-lg bg-sand-50 border border-sand-200"
                          >
                            <FileText className="size-4 text-brand-600 shrink-0" />
                            <span className="flex-1 text-sm font-semibold text-forest-800 truncate">
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
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">
                      📜 Atualizações
                    </p>
                    <ProcessoTimelineCliente eventos={p.eventos} tipo={p.tipo as TipoServico} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Cards rápidos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all">
          <CardContent className="p-6">
            <div className="size-12 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 grid place-items-center mb-4 shadow-md">
              <FileText className="size-6 text-white" />
            </div>
            <h3 className="font-display text-lg text-forest-800 mb-1">Relatório CPF</h3>
            <p className="text-sm text-gray-500 mb-3">
              {consulta
                ? consulta.tem_pendencia ? "Com pendências" : "Nome limpo"
                : "Ainda não realizado"}
            </p>
            {consulta?.pdf_url ? (
              <Link href="/conta/relatorio" className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 font-semibold">
                Ver relatório <ArrowRight className="size-3.5" />
              </Link>
            ) : !consulta ? (
              <Link href="/consultar" className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 font-semibold">
                Fazer agora <ArrowRight className="size-3.5" />
              </Link>
            ) : (
              <p className="text-xs text-gray-400">Gerando...</p>
            )}
          </CardContent>
        </Card>

        <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all">
          <CardContent className="p-6">
            <div className="size-12 rounded-xl bg-gradient-to-br from-forest-500 to-forest-700 grid place-items-center mb-4 shadow-md">
              <ShieldCheck className="size-6 text-white" />
            </div>
            <h3 className="font-display text-lg text-forest-800 mb-1">Blindagem</h3>
            {blindagem?.ativo ? (
              <>
                <p className="text-sm text-gray-500 mb-3">
                  {blindagem.tem_pendencia_atual ? "Pendência detectada" : "Tudo OK"}
                </p>
                <Link href="/conta/blindagem" className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 font-semibold">
                  Detalhes <ArrowRight className="size-3.5" />
                </Link>
              </>
            ) : (
              <p className="text-sm text-gray-500">{blindagem ? "Pausada" : "Não contratada"}</p>
            )}
          </CardContent>
        </Card>

        <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all">
          <CardContent className="p-6">
            <div className="size-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 grid place-items-center mb-4 shadow-md">
              <Clock className="size-6 text-white" />
            </div>
            <h3 className="font-display text-lg text-forest-800 mb-1">Suporte</h3>
            <p className="text-sm text-gray-500 mb-3">Fale com nossa equipe</p>
            <a
              href={WHATSAPP}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 font-semibold"
            >
              <MessageCircle className="size-3.5" /> WhatsApp
            </a>
          </CardContent>
        </Card>
      </div>

      {/* Sugestão pra novos clientes */}
      {processos.length === 0 && !consulta && (
        <Card className="bg-gradient-to-br from-brand-50 via-sand-50 to-brand-50 border-brand-200">
          <CardContent className="p-6 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="size-12 rounded-xl bg-brand-500 grid place-items-center shrink-0">
                <Sparkles className="size-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-forest-800">Faça sua primeira consulta</p>
                <p className="text-sm text-gray-600">R$ 19,99 · Resultado em minutos</p>
              </div>
            </div>
            <Link href="/consultar" className="inline-flex items-center gap-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white px-5 h-11 font-semibold shadow-md shadow-brand-500/25 transition">
              Consultar agora <ArrowRight className="size-4" />
            </Link>
          </CardContent>
        </Card>
      )}

      {processos.length === 0 && consulta?.tem_pendencia && (
        <Card className="bg-gradient-to-br from-red-50 via-amber-50/50 to-red-50 border-red-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4 flex-wrap">
              <div className="size-12 rounded-xl bg-red-500 grid place-items-center shrink-0">
                <Sparkles className="size-5 text-white" />
              </div>
              <div className="flex-1 min-w-[260px]">
                <p className="font-bold text-red-800">Você tem {consulta.qtd_pendencias} pendência(s)</p>
                <p className="text-sm text-gray-700 mt-1">
                  A LNB pode limpar seu nome em até 20 dias úteis, sem você precisar quitar a dívida.
                </p>
                <a
                  href={WHATSAPP}
                  target="_blank"
                  rel="noopener"
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-red-500 hover:bg-red-600 text-white px-5 h-11 font-semibold shadow-md transition"
                >
                  <MessageCircle className="size-4" />
                  Falar com consultor
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {processos.length > 0 && processos.every((p) => p.finalizado_em) && (
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
          <CardContent className="p-6 flex items-start gap-4">
            <CheckCircle2 className="size-10 text-emerald-600 shrink-0" />
            <div>
              <p className="font-bold text-emerald-800">Todos os seus processos foram concluídos! 🎉</p>
              <p className="text-sm text-gray-700 mt-1">
                Acesse os arquivos acima a qualquer momento. Caso precise de algo, fale com nossa equipe.
              </p>
            </div>
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
      className="inline-flex items-center gap-1.5 px-3 h-8 rounded-md bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold transition shrink-0"
    >
      Baixar
    </a>
  );
}
