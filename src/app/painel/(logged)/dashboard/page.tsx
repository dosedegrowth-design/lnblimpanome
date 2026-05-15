import { requireAdmin } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import {
  Users, FileSearch, ShieldCheck, TrendingUp, Wallet, Activity,
  Globe, MessageCircle, ArrowUpRight, ArrowDownRight, Clock, Sparkles,
} from "lucide-react";
import { formatBRL } from "@/lib/utils";
import { getProdutos } from "@/lib/produtos";
import { getEtapas } from "@/lib/kanban";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function getMetrics() {
  const supa = await createClient();
  const [produtos, etapas] = await Promise.all([getProdutos(), getEtapas()]);
  const PRECO_CONSULTA = produtos.consulta_cpf?.valor ?? 29.99;
  const PRECO_LIMPEZA = produtos.limpeza_cpf?.valor ?? 500.0;

  const [crm, consultas, blindagem, processos] = await Promise.all([
    supa.from("LNB - CRM").select("id, Lead, Interessado, Agendado, Fechado, perdido, origem"),
    supa.from("LNB_Consultas").select("id, tem_pendencia, total_dividas, consulta_paga, fechou_limpeza, origem"),
    supa.from("LNB_Blindagem").select("id, ativo, tem_pendencia_atual"),
    supa.rpc("admin_processos_list", { p_tipo: null, p_etapa: null, p_responsavel_id: null }),
  ]);

  const allLeads = crm.data ?? [];
  const allConsultas = consultas.data ?? [];
  const allBlindagem = blindagem.data ?? [];
  const allProcessos = (processos.data ?? []) as Array<{
    id: string; nome: string; cpf: string; etapa: string;
    dias_na_etapa?: number; tag_servico?: string | null;
  }>;

  const totalLeads = allLeads.length;
  const fechados = allLeads.filter((r) => r.Fechado).length;
  const perdidos = allLeads.filter((r) => r.perdido).length;
  const consultasPagas = allConsultas.filter((c) => c.consulta_paga).length;
  const limpezasPagas = allConsultas.filter((c) => c.fechou_limpeza).length;
  const blindagemAtiva = allBlindagem.filter((b) => b.ativo).length;
  const blindagemAlerta = allBlindagem.filter((b) => b.ativo && b.tem_pendencia_atual).length;

  const taxaConversao = consultasPagas > 0 ? ((limpezasPagas / consultasPagas) * 100).toFixed(1) : "0";
  const receitaConsultas = consultasPagas * PRECO_CONSULTA;
  const receitaLimpezas = limpezasPagas * PRECO_LIMPEZA;
  const receitaTotal = receitaConsultas + receitaLimpezas;

  const origemSite = allLeads.filter((r) => r.origem === "site").length;
  const origemWA = allLeads.filter((r) => r.origem === "whatsapp").length;

  // Funil de etapas (apenas pre-pagamento)
  const funilEtapas = etapas
    .filter((e) => e.codigo !== "perdido" && (e.codigo === "lead" || e.codigo === "interessado" || e.codigo === "qualificado" || e.codigo === "consulta_paga" || e.codigo === "limpeza_paga"))
    .map((e) => ({
      ...e,
      qtd: allProcessos.filter((p) => p.etapa === e.codigo).length,
    }));
  const maxFunil = Math.max(1, ...funilEtapas.map((e) => e.qtd));

  // Em tratativa (operacional)
  const emTratativa = allProcessos.filter((p) => p.etapa === "em_tratativa").length;
  const aguardandoOrgaos = allProcessos.filter((p) => p.etapa === "aguardando_orgaos").length;
  const nomeLimpoCount = allProcessos.filter((p) => p.etapa === "nome_limpo").length;

  // Aguardando ha muito tempo
  const aguardandoMuito = allProcessos.filter(
    (p) => p.etapa === "aguardando_orgaos" && (p.dias_na_etapa ?? 0) >= 5
  );

  return {
    totalLeads, fechados, perdidos, consultasPagas, limpezasPagas,
    blindagemAtiva, blindagemAlerta,
    taxaConversao, receitaTotal, receitaConsultas, receitaLimpezas,
    origemSite, origemWA,
    PRECO_CONSULTA, PRECO_LIMPEZA,
    funilEtapas, maxFunil,
    emTratativa, aguardandoOrgaos, nomeLimpoCount,
    aguardandoMuito,
    totalProcessos: allProcessos.length,
  };
}

const FUNIL_CORES: Record<string, string> = {
  lead: "from-gray-300 to-gray-400",
  interessado: "from-amber-300 to-amber-500",
  qualificado: "from-violet-400 to-violet-600",
  consulta_paga: "from-brand-400 to-brand-600",
  limpeza_paga: "from-emerald-400 to-emerald-600",
};

