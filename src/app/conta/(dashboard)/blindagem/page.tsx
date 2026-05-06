import { redirect } from "next/navigation";
import { getClienteSession } from "@/lib/auth/cliente";
import { createServiceClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck } from "lucide-react";
import { formatDateTimeBR } from "@/lib/utils";
import type { BlindagemRow } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function ClienteBlindagemPage() {
  const session = await getClienteSession();
  if (!session) redirect("/conta/login");

  const supa = createServiceClient();
  const { data } = await supa
    .from("LNB_Blindagem")
    .select("*")
    .eq("cpf", session.cpf)
    .maybeSingle<BlindagemRow>();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">Blindagem de CPF</h1>
        <p className="text-gray-500 mt-1">Monitoramento contínuo do seu nome</p>
      </header>

      {!data ? (
        <Card>
          <CardContent className="p-12 text-center">
            <ShieldCheck className="size-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">Blindagem não contratada ainda.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Status</CardTitle>
              <Badge variant={data.status === "ativa" ? "success" : "warning"}>
                {data.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-500 uppercase">Ativada em</p>
              <p className="font-medium text-gray-900 mt-1">{formatDateTimeBR(data.data_ativacao)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Última verificação</p>
              <p className="font-medium text-gray-900 mt-1">{formatDateTimeBR(data.ultima_verificacao)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Próxima verificação</p>
              <p className="font-medium text-gray-900 mt-1">{formatDateTimeBR(data.proxima_verificacao)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Alertas enviados</p>
              <p className="font-medium text-gray-900 mt-1">{data.alertas_enviados ?? 0}</p>
            </div>
            {data.ultimo_resultado && (
              <div className="md:col-span-2 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 uppercase">Último resultado</p>
                <p className="font-medium text-gray-900 mt-1">{data.ultimo_resultado}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
