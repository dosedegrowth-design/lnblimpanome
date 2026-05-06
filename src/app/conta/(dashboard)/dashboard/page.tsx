import { redirect } from "next/navigation";
import { getClienteSession, getClienteDashboardData } from "@/lib/auth/cliente";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, FileText, ShieldCheck, ArrowRight } from "lucide-react";
import Link from "next/link";
import type { CRMRow, ConsultaRow, BlindagemRow } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const ETAPAS = [
  { id: "lead",            label: "Cadastro",          desc: "Você entrou em contato com a LNB" },
  { id: "consulta_paga",   label: "Consulta paga",     desc: "Consulta de CPF realizada" },
  { id: "qualificado",     label: "Plano contratado",  desc: "Limpeza + blindagem ativadas" },
  { id: "fechado",         label: "Em andamento",      desc: "Equipe trabalhando na limpeza" },
  { id: "concluido",       label: "Nome limpo",        desc: "Processo finalizado" },
];

export default async function ClienteDashboardPage() {
  const session = await getClienteSession();
  if (!session) redirect("/conta/login");

  const data = await getClienteDashboardData(session.cpf);
  const crm = data.crm as CRMRow | null;
  const consulta = data.consulta as ConsultaRow | null;
  const blindagem = data.blindagem as BlindagemRow | null;

  let currentStage = 0;
  if (crm) currentStage = 1;
  if (crm?.consulta_paga) currentStage = 2;
  if (crm?.Qualificado) currentStage = 3;
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
              {consulta ? `Score: ${consulta.score ?? "—"}` : "Ainda não realizado"}
            </p>
            {consulta?.pdf_url ? (
              <Link href="/conta/relatorio" className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 font-semibold">
                Ver relatório <ArrowRight className="size-3.5" />
              </Link>
            ) : (
              <p className="text-xs text-gray-400">Disponível após consulta</p>
            )}
          </CardContent>
        </Card>

        <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all">
          <CardContent className="p-6">
            <div className="size-12 rounded-xl bg-gradient-to-br from-forest-500 to-forest-700 grid place-items-center mb-4 shadow-md">
              <ShieldCheck className="size-6 text-white" />
            </div>
            <h3 className="font-display text-lg text-forest-800 mb-1">Blindagem</h3>
            {blindagem?.status === "ativa" ? (
              <>
                <p className="text-sm text-gray-500 mb-3">{blindagem.alertas_enviados ?? 0} alertas enviados</p>
                <Link href="/conta/blindagem" className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 font-semibold">
                  Detalhes <ArrowRight className="size-3.5" />
                </Link>
              </>
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
    </div>
  );
}
