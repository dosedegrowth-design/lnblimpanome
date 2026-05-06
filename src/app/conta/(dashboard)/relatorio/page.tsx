import { redirect } from "next/navigation";
import { getClienteSession, getClienteDashboardData } from "@/lib/auth/cliente";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatBRL, formatDateTimeBR, maskCPF } from "@/lib/utils";
import type { ConsultaRow } from "@/lib/supabase/types";
import { FileSearch, Download } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function RelatorioPage() {
  const session = await getClienteSession();
  if (!session) redirect("/conta/login");

  const dash = await getClienteDashboardData(session.cpf);
  const data = dash.consulta as ConsultaRow | null;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl text-forest-800">Relatório de Consulta</h1>
        <p className="text-gray-500 mt-1">Resultado completo do seu CPF</p>
      </header>

      {!data ? (
        <Card>
          <CardContent className="p-16 text-center">
            <FileSearch className="size-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 font-medium mb-1">Nenhuma consulta realizada ainda</p>
            <p className="text-sm text-gray-400">Quando você fizer a consulta, o relatório aparecerá aqui.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="overflow-hidden">
            <div className={`p-6 ${data.has_debt ? "bg-gradient-to-br from-red-50 to-red-100" : "bg-gradient-to-br from-emerald-50 to-emerald-100"}`}>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Situação</p>
              {data.has_debt
                ? <p className="font-display text-3xl text-red-700">Possui pendências</p>
                : <p className="font-display text-3xl text-emerald-700">Nome limpo ✓</p>}
            </div>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-6 p-6">
              <Stat label="CPF" value={maskCPF(data.cpf)} mono />
              <Stat
                label="Score"
                valueClass={
                  (data.score ?? 0) >= 700 ? "text-emerald-600" :
                  (data.score ?? 0) >= 500 ? "text-amber-600" : "text-red-600"
                }
                value={String(data.score ?? "—")}
                big
              />
              <Stat
                label="Pendências"
                value={data.has_debt ? `${data.total_pendencias ?? 0}` : "0"}
              />
              <Stat
                label="Total débito"
                value={data.has_debt ? formatBRL(data.total_debitos) : "—"}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Documento PDF</CardTitle>
            </CardHeader>
            <CardContent>
              {data.pdf_url ? (
                <div className="space-y-3">
                  <a
                    href={data.pdf_url}
                    target="_blank"
                    rel="noopener"
                    className="inline-flex items-center gap-2 rounded-xl bg-brand-500 hover:bg-brand-600 hover:-translate-y-0.5 px-6 h-12 text-sm font-semibold text-white shadow-md shadow-brand-500/25 transition-all"
                  >
                    <Download className="size-4" />
                    Abrir PDF do relatório
                  </a>
                  <p className="text-xs text-gray-400">
                    Realizada em {formatDateTimeBR(data.data_consulta)}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-500">PDF ainda não gerado.</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function Stat({
  label, value, big, mono, valueClass,
}: { label: string; value: string; big?: boolean; mono?: boolean; valueClass?: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">{label}</p>
      <p className={`mt-1.5 ${big ? "font-display text-3xl" : "font-bold"} ${mono ? "font-mono" : ""} ${valueClass ?? "text-forest-800"}`}>
        {value}
      </p>
    </div>
  );
}