export default async function DashboardPage() {
  const ctx = await requireAdmin();
  const m = await getMetrics();
  const modoTeste = process.env.LNB_MODO_TESTE === "true";

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <header className="mb-6 flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="text-sm text-gray-500">Olá, {ctx.user.nome.split(" ")[0]} 👋</p>
          <h1 className="font-display text-3xl text-forest-800 mt-0.5">Painel de controle</h1>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">{new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}</p>
          {modoTeste && (
            <span className="inline-block mt-1 text-[10px] uppercase tracking-wider font-bold text-red-700 bg-red-100 border border-red-200 px-2 py-0.5 rounded-full">
              ⚠️ Modo teste ativo
            </span>
          )}
        </div>
      </header>

      {/* KPI Cards principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="Receita total"
          value={formatBRL(m.receitaTotal)}
          icon={Wallet}
          gradient="from-emerald-400 to-emerald-600"
          trend={{ direction: "up", value: `${m.consultasPagas + m.limpezasPagas} venda(s)` }}
        />
        <KpiCard
          label="Taxa conversão"
          value={`${m.taxaConversao}%`}
          icon={TrendingUp}
          gradient="from-brand-400 to-brand-600"
          trend={{ direction: "up", value: `${m.limpezasPagas} de ${m.consultasPagas} consultas` }}
        />
        <KpiCard
          label="Processos ativos"
          value={String(m.totalProcessos)}
          icon={Activity}
          gradient="from-violet-400 to-violet-600"
          trend={{ direction: "neutral", value: `${m.emTratativa} em tratativa` }}
        />
        <KpiCard
          label="Blindagens"
          value={String(m.blindagemAtiva)}
          icon={ShieldCheck}
          gradient="from-amber-400 to-amber-600"
          trend={
            m.blindagemAlerta > 0
              ? { direction: "down", value: `${m.blindagemAlerta} alerta(s)` }
              : { direction: "up", value: "Todas ativas" }
          }
        />
      </div>

      {/* Funil + Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Funil de vendas */}
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-display text-lg text-forest-800">Funil de vendas</h2>
                <p className="text-xs text-gray-500">Processos por etapa (pré-pagamento)</p>
              </div>
              <Link
                href="/painel/processos"
                className="text-xs text-brand-600 hover:text-brand-800 font-semibold inline-flex items-center gap-1"
              >
                Ver Kanban
                <ArrowUpRight className="size-3.5" />
              </Link>
            </div>
            <div className="space-y-3">
              {m.funilEtapas.map((e) => {
                const pct = Math.max(4, (e.qtd / m.maxFunil) * 100);
                const grad = FUNIL_CORES[e.codigo] || "from-gray-300 to-gray-400";
                return (
                  <div key={e.codigo}>
                    <div className="flex items-center justify-between mb-1.5 text-sm">
                      <span className="text-forest-700 font-medium flex items-center gap-1.5">
                        <span>{e.emoji}</span>
                        {e.nome}
                      </span>
                      <span className="font-bold text-forest-800">{e.qtd}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${grad} rounded-full transition-all`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Operação atual (donut + breakdown) */}
        <Card className="relative overflow-hidden">
          <CardContent className="p-6">
            <h2 className="font-display text-lg text-forest-800 mb-1">Operação</h2>
            <p className="text-xs text-gray-500 mb-5">Status pós-pagamento</p>

            <div className="space-y-3">
              <StatRow label="Em tratativa" value={m.emTratativa} cor="amber" emoji="⚡" />
              <StatRow label="Aguardando órgãos" value={m.aguardandoOrgaos} cor="violet" emoji="⏳" />
              <StatRow label="Nome limpo" value={m.nomeLimpoCount} cor="emerald" emoji="✨" />
            </div>

            <Link
              href="/painel/limpeza"
              className="mt-5 w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-forest-800 hover:bg-forest-900 text-white text-xs font-semibold px-3 py-2 transition"
            >
              <Sparkles className="size-3.5" />
              Abrir Limpeza
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Receita detalhada + Origem */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2 relative overflow-hidden bg-gradient-to-br from-forest-700 to-forest-900 text-white border-0">
          <div className="absolute top-0 right-0 w-72 h-72 bg-brand-500/10 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3" />
          <CardContent className="p-6 relative">
            <div className="flex items-center gap-2 mb-3">
              <Wallet className="size-5 text-brand-300" />
              <p className="text-sm font-semibold text-white">Receita acumulada</p>
            </div>
            <p className="font-display text-5xl text-white tracking-tight">{formatBRL(m.receitaTotal)}</p>
            <p className="text-xs text-sand-200/70 mt-1">Soma de consultas + limpezas pagas</p>

            <div className="mt-6 grid grid-cols-2 gap-4 pt-5 border-t border-forest-600/40">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-sand-200/50">
                  Consultas · {formatBRL(m.PRECO_CONSULTA)}/un
                </p>
                <p className="font-display text-2xl text-brand-300 mt-1">{formatBRL(m.receitaConsultas)}</p>
                <p className="text-xs text-sand-200/60 mt-0.5">{m.consultasPagas} vendida(s)</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-sand-200/50">
                  Limpezas · {formatBRL(m.PRECO_LIMPEZA)}/un
                </p>
                <p className="font-display text-2xl text-brand-300 mt-1">{formatBRL(m.receitaLimpezas)}</p>
                <p className="text-xs text-sand-200/60 mt-0.5">{m.limpezasPagas} vendida(s)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Origem */}
        <Card>
          <CardContent className="p-6">
            <h2 className="font-display text-lg text-forest-800 mb-1">Origem</h2>
            <p className="text-xs text-gray-500 mb-5">De onde vem o lead</p>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-lg bg-brand-50 grid place-items-center shrink-0">
                  <Globe className="size-4 text-brand-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500">Site</p>
                  <p className="font-display text-xl text-forest-800">{m.origemSite}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-lg bg-emerald-50 grid place-items-center shrink-0">
                  <MessageCircle className="size-4 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500">WhatsApp</p>
                  <p className="font-display text-xl text-forest-800">{m.origemWA}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Aguardando muito tempo (alerta) */}
      {m.aguardandoMuito.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/40">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="size-4 text-amber-600" />
              <p className="font-semibold text-sm text-amber-900">
                {m.aguardandoMuito.length} processo(s) aguardando órgãos há 5+ dias
              </p>
            </div>
            <ul className="space-y-2 text-sm">
              {m.aguardandoMuito.slice(0, 5).map((p) => (
                <li key={p.id} className="flex items-center justify-between text-amber-900">
                  <Link href={`/painel/processos/${p.id}`} className="hover:underline font-medium">
                    {p.nome}
                  </Link>
                  <span className="text-xs text-amber-700">{p.dias_na_etapa ?? "?"}d</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {m.blindagemAlerta > 0 && (
        <Card className="mt-4 bg-red-50 border-red-200">
          <CardContent className="p-5 flex items-center gap-3">
            <ShieldCheck className="size-5 text-red-600 shrink-0" />
            <p className="text-sm text-red-800">
              <strong>{m.blindagemAlerta}</strong> blindagem(ns) com pendência detectada
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function KpiCard({
  label, value, icon: Icon, gradient, trend,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  trend?: { direction: "up" | "down" | "neutral"; value: string };
}) {
  return (
    <Card className="hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className={`size-10 rounded-xl bg-gradient-to-br ${gradient} grid place-items-center shadow-md`}>
            <Icon className="size-4 text-white" />
          </div>
          {trend && (
            <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5 ${
              trend.direction === "up"
                ? "bg-emerald-50 text-emerald-700"
                : trend.direction === "down"
                ? "bg-red-50 text-red-700"
                : "bg-gray-100 text-gray-600"
            }`}>
              {trend.direction === "up" && <ArrowUpRight className="size-3" />}
              {trend.direction === "down" && <ArrowDownRight className="size-3" />}
            </span>
          )}
        </div>
        <p className="font-display text-3xl text-forest-800 tracking-tight">{value}</p>
        <p className="text-xs text-gray-500 mt-1">{label}</p>
        {trend?.value && (
          <p className="text-[10px] text-gray-400 mt-2">{trend.value}</p>
        )}
      </CardContent>
    </Card>
  );
}

function StatRow({
  label, value, cor, emoji,
}: {
  label: string;
  value: number;
  cor: "amber" | "violet" | "emerald";
  emoji: string;
}) {
  const cores = {
    amber: { bg: "bg-amber-50", text: "text-amber-700", bar: "from-amber-400 to-amber-500" },
    violet: { bg: "bg-violet-50", text: "text-violet-700", bar: "from-violet-400 to-violet-500" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-700", bar: "from-emerald-400 to-emerald-500" },
  };
  const c = cores[cor];
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5 text-sm">
        <span className="flex items-center gap-1.5">
          <span>{emoji}</span>
          <span className="text-forest-700 font-medium">{label}</span>
        </span>
        <span className={`font-bold ${c.text}`}>{value}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full bg-gradient-to-r ${c.bar} rounded-full`} style={{ width: value > 0 ? "100%" : "0%" }} />
      </div>
    </div>
  );
}
