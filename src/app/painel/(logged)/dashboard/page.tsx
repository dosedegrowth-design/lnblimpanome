import { requireAdmin } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import {
  Users, FileSearch, ShieldCheck, TrendingUp, Wallet, Activity,
  Globe, MessageCircle, ArrowUpRight, Clock, ChevronRight,
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

  const [crm, consultas, blindagem, processos, clientesResult] = await Promise.all([
    supa.from("LNB - CRM").select("id, Lead, Interessado, Agendado, Fechado, perdido, origem"),
    supa.from("LNB_Consultas").select("id, nome, cpf, tem_pendencia, total_dividas, consulta_paga, fechou_limpeza, origem, score, created_at"),
    supa.from("LNB_Blindagem").select("id, ativo, tem_pendencia_atual"),
    supa.rpc("admin_processos_list", { p_tipo: null, p_etapa: null, p_responsavel_id: null }),
    supa.rpc("admin_clientes_list"),
  ]);

  const allClientes = ((clientesResult.data as { clientes?: Array<{
    id: string; nome: string; cpf: string; tag_servico: string | null;
    valor_pago: number | null; etapa: string; created_at: string; tem_pendencia: boolean | null;
    score: number | null;
  }> } | null)?.clientes) ?? [];

  const allLeads = crm.data ?? [];
  const allConsultas = consultas.data ?? [];
  const allBlindagem = blindagem.data ?? [];
  const allProcessos = (processos.data ?? []) as Array<{
    id: string; nome: string; cpf: string; etapa: string;
    dias_na_etapa?: number; tag_servico?: string | null;
  }>;

  const totalLeads = allLeads.length;
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

  const funilEtapas = etapas
    .filter((e) => ["lead", "interessado", "qualificado", "consulta_paga", "limpeza_paga"].includes(e.codigo))
    .map((e) => ({ ...e, qtd: allProcessos.filter((p) => p.etapa === e.codigo).length }));
  const maxFunil = Math.max(1, ...funilEtapas.map((e) => e.qtd));

  const emTratativa = allProcessos.filter((p) => p.etapa === "em_tratativa").length;
  const aguardandoOrgaos = allProcessos.filter((p) => p.etapa === "aguardando_orgaos").length;
  const nomeLimpoCount = allProcessos.filter((p) => p.etapa === "nome_limpo").length;
  const aguardandoMuito = allProcessos.filter((p) => p.etapa === "aguardando_orgaos" && (p.dias_na_etapa ?? 0) >= 5);

  // Periodo
  const hoje = new Date();
  const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const inicioSemana = new Date(inicioHoje); inicioSemana.setDate(inicioHoje.getDate() - 7);
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

  const pagosNoIntervalo = (start: Date, end?: Date) =>
    allClientes.filter((c) => {
      if (!c.valor_pago || Number(c.valor_pago) <= 0) return false;
      const d = new Date(c.created_at);
      return d >= start && (!end || d < end);
    });

  const vendasHoje = pagosNoIntervalo(inicioHoje);
  const vendasSemana = pagosNoIntervalo(inicioSemana);
  const vendasMes = pagosNoIntervalo(inicioMes);

  const receitaHoje = vendasHoje.reduce((s, c) => s + Number(c.valor_pago ?? 0), 0);
  const receitaSemana = vendasSemana.reduce((s, c) => s + Number(c.valor_pago ?? 0), 0);
  const receitaMes = vendasMes.reduce((s, c) => s + Number(c.valor_pago ?? 0), 0);

  const ultimos7: Array<{ label: string; receita: number; vendas: number }> = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(inicioHoje); d.setDate(inicioHoje.getDate() - i);
    const next = new Date(d); next.setDate(d.getDate() + 1);
    const vendas = pagosNoIntervalo(d, next);
    ultimos7.push({
      label: d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "").charAt(0).toUpperCase() + d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "").slice(1),
      receita: vendas.reduce((s, c) => s + Number(c.valor_pago ?? 0), 0),
      vendas: vendas.length,
    });
  }
  const max7 = Math.max(1, ...ultimos7.map((d) => d.receita));

  const ultimosPagamentos = allClientes
    .filter((c) => c.valor_pago && Number(c.valor_pago) > 0)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const scores = (allConsultas as Array<{ score: number | null }>).filter((c) => c.score != null).map((c) => Number(c.score));
  const scoreMedio = scores.length > 0 ? Math.round(scores.reduce((s, n) => s + n, 0) / scores.length) : null;

  const totalPendencias = (allConsultas as Array<{ tem_pendencia: boolean | null; total_dividas: number | null }>)
    .filter((c) => c.tem_pendencia)
    .reduce((s, c) => s + Number(c.total_dividas ?? 0), 0);
  const clientesComPendencia = (allConsultas as Array<{ tem_pendencia: boolean | null }>).filter((c) => c.tem_pendencia).length;

  return {
    totalLeads, perdidos, consultasPagas, limpezasPagas,
    blindagemAtiva, blindagemAlerta,
    taxaConversao, receitaTotal, receitaConsultas, receitaLimpezas,
    origemSite, origemWA,
    PRECO_CONSULTA, PRECO_LIMPEZA,
    funilEtapas, maxFunil,
    emTratativa, aguardandoOrgaos, nomeLimpoCount,
    aguardandoMuito,
    totalProcessos: allProcessos.length,
    vendasHoje: vendasHoje.length, receitaHoje,
    vendasSemana: vendasSemana.length, receitaSemana,
    vendasMes: vendasMes.length, receitaMes,
    ultimos7, max7,
    ultimosPagamentos,
    scoreMedio,
    totalPendencias, clientesComPendencia,
  };
}

