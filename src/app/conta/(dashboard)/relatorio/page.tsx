import { redirect } from "next/navigation";
import { getClienteSession, getClienteDashboardData } from "@/lib/auth/cliente";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatBRL, formatDateTimeBR, maskCPF } from "@/lib/utils";
import type { ConsultaRow } from "@/lib/supabase/types";
import { FileSearch } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function RelatorioPage() {
  const session = await getClienteSession();
  if (!session) redirect("/conta/login");

  const dash = await getClienteDashboardData(session.cpf);
  const data = dash.consulta as ConsultaRow | null;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">Relatório de Consulta</h1>
      </header>

      {!data ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileSearch className="size-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">Nenhuma consulta realizada ainda.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Resumo</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-500 uppercase">CPF</p>
                <p className="font-mono text-sm font-medium text-gray-900 mt-1">{maskCPF(data.cpf)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Score</p>
                <p className={`text-2xl font-bold mt-1 ${
                  (data.score ?? 0) >= 700 ? "text-green-600" :
                  (data.score ?? 0) >= 500 ? "text-amber-600" : "text-red-600"
                }`}>{data.score ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Situação</p>
                <div className="mt-1">
                  {data.has_debt
                    ? <Badge variant="danger">Com pendências</Badge>
                    : <Badge variant="success">Nome limpo</Badge>}
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Total débito</p>
                <p className="font-semibold text-gray-900 mt-1">
                  {data.has_debt ? formatBRL(data.total_debitos) : "—"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Documento PDF</CardTitle>
            </CardHeader>
            <CardContent>
              {data.pdf_url ? (
                <a
                  href={data.pdf_url}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex items-center gap-2 rounded-md bg-brand-500 hover:bg-brand-600 px-5 h-11 text-sm font-medium text-white shadow-sm transition"
                >
                  Abrir PDF do relatório
                </a>
              ) : (
                <p className="text-sm text-gray-500">PDF ainda não gerado.</p>
              )}
              <p className="text-xs text-gray-400 mt-3">
                Realizada em {formatDateTimeBR(data.data_consulta)}
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
