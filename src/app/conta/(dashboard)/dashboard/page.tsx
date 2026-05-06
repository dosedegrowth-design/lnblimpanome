import { redirect } from "next/navigation";
import { getClienteSession } from "@/lib/auth/cliente";
import { createServiceClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, FileText, ShieldCheck } from "lucide-react";
import Link from "next/link";
import type { CRMRow, ConsultaRow, BlindagemRow } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const ETAPAS = [
  { id: "lead",            label: "Cadastro",           desc: "Você entrou em contato com a LNB" },
  { id: "consulta_paga",   label: "Consulta paga",      desc: "Consulta de CPF realizada" },
  { id: "qualificado",     label: "Plano contratado",   desc: "Limpeza + blindagem ativadas" },
  { id: "fechado",         label: "Em andamento",       desc: "Equipe trabalhando na limpeza" },
  { id: "concluido",       label: "Nome limpo",         desc: "Processo finalizado" },
];

export default async function ClienteDashboardPage() {
  const session = await getClienteSession();
  if (!session) redirect("/conta/login");

  const supa = createServiceClient();
  const [crmR, consultaR, blindagemR] = await Promise.all([
    supa.from("LNB - CRM").select("*").eq("CPF", session.cpf).maybeSingle<CRMRow>(),
    supa.from("LNB_Consultas").select("*").eq("cpf", session.cpf).maybeSingle<ConsultaRow>(),
    supa.from("LNB_Blindagem").select("*").eq("cpf", session.cpf).maybeSingle<BlindagemRow>(),
  ]);

  const crm = crmR.data;
  const consulta = consultaR.data;
  const blindagem = blindagemR.data;

  // Determinar etapa atual
  let currentStage = 0;
  if (crm) currentStage = 1;
  if (crm?.consulta_paga) currentStage = 2;
  if (crm?.Qualificado) currentStage = 3;
  if (crm?.Fechado) currentStage = 4;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">Olá, {session.nome.split(" ")[0]}!</h1>
        <p className="text-gray-500 mt-1">Acompanhe seu processo de limpeza de nome.</p>
      </header>

      {/* Status visual do processo */}
      <Card>
        <CardHeader>
          <CardTitle>Seu processo</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-4">
            {ETAPAS.map((etapa, i) => {
              const isDone = i < currentStage;
              const isCurrent = i === currentStage;
              return (
                <li key={etapa.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`size-9 rounded-full grid place-items-center transition ${
                      isDone ? "bg-brand-500 text-white" :
                      isCurrent ? "bg-brand-100 text-brand-700 ring-4 ring-brand-50" :
                      "bg-gray-100 text-gray-400"
                    }`}>
                      {isDone ? <CheckCircle2 className="size-5" /> : (i + 1)}
                    </div>
                    {i < ETAPAS.length - 1 && (
                      <div className={`w-0.5 h-10 mt-1 ${isDone ? "bg-brand-300" : "bg-gray-200"}`} />
                    )}
                  </div>
                  <div className="pb-6">
                    <p className={`font-semibold ${isCurrent ? "text-brand-700" : isDone ? "text-gray-900" : "text-gray-400"}`}>
                      {etapa.label} {isCurrent && <Badge variant="brand" className="ml-2">Atual</Badge>}
                    </p>
                    <p className="text-sm text-gray-500 mt-0.5">{etapa.desc}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>

      {/* Cards de info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <FileText className="size-8 text-brand-500" />
              {consulta?.pdf_url && <Badge variant="brand">Disponível</Badge>}
            </div>
            <h3 className="font-semibold text-gray-900">Relatório CPF</h3>
            <p className="text-sm text-gray-500 mt-1">
              {consulta ? `Score: ${consulta.score ?? "—"}` : "Ainda não realizado"}
            </p>
            {consulta?.pdf_url && (
              <Link href="/conta/relatorio" className="inline-block mt-3 text-sm text-brand-600 hover:underline font-medium">
                Ver relatório →
              </Link>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <ShieldCheck className="size-8 text-brand-500" />
              {blindagem?.status === "ativa" && <Badge variant="success">Ativa</Badge>}
            </div>
            <h3 className="font-semibold text-gray-900">Blindagem</h3>
            <p className="text-sm text-gray-500 mt-1">
              {blindagem
                ? `${blindagem.alertas_enviados ?? 0} alertas enviados`
                : "Não contratada"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <Clock className="size-8 text-brand-500" />
            </div>
            <h3 className="font-semibold text-gray-900">Prazo estimado</h3>
            <p className="text-sm text-gray-500 mt-1">
              {currentStage >= 3 ? "Até 20 dias úteis" : "—"}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