const FUNIL_BARS: Record<string, string> = {
  lead: "bg-gray-300",
  interessado: "bg-amber-400",
  qualificado: "bg-violet-400",
  consulta_paga: "bg-brand-500",
  limpeza_paga: "bg-emerald-500",
};

export default async function DashboardPage() {
  const ctx = await requireAdmin();
  const m = await getMetrics();
  const modoTeste = process.env.LNB_MODO_TESTE === "true";

  return (
    <div className="p-6 sm:p-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <header className="mb-7 flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="text-sm text-gray-500">Olá, {ctx.user.nome.split(" ")[0]}</p>
          <h1 className="font-display text-2xl sm:text-3xl text-gray-900 tracking-tight mt-0.5">Painel de controle</h1>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-xs text-gray-400 hidden sm:block">
            {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
          </p>
          {modoTeste && (
            <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full">
              Modo teste
            </span>
          )}
        </div>
      </header>

      {/* KPI Cards minimalistas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
        <KpiCard
          label="Receita total"
          value={formatBRL(m.receitaTotal)}
          subtext={`${m.consultasPagas + m.limpezasPagas} venda(s)`}
          icon={Wallet}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
        <KpiCard
          label="Conversão"
          value={`${m.taxaConversao}%`}
          subtext={`${m.limpezasPagas}/${m.consultasPagas} consultas`}
          icon={TrendingUp}
          iconColor="text-brand-600"
          iconBg="bg-brand-50"
        />
        <KpiCard
          label="Processos ativos"
          value={String(m.totalProcessos)}
          subtext={`${m.emTratativa} em tratativa`}
          icon={Activity}
          iconColor="text-violet-600"
          iconBg="bg-violet-50"
        />
        <KpiCard
          label="Blindagens"
          value={String(m.blindagemAtiva)}
          subtext={m.blindagemAlerta > 0 ? `${m.blindagemAlerta} alerta(s)` : "Todas ativas"}
          icon={ShieldCheck}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
        />
      </div>

      {/* Periodo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <PeriodoCard label="Hoje" value={formatBRL(m.receitaHoje)} count={`${m.vendasHoje} venda${m.vendasHoje === 1 ? "" : "s"}`} />
        <PeriodoCard label="Últimos 7 dias" value={formatBRL(m.receitaSemana)} count={`${m.vendasSemana} venda${m.vendasSemana === 1 ? "" : "s"}`} />
        <PeriodoCard label="Este mês" value={formatBRL(m.receitaMes)} count={`${m.vendasMes} venda${m.vendasMes === 1 ? "" : "s"}`} />
      </div>

      {/* Funil + Operação */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-display text-base font-semibold text-gray-900">Funil de vendas</h2>
                <p className="text-xs text-gray-500 mt-0.5">Processos por etapa (pré-pagamento)</p>
              </div>
              <Link href="/painel/processos" className="text-xs text-gray-500 hover:text-gray-900 font-medium inline-flex items-center gap-1 group">
                Ver Kanban
                <ChevronRight className="size-3.5 group-hover:translate-x-0.5 transition" />
              </Link>
            </div>
            <div className="space-y-4">
              {m.funilEtapas.map((e) => {
                const pct = Math.max(2, (e.qtd / m.maxFunil) * 100);
                const bar = FUNIL_BARS[e.codigo] || "bg-gray-300";
                return (
                  <div key={e.codigo}>
                    <div className="flex items-center justify-between mb-1.5 text-sm">
                      <span className="text-gray-700">{e.nome}</span>
                      <span className="font-semibold text-gray-900 tabular-nums">{e.qtd}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full ${bar} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-display text-base font-semibold text-gray-900">Operação</h2>
                <p className="text-xs text-gray-500 mt-0.5">Status pós-pagamento</p>
              </div>
            </div>
            <ul className="space-y-3">
              <OpRow label="Em tratativa" value={m.emTratativa} dot="bg-amber-500" />
              <OpRow label="Aguardando órgãos" value={m.aguardandoOrgaos} dot="bg-violet-500" />
              <OpRow label="Nome limpo" value={m.nomeLimpoCount} dot="bg-emerald-500" />
            </ul>
            <Link
              href="/painel/limpeza"
              className="mt-5 inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 font-medium group"
            >
              Abrir painel de limpeza
              <ChevronRight className="size-3.5 group-hover:translate-x-0.5 transition" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Chart 7 dias + Saude da base */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-display text-base font-semibold text-gray-900">Receita últimos 7 dias</h2>
                <p className="text-xs text-gray-500 mt-0.5">{formatBRL(m.receitaSemana)} no período</p>
              </div>
            </div>
            <div className="flex items-end gap-2 h-44">
              {m.ultimos7.map((d, i) => {
                const pct = (d.receita / m.max7) * 100;
                const hoje = i === m.ultimos7.length - 1;
                return (
                  <div key={d.label + i} className="flex-1 flex flex-col items-center justify-end gap-2">
                    <div className="text-[10px] text-gray-400 font-medium tabular-nums">
                      {d.receita > 0 ? formatBRL(d.receita).replace("R$", "").trim() : ""}
                    </div>
                    <div
                      className={`w-full rounded-md transition-all ${hoje ? "bg-gray-900" : "bg-gray-200 hover:bg-gray-300"}`}
                      style={{ height: `${Math.max(pct, d.receita > 0 ? 6 : 2)}%`, minHeight: "3px" }}
                      title={`${d.label}: ${formatBRL(d.receita)} · ${d.vendas} venda(s)`}
                    />
                    <span className={`text-[10px] ${hoje ? "text-gray-900 font-semibold" : "text-gray-400"}`}>{d.label}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="font-display text-base font-semibold text-gray-900 mb-1">Saúde da base</h2>
            <p className="text-xs text-gray-500 mb-6">Score médio e dívidas</p>

            <div className="space-y-5">
              <div>
                <p className="text-xs text-gray-500 mb-1.5">Score médio</p>
                <p className={`font-display text-3xl tracking-tight ${
                  (m.scoreMedio ?? 0) >= 701 ? "text-emerald-600" :
                  (m.scoreMedio ?? 0) >= 501 ? "text-amber-600" :
                  m.scoreMedio == null ? "text-gray-300" : "text-red-600"
                }`}>
                  {m.scoreMedio ?? "—"}
                </p>
              </div>
              <div className="pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-1.5">Dívidas identificadas</p>
                <p className="font-display text-2xl tracking-tight text-gray-900">{formatBRL(m.totalPendencias)}</p>
                <p className="text-[11px] text-gray-400 mt-1">{m.clientesComPendencia} cliente(s) com pendência</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ultimos pagamentos + Origem */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-display text-base font-semibold text-gray-900">Últimos pagamentos</h2>
                <p className="text-xs text-gray-500 mt-0.5">5 mais recentes</p>
              </div>
              <Link href="/painel/clientes" className="text-xs text-gray-500 hover:text-gray-900 font-medium inline-flex items-center gap-1 group">
                Ver todos <ChevronRight className="size-3.5 group-hover:translate-x-0.5 transition" />
              </Link>
            </div>
            {m.ultimosPagamentos.length === 0 ? (
              <p className="text-sm text-gray-400 py-8 text-center">Nenhum pagamento ainda</p>
            ) : (
              <ul className="divide-y divide-gray-50">
                {m.ultimosPagamentos.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="size-9 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 grid place-items-center text-white font-semibold text-[11px] shrink-0">
                      {p.nome.split(" ").slice(0, 2).map((s) => s.charAt(0).toUpperCase()).join("")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">{p.nome}</p>
                      <p className="text-[11px] text-gray-400">
                        {new Date(p.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 tabular-nums">{formatBRL(Number(p.valor_pago ?? 0))}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="font-display text-base font-semibold text-gray-900 mb-1">Origem dos leads</h2>
            <p className="text-xs text-gray-500 mb-6">Site vs WhatsApp</p>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-lg bg-brand-50 grid place-items-center shrink-0">
                  <Globe className="size-4 text-brand-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500">Site</p>
                  <p className="font-display text-xl text-gray-900 tabular-nums">{m.origemSite}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-lg bg-emerald-50 grid place-items-center shrink-0">
                  <MessageCircle className="size-4 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500">WhatsApp</p>
                  <p className="font-display text-xl text-gray-900 tabular-nums">{m.origemWA}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertas */}
      {m.aguardandoMuito.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/40 mb-3">
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
    </div>
  );
}

function KpiCard({
  label, value, subtext, icon: Icon, iconColor, iconBg,
}: {
  label: string;
  value: string;
  subtext?: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  iconBg: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <p className="text-xs text-gray-500 font-medium">{label}</p>
          <div className={`size-8 rounded-lg ${iconBg} grid place-items-center`}>
            <Icon className={`size-4 ${iconColor}`} />
          </div>
        </div>
        <p className="font-display text-2xl text-gray-900 tracking-tight tabular-nums">{value}</p>
        {subtext && <p className="text-[11px] text-gray-400 mt-1">{subtext}</p>}
      </CardContent>
    </Card>
  );
}

function PeriodoCard({ label, value, count }: { label: string; value: string; count: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">{label}</p>
        <p className="font-display text-xl text-gray-900 tracking-tight mt-1 tabular-nums">{value}</p>
        <p className="text-[11px] text-gray-400 mt-1">{count}</p>
      </CardContent>
    </Card>
  );
}

function OpRow({ label, value, dot }: { label: string; value: number; dot: string }) {
  return (
    <li className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-sm text-gray-700">
        <span className={`size-1.5 rounded-full ${dot}`} />
        {label}
      </span>
      <span className="font-semibold text-gray-900 tabular-nums">{value}</span>
    </li>
  );
}
