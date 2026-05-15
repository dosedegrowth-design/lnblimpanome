import { requireAdmin, canViewFinancial } from "@/lib/auth/admin";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBRL } from "@/lib/utils";
import { TrendingUp, TrendingDown, Wallet, Activity, ServerIcon } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import type { APIControlRow } from "@/lib/supabase/types";
import { getProdutos } from "@/lib/produtos";

export const dynamic = "force-dynamic";

export default async function FinanceiroPage() {
  const ctx = await requireAdmin();
  if (!canViewFinancial(ctx.user.role)) redirect("/painel/dashboard?denied=1");

  const produtos = await getProdutos();
  const PRECO_CONSULTA = produtos.consulta_cpf?.valor ?? 29.99;
  const PRECO_LIMPEZA  = produtos.limpeza_cpf?.valor ?? 500.00;
  const CUSTO_PROVEDOR = produtos.consulta_cpf?.custo_api ?? 2.49;

  const supa = await createClient();
  const [crm, consultas, apiCtl] = await Promise.all([
    supa.from("LNB - CRM").select("Fechado"),
    supa.from("LNB_Consultas").select("id, consulta_paga, fechou_limpeza, created_at"),
    supa.from("LNB_API_Control").select("*").order("mes_ano", { ascending: false }).limit(12),
  ]);

  const allConsultas = consultas.data ?? [];
  const pagas = allConsultas.filter((c) => c.consulta_paga).length;
  const fechadas = allConsultas.filter((c) => c.fechou_limpeza).length;
  const totalConsultasAPI = allConsultas.length;

  const receitaConsultas = pagas * PRECO_CONSULTA;
  const receitaLimpezas  = fechadas * PRECO_LIMPEZA;
  const receitaTotal     = receitaConsultas + receitaLimpezas;
  const custoAPI         = totalConsultasAPI * CUSTO_PROVEDOR;
  const lucroOperacional = receitaTotal - custoAPI;
  const margem = receitaTotal > 0 ? ((lucroOperacional / receitaTotal) * 100).toFixed(1) : "0";

  const apiData = (apiCtl.data ?? []) as APIControlRow[];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <PageHeader title="Financeiro" subtitle="Receita, custos e margem operacional" icon={Wallet} />

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
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Custos do Provedor de Consulta</p>
            <p className="font-display text-3xl text-forest-800 mt-1">{formatBRL(custoAPI)}</p>
            <p className="text-xs text-gray-400 mt-1">{totalConsultasAPI} consultas × {formatBRL(CUSTO_PROVEDOR)}</p>
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
          <CardTitle className="flex items-center gap-2">
            <ServerIcon className="size-4 text-brand-600" />
            Saldo de provedores de consulta
          </CardTitle>
        </CardHeader>
        <CardContent>
          {apiData.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">
              Nenhum registro em LNB_API_Control ainda.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-gray-500 text-xs uppercase tracking-wider">
                  <tr className="text-left">
                    <th className="py-3 font-semibold">Mês/Ano</th>
                    <th className="py-3 font-semibold">BigDataCorp (uso/limite)</th>
                    <th className="py-3 font-semibold">SOAWebservices</th>
                    <th className="py-3 font-semibold">Provider ativo</th>
                    <th className="py-3 font-semibold">Atualizado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {apiData.map((r) => (
                    <tr key={r.id}>
                      <td className="py-3 text-gray-700 font-semibold">{r.mes_ano}</td>
                      <td className="py-3 text-gray-700">
                        {r.bigdatacorp_count} / {r.bigdatacorp_limit}
                      </td>
                      <td className="py-3 text-gray-700">{r.soawebservices_count}</td>
                      <td className="py-3 text-gray-700">
                        <span className="inline-flex items-center rounded-full bg-brand-50 text-brand-700 px-2.5 py-0.5 text-xs font-semibold">
                          {r.provider_ativo ?? "—"}
                        </span>
                      </td>
                      <td className="py-3 text-gray-500 text-xs">{r.updated_at?.slice(0, 10)}</td>
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
