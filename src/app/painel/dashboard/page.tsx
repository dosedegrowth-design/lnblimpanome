import { requireAdmin } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileSearch, ShieldCheck, TrendingUp } from "lucide-react";
import { formatBRL } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function getMetrics() {
  const supa = await createClient();

  const [crm, consultas, blindagem] = await Promise.all([
    supa.from("LNB - CRM").select("id, Lead, Interessado, Qualificado, Fechado, consulta_paga", { count: "exact" }),
    supa.from("LNB_Consultas").select("id, has_debt, total_debitos, score, data_consulta", { count: "exact" }),
    supa.from("LNB_Blindagem").select("id", { count: "exact" }).eq("status", "ativa"),
  ]);

  const totalLeads = crm.count ?? 0;
  const totalConsultas = consultas.count ?? 0;
  const blindagemAtiva = blindagem.count ?? 0;

  const fechados = crm.data?.filter((r) => r.Fechado).length ?? 0;
  const pagos = crm.data?.filter((r) => r.consulta_paga).length ?? 0;
  const taxaConversao = totalLeads > 0 ? ((fechados / totalLeads) * 100).toFixed(1) : "0";

  // Receita estimada — consulta R$19,99 + limpeza R$480,01
  const receitaConsultas = pagos * 19.99;
  const receitaLimpezas = fechados * 480.01;
  const receitaTotal = receitaConsultas + receitaLimpezas;

  return {
    totalLeads,
    totalConsultas,
    blindagemAtiva,
    fechados,
    pagos,
    taxaConversao,
    receitaTotal,
    receitaConsultas,
    receitaLimpezas,
  };
}

export default async function DashboardPage() {
  await requireAdmin();
  const m = await getMetrics();

  const cards = [
    { label: "Total de Leads",      value: m.totalLeads,            icon: Users,        color: "brand" },
    { label: "Consultas pagas",     value: m.pagos,                 icon: FileSearch,   color: "green" },
    { label: "Limpezas fechadas",   value: m.fechados,              icon: TrendingUp,   color: "amber" },
    { label: "Blindagens ativas",   value: m.blindagemAtiva,        icon: ShieldCheck,  color: "violet" },
  ];

  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Visão geral do desempenho da operação LNB</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className={`size-10 rounded-lg grid place-items-center ${
                  c.color === "brand"  ? "bg-brand-50 text-brand-600" :
                  c.color === "green"  ? "bg-green-50 text-green-600" :
                  c.color === "amber"  ? "bg-amber-50 text-amber-600" :
                  "bg-violet-50 text-violet-600"
                }`}>
                  <c.icon className="size-5" />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900">{c.value}</p>
              <p className="text-sm text-gray-500 mt-1">{c.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Receita</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-gray-900">{formatBRL(m.receitaTotal)}</p>
            <p className="text-sm text-gray-500 mt-1">Total acumulado</p>
            <div className="mt-6 grid grid-cols-2 gap-4 pt-6 border-t border-gray-200">
              <div>
                <p className="text-sm text-gray-500">Consultas (R$ 19,99)</p>
                <p className="text-xl font-semibold text-gray-900 mt-1">{formatBRL(m.receitaConsultas)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Limpezas (R$ 480,01)</p>
                <p className="text-xl font-semibold text-gray-900 mt-1">{formatBRL(m.receitaLimpezas)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Taxa de conversão</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-5xl font-bold text-brand-500">{m.taxaConversao}%</p>
            <p className="text-sm text-gray-500 mt-1">Lead → Fechado</p>
            <div className="mt-6 pt-6 border-t border-gray-200 text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Pagos consulta</span>
                <span className="font-medium text-gray-900">{m.pagos}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Fecharam limpeza</span>
                <span className="font-medium text-gray-900">{m.fechados}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
