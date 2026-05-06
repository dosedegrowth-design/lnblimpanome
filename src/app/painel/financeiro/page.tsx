import { requireAdmin, canViewFinancial } from "@/lib/auth/admin";
import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBRL, formatDateBR } from "@/lib/utils";
import { TrendingUp, TrendingDown, Wallet } from "lucide-react";

export const dynamic = "force-dynamic";

const PRECO_CONSULTA  = 19.99;
const PRECO_LIMPEZA   = 480.01;
const CUSTO_API_FULL  = 2.49;

export default async function FinanceiroPage() {
  const ctx = await requireAdmin();
  if (!canViewFinancial(ctx.user.role)) redirect("/painel/dashboard?denied=1");

  const supa = createServiceClient();
  const [crm, consultas, apiCtl] = await Promise.all([
    supa.from("LNB - CRM").select("Fechado, consulta_paga"),
    supa.from("LNB_Consultas").select("id", { count: "exact" }),
    supa.from("LNB_API_Control").select("*").order("data", { ascending: false }).limit(30),
  ]);

  const pagos = crm.data?.filter((r) => r.consulta_paga).length ?? 0;
  const fechados = crm.data?.filter((r) => r.Fechado).length ?? 0;
  const totalConsultasAPI = consultas.count ?? 0;

  const receitaConsultas = pagos * PRECO_CONSULTA;
  const receitaLimpezas  = fechados * PRECO_LIMPEZA;
  const receitaTotal     = receitaConsultas + receitaLimpezas;

  const custoAPI = totalConsultasAPI * CUSTO_API_FULL;
  const lucroOperacional = receitaTotal - custoAPI;
  const margem = receitaTotal > 0 ? ((lucroOperacional / receitaTotal) * 100).toFixed(1) : "0";

  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Financeiro</h1>
        <p className="text-gray-500 mt-1">Receita, custos e margem operacional</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="size-10 rounded-lg bg-green-50 grid place-items-center mb-3">
              <TrendingUp className="size-5 text-green-600" />
            </div>
            <p className="text-sm text-gray-500">Receita total</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{formatBRL(receitaTotal)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="size-10 rounded-lg bg-red-50 grid place-items-center mb-3">
              <TrendingDown className="size-5 text-red-600" />
            </div>
            <p className="text-sm text-gray-500">Custos API Full</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{formatBRL(custoAPI)}</p>
            <p className="text-xs text-gray-400 mt-1">{totalConsultasAPI} consultas × R$ 2,49</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="size-10 rounded-lg bg-brand-50 grid place-items-center mb-3">
              <Wallet className="size-5 text-brand-600" />
            </div>
            <p className="text-sm text-gray-500">Lucro operacional</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{formatBRL(lucroOperacional)}</p>
            <p className="text-xs text-brand-600 mt-1">Margem {margem}%</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico API (últimos 30 dias)</CardTitle>
        </CardHeader>
        <CardContent>
          {!apiCtl.data || apiCtl.data.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">
              Nenhum registro ainda. Tabela LNB_API_Control vazia.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-gray-500 text-xs uppercase">
                  <tr className="text-left">
                    <th className="py-2 font-medium">Data</th>
                    <th className="py-2 font-medium">Consultas</th>
                    <th className="py-2 font-medium">Custo</th>
                    <th className="py-2 font-medium">Saldo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {apiCtl.data.map((r) => (
                    <tr key={r.id}>
                      <td className="py-2 text-gray-700">{formatDateBR(r.data)}</td>
                      <td className="py-2 text-gray-700">{r.consultas_realizadas}</td>
                      <td className="py-2 text-gray-700">{formatBRL(r.custo_total)}</td>
                      <td className="py-2 text-gray-900 font-medium">{formatBRL(r.saldo_atual)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
