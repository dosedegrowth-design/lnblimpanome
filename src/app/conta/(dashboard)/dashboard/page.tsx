import { redirect } from "next/navigation";
import { getClienteSession, getClienteDashboardData } from "@/lib/auth/cliente";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, FileText, ShieldCheck, ArrowRight, Sparkles, MessageCircle } from "lucide-react";
import Link from "next/link";
import type { CRMRow, ConsultaRow, BlindagemRow } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const ETAPAS = [
  { id: "lead",          label: "Cadastro",         desc: "Você se cadastrou na LNB" },
  { id: "consulta_paga", label: "Consulta paga",    desc: "Resultado do CPF disponível" },
  { id: "fechou",        label: "Plano contratado", desc: "Limpeza + blindagem ativadas" },
  { id: "fechado",       label: "Em andamento",     desc: "Equipe trabalhando na limpeza" },
  { id: "concluido",     label: "Nome limpo",       desc: "Processo finalizado" },
];

const WHATSAPP =
  "https://wa.me/5511999999999?text=" +
  encodeURIComponent("Olá! Sou cliente LNB e preciso de ajuda.");

export default async function ClienteDashboardPage() {
  const session = await getClienteSession();
  if (!session) redirect("/conta/login");

  const data = await getClienteDashboardData(session.cpf);
  const crm = data.crm as CRMRow | null;
  const consulta = data.consulta as ConsultaRow | null;
  const blindagem = data.blindagem as BlindagemRow | null;

  let currentStage = 0;
  if (crm) currentStage = 1;
  if (consulta?.consulta_paga) currentStage = 2;
  if (consulta?.fechou_limpeza) currentStage = 3;
  if (crm?.Fechado) currentStage = 4;

  const progressPct = ((currentStage + 1) / ETAPAS.length) * 100;

  return (
    <div className="space-y-6">
      <header className="bg-gradient-to-br from-forest-700 to-forest-900 rounded-2xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/15 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <h1 className="font-display text-3xl">Olá, {session.nome.split(" ")[0]}!</h1>
          <p className="text-sand-100/80 mt-1">Acompanhe seu processo de limpeza de nome.</p>

          <div className="mt-5 flex items-center gap-3">
            <div className="flex-1 h-2 rounded-full bg-white/15 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-brand-400 to-brand-300 transition-all duration-1000"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-sm font-bold text-brand-300">{Math.round(progressPct)}%</span>
          </div>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Seu processo</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-1">
            {ETAPAS.map((etapa, i) => {
              const isDone = i < currentStage;
              const isCurrent = i === currentStage;
              return (
                <li key={etapa.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`size-10 rounded-full grid place-items-center transition-all font-bold text-sm ${
                      isDone ? "bg-brand-500 text-white shadow-md shadow-brand-500/30" :
                      isCurrent ? "bg-brand-100 text-brand-700 ring-4 ring-brand-50 shadow-sm" :
                      "bg-gray-100 text-gray-400"
                    }`}>
                      {isDone ? <CheckCircle2 className="size-5" /> : (i + 1)}
                    </div>
                    {i < ETAPAS.length - 1 && (
                      <div className={`w-0.5 h-12 mt-1 ${isDone ? "bg-brand-300" : "bg-gray-200"}`} />
                    )}
                  </div>
                  <div className="pb-6 pt-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`font-bold ${isCurrent ? "text-brand-700" : isDone ? "text-forest-800" : "text-gray-400"}`}>
                        {etapa.label}
                      </p>
                      {isCurrent && <Badge variant="brand">Etapa atual</Badge>}
                      {isDone && <Badge variant="success">Concluída</Badge>}
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">{etapa.desc}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>

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
            ) : blindagem ? (
              <p className="text-sm text-gray-500">Pausada</p>
            ) : (
              <p className="text-sm text-gray-500">Não contratada</p>
            )}
          </CardContent>
        </Card>

        <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all">
          <CardContent className="p-6">
            <div className="size-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 grid place-items-center mb-4 shadow-md">
              <Clock className="size-6 text-white" />
            </div>
            <h3 className="font-display text-lg text-forest-800 mb-1">Prazo</h3>
            <p className="text-sm text-gray-500">
              {currentStage >= 3 ? "Até 20 dias úteis" : "Aguardando contratação"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sugestão: fazer consulta */}
      {!consulta && (
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

      {/* Sugestão: contratar limpeza */}
      {consulta?.tem_pendencia && currentStage < 3 && (
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
    </div>
  );
}
