import { requireAdmin, canViewFinancial } from "@/lib/auth/admin";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBRL, formatDateBR } from "@/lib/utils";
import { TrendingUp, TrendingDown, Wallet, Activity } from "lucide-react";

export const dynamic = "force-dynamic";

const PRECO_CONSULTA  = 19.99;
const PRECO_LIMPEZA   = 480.01;
const CUSTO_API_FULL  = 2.49;

export default async function FinanceiroPage() {
  const ctx = await requireAdmin();
  if (!canViewFinancial(ctx.user.role)) redirect("/painel/dashboard?denied=1");

  const supa = await createClient();
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
    <div className="p-8 max-w-7xl mx-auto">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-4xl text-forest-800">Financeiro</h1>
          <p className="text-gray-500 mt-1">Receita, custos e margem operacional</p>
        </div>
        <div className="size-12 rounded-xl bg-brand-50 grid place-items-center">
          <Wallet className="size-5 text-brand-600" />
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card className="hover:shadow-md transition">
          <CardContent className="p-6">
            <div className="size-12 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 grid place-items-center mb-4 shadow-md">
              <TrendingUp className="size-5 text-white" />
            </div>
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Receita total</p>
            <p className="font-display text-3xl text-forest-800 mt-1">{formatBRL(receitaTotal)}</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition">
          <CardContent className="p-6">
            <div className="size-12 rounded-xl bg-gradient-to-br from-red-400 to-red-600 grid place-items-center mb-4 shadow-md">
              <TrendingDown className="size-5 text-white" />
            </div>
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Custos API Full</p>
            <p className="font-display text-3xl text-forest-800 mt-1">{formatBRL(custoAPI)}</p>
            <p className="text-xs text-gray-400 mt-1">{totalConsultasAPI} consultas × R$ 2,49</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition relative overflow-hidden bg-gradient-to-br from-brand-500 to-brand-700 text-white border-0">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <CardContent className="p-6 relative">
            <div className="size-12 rounded-xl bg-white/20 backdrop-blur grid place-items-center mb-4">
              <Activity className="size-5 text-white" />
            </div>
            <p className="text-xs text-brand-100 uppercase tracking-wider font-semibold">Lucro operacional</p>
            <p className="font-display text-3xl text-white mt-1">{formatBRL(lucroOperacional)}</p>
            <p className="text-xs text-brand-100 mt-1">Margem {margem}%</p>
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
                <thead className="text-gray-500 text-xs uppercase tracking-wider">
                  <tr className="text-left">
                    <th className="py-3 font-semibold">Data</th>
                    <th className="py-3 font-semibold">Consultas</th>
                    <th className="py-3 font-semibold">Custo</th>
                    <th className="py-3 font-semibold">Saldo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {apiCtl.data.map((r) => (
                    <tr key={r.id}>
                      <td className="py-3 text-gray-700">{formatDateBR(r.data)}</td>
                      <td className="py-3 text-gray-700">{r.consultas_realizadas}</td>
                      <td className="py-3 text-gray-700">{formatBRL(r.custo_total)}</td>
                      <td className="py-3 text-forest-800 font-bold">{formatBRL(r.saldo_atual)}</td>
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
