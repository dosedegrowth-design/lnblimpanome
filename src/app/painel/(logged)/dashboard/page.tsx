import { requireAdmin } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileSearch, ShieldCheck, TrendingUp, Wallet, Activity, Globe, MessageCircle } from "lucide-react";
import { formatBRL } from "@/lib/utils";

export const dynamic = "force-dynamic";

const PRECO_CONSULTA = 29.99;
const PRECO_LIMPEZA = 500.00;

async function getMetrics() {
  const supa = await createClient();

  const [crm, consultas, blindagem] = await Promise.all([
    supa.from("LNB - CRM").select("id, Lead, Interessado, Agendado, Fechado, perdido, origem"),
    supa.from("LNB_Consultas").select("id, tem_pendencia, total_dividas, consulta_paga, fechou_limpeza, origem"),
    supa.from("LNB_Blindagem").select("id, ativo, tem_pendencia_atual"),
  ]);

  const allLeads = crm.data ?? [];
  const allConsultas = consultas.data ?? [];
  const allBlindagem = blindagem.data ?? [];

  const totalLeads = allLeads.length;
  const fechados = allLeads.filter((r) => r.Fechado).length;
  const perdidos = allLeads.filter((r) => r.perdido).length;
  const consultasPagas = allConsultas.filter((c) => c.consulta_paga).length;
  const limpezasPagas = allConsultas.filter((c) => c.fechou_limpeza).length;
  const blindagemAtiva = allBlindagem.filter((b) => b.ativo).length;
  const blindagemAlerta = allBlindagem.filter((b) => b.ativo && b.tem_pendencia_atual).length;

  const taxaConversao = totalLeads > 0 ? ((fechados / totalLeads) * 100).toFixed(1) : "0";

  const receitaConsultas = consultasPagas * PRECO_CONSULTA;
  const receitaLimpezas = limpezasPagas * PRECO_LIMPEZA;
  const receitaTotal = receitaConsultas + receitaLimpezas;

  // Origem
  const origemSite = allLeads.filter((r) => r.origem === "site").length +
                     allConsultas.filter((c) => c.origem === "site").length;
  const origemWA = allLeads.filter((r) => r.origem === "whatsapp").length +
                   allConsultas.filter((c) => c.origem === "whatsapp").length;

  return {
    totalLeads, fechados, perdidos, consultasPagas, limpezasPagas,
    blindagemAtiva, blindagemAlerta,
    taxaConversao, receitaTotal, receitaConsultas, receitaLimpezas,
    origemSite, origemWA,
  };
}

export default async function DashboardPage() {
  const ctx = await requireAdmin();
  const m = await getMetrics();

  const cards = [
    { label: "Total de Leads",     value: m.totalLeads,        icon: Users,       gradient: "from-brand-400 to-brand-600" },
    { label: "Consultas pagas",    value: m.consultasPagas,    icon: FileSearch,  gradient: "from-emerald-400 to-emerald-600" },
    { label: "Limpezas fechadas",  value: m.limpezasPagas,     icon: TrendingUp,  gradient: "from-amber-400 to-amber-600" },
    { label: "Blindagens ativas",  value: m.blindagemAtiva,    icon: ShieldCheck, gradient: "from-forest-500 to-forest-700" },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="mb-8">
        <p className="text-sm text-gray-500 mb-1">Olá, {ctx.user.nome.split(" ")[0]}</p>
        <h1 className="font-display text-4xl text-forest-800">Dashboard</h1>
        <p className="text-gray-500 mt-1">Visão geral da operação LNB</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((c) => (
          <Card key={c.label} className="hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
            <CardContent className="p-6">
              <div className={`size-12 rounded-xl bg-gradient-to-br ${c.gradient} grid place-items-center mb-4 shadow-md`}>
                <c.icon className="size-5 text-white" />
              </div>
              <p className="font-display text-4xl text-forest-800">{c.value}</p>
              <p className="text-sm text-gray-500 mt-1">{c.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        <Card className="lg:col-span-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-72 h-72 bg-brand-100/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <CardHeader className="relative">
            <div className="flex items-center gap-2">
              <Wallet className="size-5 text-brand-600" />
              <CardTitle>Receita</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <p className="font-display text-5xl text-forest-800">{formatBRL(m.receitaTotal)}</p>
            <p className="text-sm text-gray-500 mt-1">Total acumulado</p>
            <div className="mt-6 grid grid-cols-2 gap-4 pt-6 border-t border-gray-100">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Consultas (R$ 29,99)</p>
                <p className="font-display text-2xl text-forest-700 mt-1">{formatBRL(m.receitaConsultas)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Limpezas (R$ 500,00)</p>
                <p className="font-display text-2xl text-forest-700 mt-1">{formatBRL(m.receitaLimpezas)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-gradient-to-br from-forest-700 to-forest-900 text-white border-0">
          <div className="absolute top-0 right-0 w-48 h-48 bg-brand-500/20 rounded-full blur-2xl" />
          <CardHeader className="relative">
            <div className="flex items-center gap-2">
              <Activity className="size-5 text-brand-400" />
              <CardTitle className="text-white">Conversão</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <p className="font-display text-6xl text-brand-300">{m.taxaConversao}%</p>
            <p className="text-sm text-sand-200/70 mt-1">Lead → Fechado</p>
            <div className="mt-6 pt-6 border-t border-forest-600/40 text-sm space-y-3">
              <div className="flex justify-between">
                <span className="text-sand-200/60">Pagos consulta</span>
                <span className="font-bold text-white">{m.consultasPagas}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sand-200/60">Fecharam limpeza</span>
                <span className="font-bold text-white">{m.limpezasPagas}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sand-200/60">Perdidos</span>
                <span className="font-bold text-white">{m.perdidos}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Origem dos leads */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="size-5 text-brand-600" />
              <p className="text-sm font-semibold text-forest-800">Site (self-service)</p>
            </div>
            <p className="font-display text-3xl text-forest-800">{m.origemSite}</p>
            <p className="text-sm text-gray-500 mt-1">leads + consultas vindos do site</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <MessageCircle className="size-5 text-emerald-600" />
              <p className="text-sm font-semibold text-forest-800">WhatsApp (agente)</p>
            </div>
            <p className="font-display text-3xl text-forest-800">{m.origemWA}</p>
            <p className="text-sm text-gray-500 mt-1">leads + consultas vindos pelo WhatsApp</p>
          </CardContent>
        </Card>
      </div>

      {m.blindagemAlerta > 0 && (
        <Card className="mt-4 bg-amber-50 border-amber-200">
          <CardContent className="p-5 flex items-center gap-3">
            <ShieldCheck className="size-5 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800">
              <strong>{m.blindagemAlerta}</strong> blindagem(ns) com pendência detectada — verifique a página Blindagem.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
