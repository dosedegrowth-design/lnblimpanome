import { redirect } from "next/navigation";
import { getClienteSession, getClienteDashboardData } from "@/lib/auth/cliente";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck } from "lucide-react";
import { formatDateTimeBR } from "@/lib/utils";
import type { BlindagemRow } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

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
          <CardContent className="p-16 text-center">
            <ShieldCheck className="size-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 font-medium">Blindagem não contratada ainda</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-br from-forest-700 to-forest-900 p-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-brand-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <ShieldCheck className="size-10 text-brand-300 mb-3" />
                <p className="text-sm text-brand-200 uppercase tracking-wider font-semibold">Status</p>
                <p className="font-display text-3xl mt-1">
                  {data.status === "ativa" ? "Blindagem ativa" : data.status}
                </p>
              </div>
              <Badge variant={data.status === "ativa" ? "success" : "warning"}>{data.status}</Badge>
            </div>
          </div>

          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 p-8 text-sm">
            <Field label="Ativada em" value={formatDateTimeBR(data.data_ativacao)} />
            <Field label="Última verificação" value={formatDateTimeBR(data.ultima_verificacao)} />
            <Field label="Próxima verificação" value={formatDateTimeBR(data.proxima_verificacao)} />
            <Field label="Alertas enviados" value={String(data.alertas_enviados ?? 0)} />
            {data.ultimo_resultado && (
              <div className="md:col-span-2 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Último resultado</p>
                <p className="font-medium text-forest-800 mt-1">{data.ultimo_resultado}</p>
              </div>
            )}
          </CardContent>
        </Card>
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
