import { requireAdmin, canViewFinancial } from "@/lib/auth/admin";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { formatBRL } from "@/lib/utils";
import { TrendingUp, TrendingDown, Wallet, MoreHorizontal, Server } from "lucide-react";
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
  const [consultas, apiCtl, finalizacoes] = await Promise.all([
    supa.from("LNB_Consultas").select("id, consulta_paga, fechou_limpeza, created_at"),
    supa.from("LNB_API_Control").select("*").order("mes_ano", { ascending: false }).limit(12),
    supa.from("lnb_audit_log").select("id").eq("action", "finalizar_limpeza"),
  ]);

  const allConsultas = consultas.data ?? [];
  const pagas = allConsultas.filter((c) => c.consulta_paga).length;
  const fechadas = allConsultas.filter((c) => c.fechou_limpeza).length;
  const totalConsultasAPI = allConsultas.length;
  const totalFinalizacoes = (finalizacoes.data ?? []).length;

  const receitaConsultas = pagas * PRECO_CONSULTA;
  const receitaLimpezas  = fechadas * PRECO_LIMPEZA;
  const receitaTotal     = receitaConsultas + receitaLimpezas;

  // Custo total = chamadas API de Consultas + chamadas API de Finalizacoes (nova consulta)
  const custoConsultas    = totalConsultasAPI * CUSTO_PROVEDOR;
  const custoFinalizacoes = totalFinalizacoes * CUSTO_PROVEDOR;
  const custoAPI          = custoConsultas + custoFinalizacoes;
  const lucroOperacional  = receitaTotal - custoAPI;
  const margem = receitaTotal > 0 ? ((lucroOperacional / receitaTotal) * 100).toFixed(1) : "0";

  const apiData = (apiCtl.data ?? []) as APIControlRow[];

  return (
    <div className="p-6 sm:p-8 max-w-[1400px] mx-auto">
      <PageHeader title="Financeiro" subtitle="Receita, custos e margem operacional" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="Receita total"
          value={formatBRL(receitaTotal)}
          subValue={`${pagas + fechadas} venda(s)`}
          trend="up"
        />
        <KpiCard
          label="Custo dos provedores"
          value={formatBRL(custoAPI)}
          subValue={`${totalConsultasAPI + totalFinalizacoes} × ${formatBRL(CUSTO_PROVEDOR)}`}
          trend="down"
        />
        <KpiCard
          label="Lucro operacional"
          value={formatBRL(lucroOperacional)}
          subValue={`Margem ${margem}%`}
          trend="up"
        />
        <KpiCard
          label="Ticket médio"
          value={pagas + fechadas > 0 ? formatBRL(receitaTotal / (pagas + fechadas)) : formatBRL(0)}
          subValue="Por venda fechada"
          trend="neutral"
        />
      </div>

      {/* Breakdown por produto */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-base font-semibold text-gray-900">Receita por produto</h2>
            </div>
            <ul className="space-y-3">
              <ProdutoRow
                label="Consultas pagas"
                qtd={pagas}
                preco={PRECO_CONSULTA}
                total={receitaConsultas}
                cor="bg-cyan-500"
              />
              <ProdutoRow
                label="Limpezas fechadas"
                qtd={fechadas}
                preco={PRECO_LIMPEZA}
                total={receitaLimpezas}
                cor="bg-emerald-500"
              />
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-base font-semibold text-gray-900">Composição do lucro</h2>
            </div>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center justify-between">
                <span className="text-gray-700">Receita bruta</span>
                <span className="font-semibold text-gray-900 tabular-nums">{formatBRL(receitaTotal)}</span>
              </li>
              <li className="flex items-center justify-between border-t border-gray-100 pt-3">
                <span className="text-gray-700">(-) Custo consultas iniciais</span>
                <span className="font-semibold text-red-600 tabular-nums">-{formatBRL(custoConsultas)}</span>
              </li>
              {custoFinalizacoes > 0 && (
                <li className="flex items-center justify-between">
                  <span className="text-gray-700 pl-3">↳ {totalFinalizacoes} verificação(ões) de limpeza</span>
                  <span className="font-semibold text-red-600 tabular-nums">-{formatBRL(custoFinalizacoes)}</span>
                </li>
              )}
              <li className="flex items-center justify-between border-t border-gray-100 pt-3">
                <span className="text-gray-900 font-semibold">Lucro operacional</span>
                <span className="font-display text-lg text-emerald-600 tabular-nums">{formatBRL(lucroOperacional)}</span>
              </li>
              <li className="flex items-center justify-between text-xs text-gray-400">
                <span>Margem</span>
                <span className="tabular-nums">{margem}%</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Saldo provedores */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Server className="size-4 text-gray-400" />
              <h2 className="font-display text-base font-semibold text-gray-900">Saldo de provedores de consulta</h2>
            </div>
          </div>
          {apiData.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">Nenhum registro em LNB_API_Control ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-gray-400 text-xs">
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-3 font-normal">Mês/Ano</th>
                    <th className="text-left py-3 px-3 font-normal">Uso / Limite</th>
                    <th className="text-left py-3 px-3 font-normal">Backup</th>
                    <th className="text-left py-3 px-3 font-normal">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {apiData.map((row, i) => (
                    <tr key={i} className="border-b border-gray-50 last:border-0">
                      <td className="py-3 px-3 text-gray-900 font-medium">{row.mes_ano ?? "—"}</td>
                      <td className="py-3 px-3 text-gray-700 tabular-nums">
                        {row.bigdatacorp_count ?? "?"} / {row.bigdatacorp_limit ?? "?"}
                      </td>
                      <td className="py-3 px-3 text-gray-700 tabular-nums">
                        {row.soawebservices_count ?? "—"}
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-medium">
                          <span className="size-1.5 rounded-full bg-emerald-500" />
                          Ativo
                        </span>
                      </td>
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

function KpiCard({
  label, value, subValue, trend,
}: {
  label: string;
  value: string;
  subValue?: string;
  trend?: "up" | "down" | "neutral";
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <p className="text-xs text-gray-500 font-medium">{label}</p>
          <button className="size-6 grid place-items-center rounded text-gray-300 hover:text-gray-700 hover:bg-gray-100">
            <MoreHorizontal className="size-3.5" />
          </button>
        </div>
        <p className="font-display text-2xl text-gray-900 tracking-tight tabular-nums">{value}</p>
        {subValue && (
          <div className="flex items-center gap-1.5 mt-2">
            {trend === "up" && <TrendingUp className="size-3 text-emerald-600" />}
            {trend === "down" && <TrendingDown className="size-3 text-red-600" />}
            <span className="text-[11px] text-gray-500">{subValue}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ProdutoRow({
  label, qtd, preco, total, cor,
}: {
  label: string; qtd: number; preco: number; total: number; cor: string;
}) {
  return (
    <li>
      <div className="flex items-center justify-between mb-1.5 text-sm">
        <span className="flex items-center gap-2 text-gray-700">
          <span className={`size-1.5 rounded-full ${cor}`} />
          {label}
        </span>
        <span className="font-semibold text-gray-900 tabular-nums">{formatBRL(total)}</span>
      </div>
      <p className="text-[11px] text-gray-400 ml-3.5">{qtd} × {formatBRL(preco)}</p>
    </li>
  );
}

// import unused-safe
void Wallet;
