import { redirect } from "next/navigation";
import { getClienteSession, getClienteDashboardData } from "@/lib/auth/cliente";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, MessageCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import { formatBRL, formatDateTimeBR } from "@/lib/utils";
import type { BlindagemRow } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const WHATSAPP =
  "https://wa.me/5511997440101?text=" +
  encodeURIComponent("Olá! Quero contratar a Blindagem de CPF.");

export default async function ClienteBlindagemPage() {
  const session = await getClienteSession();
  if (!session) redirect("/conta/login");

  const dash = await getClienteDashboardData(session.cpf);
  const data = dash.blindagem as BlindagemRow | null;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl text-forest-800">Blindagem de CPF</h1>
        <p className="text-gray-500 mt-1">Monitoramento contínuo do seu nome</p>
      </header>

      {!data ? (
        <Card>
          <CardContent className="p-12 text-center">
            <ShieldCheck className="size-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 font-medium mb-1">Blindagem não contratada ainda</p>
            <p className="text-sm text-gray-400 mb-6 max-w-md mx-auto">
              A blindagem monitora seu CPF a cada 7 dias e te avisa no WhatsApp se aparecer
              qualquer nova pendência.
            </p>
            <a
              href={WHATSAPP}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-500 hover:bg-brand-600 px-6 h-11 text-sm font-semibold text-white shadow-md shadow-brand-500/25 transition"
            >
              <MessageCircle className="size-4" />
              Quero contratar blindagem
            </a>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-br from-forest-700 to-forest-900 p-8 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-brand-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <div className="relative flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <ShieldCheck className="size-10 text-brand-300 mb-3" />
                  <p className="text-sm text-brand-200 uppercase tracking-wider font-semibold">Status</p>
                  <p className="font-display text-3xl mt-1">
                    {data.ativo ? "Blindagem ativa" : "Pausada"}
                  </p>
                  {data.plano && (
                    <p className="text-sm text-sand-100/70 mt-1">
                      Plano: <strong>{data.plano}</strong> {data.valor ? `· ${formatBRL(data.valor)}` : ""}
                    </p>
                  )}
                </div>
                <Badge variant={data.ativo ? "success" : "warning"}>
                  {data.ativo ? "Ativa" : "Pausada"}
                </Badge>
              </div>
            </div>

            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 p-8 text-sm">
              <Field label="Última verificação" value={formatDateTimeBR(data.ultima_verificacao)} />
              <Field label="Próxima verificação" value={formatDateTimeBR(data.proxima_verificacao)} />
              <Field
                label="Situação atual"
                value={
                  data.tem_pendencia_atual === null
                    ? "Aguardando primeira verificação"
                    : data.tem_pendencia_atual
                    ? "Pendência detectada"
                    : "Tudo OK"
                }
              />
              <Field label="Cadastrado em" value={formatDateTimeBR(data.created_at)} />
            </CardContent>
          </Card>

          {data.tem_pendencia_atual && (
            <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
              <CardContent className="p-6 flex items-start gap-4 flex-wrap">
                <div className="size-12 rounded-xl bg-red-500 grid place-items-center shrink-0">
                  <AlertTriangle className="size-5 text-white" />
                </div>
                <div className="flex-1 min-w-[240px]">
                  <p className="font-bold text-red-800">Pendência detectada na última verificação</p>
                  <p className="text-sm text-gray-700 mt-1">
                    Identificamos uma nova pendência no seu CPF. Fale com nossa equipe pra entender e resolver.
                  </p>
                </div>
                <a
                  href={WHATSAPP}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex items-center gap-2 rounded-xl bg-red-500 hover:bg-red-600 text-white px-6 h-12 font-semibold shadow-md transition"
                >
                  <MessageCircle className="size-4" />
                  Falar agora
                </a>
              </CardContent>
            </Card>
          )}

          {data.ativo && data.tem_pendencia_atual === false && (
            <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
              <CardContent className="p-6 flex items-start gap-4">
                <div className="size-12 rounded-xl bg-emerald-500 grid place-items-center shrink-0">
                  <CheckCircle2 className="size-5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-emerald-800">Seu CPF está protegido e sem pendências</p>
                  <p className="text-sm text-gray-700 mt-1">
                    Verificamos seu nome a cada 7 dias automaticamente.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-6 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="font-bold text-forest-800">Quer pausar ou cancelar?</p>
                <p className="text-sm text-gray-500 mt-0.5">Sem multa. Pode reativar quando quiser.</p>
              </div>
              <a
                href={WHATSAPP}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 hover:border-forest-500 hover:bg-gray-50 px-5 h-10 text-sm font-semibold text-forest-800 transition"
              >
                Falar com consultor
              </a>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">{label}</p>
      <p className="font-bold text-forest-800 mt-1">{value}</p>
    </div>
  );
}
