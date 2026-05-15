import { requireAdmin } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import {
  ShieldCheck, TrendingUp, Wallet, Activity,
  Globe, MessageCircle, ArrowUpRight, ArrowDownRight, Clock, ChevronRight,
  MoreHorizontal, Calendar, Download,
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

  // ultimos 7 dias
  const ultimos7: Array<{ label: string; receita: number; vendas: number }> = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(inicioHoje); d.setDate(inicioHoje.getDate() - i);
    const next = new Date(d); next.setDate(d.getDate() + 1);
    const vendas = pagosNoIntervalo(d, next);
    const dia = d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
    ultimos7.push({
      label: dia.charAt(0).toUpperCase() + dia.slice(1),
      receita: vendas.reduce((s, c) => s + Number(c.valor_pago ?? 0), 0),
      vendas: vendas.length,
    });
  }
  const max7 = Math.max(1, ...ultimos7.map((d) => d.receita));

  // ultimos 3 meses (chart maior)
  const ultimos3meses: Array<{ label: string; receita: number }> = [];
  for (let i = 2; i >= 0; i--) {
    const mes = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    const proxMes = new Date(hoje.getFullYear(), hoje.getMonth() - i + 1, 1);
    const vendas = pagosNoIntervalo(mes, proxMes);
    ultimos3meses.push({
      label: mes.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "").toUpperCase(),
      receita: vendas.reduce((s, c) => s + Number(c.valor_pago ?? 0), 0),
    });
  }
  const maxMeses = Math.max(1, ...ultimos3meses.map((d) => d.receita));

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

  // Distribuicao por tag
  const distTag: Record<string, number> = {};
  allClientes.forEach((c) => {
    if (!c.tag_servico) return;
    distTag[c.tag_servico] = (distTag[c.tag_servico] ?? 0) + 1;
  });
  const totalDistTag = Object.values(distTag).reduce((s, n) => s + n, 0);

  return {
    totalLeads, consultasPagas, limpezasPagas,
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
    ultimos3meses, maxMeses,
    ultimosPagamentos,
    scoreMedio,
    totalPendencias, clientesComPendencia,
    distTag, totalDistTag,
  };
}

// Cores vivas pra barras (estilo Nexus)
const BAR_GRADIENTS = [
  "from-cyan-400 to-cyan-600",
  "from-teal-400 to-teal-600",
  "from-blue-400 to-blue-600",
  "from-violet-400 to-violet-600",
  "from-fuchsia-400 to-fuchsia-600",
  "from-emerald-400 to-emerald-600",
  "from-amber-400 to-amber-600",
];

const TAG_CORES: Record<string, string> = {
  consulta_cpf: "bg-cyan-500",
  consulta_cnpj: "bg-blue-500",
  limpeza_cpf: "bg-emerald-500",
  limpeza_cnpj: "bg-teal-500",
  blindagem: "bg-amber-500",
};

const TAG_LABELS: Record<string, string> = {
  consulta_cpf: "Consulta CPF",
  consulta_cnpj: "Consulta CNPJ",
  limpeza_cpf: "Limpeza CPF",
  limpeza_cnpj: "Limpeza CNPJ",
  blindagem: "Blindagem",
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
          <h1 className="font-display text-2xl sm:text-3xl text-gray-900 tracking-tight">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Olá, {ctx.user.nome.split(" ")[0]} 👋</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50">
            <Calendar className="size-3.5" />
            <span>{new Date().toLocaleDateString("pt-BR", { day: "numeric", month: "short" })} - hoje</span>
          </button>
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-medium hover:bg-gray-800">
            <Download className="size-3.5" />
            Export
          </button>
          {modoTeste && (
            <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full">
              Modo teste
            </span>
          )}
        </div>
      </header>

      {/* KPI Cards (estilo Nexus) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <KpiCard
          label="Receita total"
          value={formatBRL(m.receitaTotal)}
          trendValue={m.consultasPagas + m.limpezasPagas > 0 ? `+${m.consultasPagas + m.limpezasPagas} venda(s)` : "Sem vendas"}
          trendDirection={m.consultasPagas + m.limpezasPagas > 0 ? "up" : "neutral"}
        />
        <KpiCard
          label="Conversão"
          value={`${m.taxaConversao}%`}
          trendValue={`${m.limpezasPagas}/${m.consultasPagas} consultas`}
          trendDirection={Number(m.taxaConversao) >= 20 ? "up" : "neutral"}
        />
        <KpiCard
          label="Processos ativos"
          value={String(m.totalProcessos)}
          trendValue={`${m.emTratativa} em tratativa`}
          trendDirection="neutral"
        />
      </div>

      {/* Sales overview (grande) + Total Subscriber (estilo Nexus) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Receita por mês com barras coloridas */}
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-xs text-gray-500 mb-1">Receita mensal</p>
                <p className="font-display text-2xl text-gray-900 tracking-tight">{formatBRL(m.receitaMes)}</p>
              </div>
              <button className="size-7 grid place-items-center rounded-md text-gray-400 hover:bg-gray-100">
                <MoreHorizontal className="size-4" />
              </button>
            </div>

            {/* Barras estilo Nexus: 3 meses lado a lado */}
            <div className="flex items-end gap-4 h-44">
              {m.ultimos3meses.map((d, i) => {
                const pct = (d.receita / m.maxMeses) * 100;
                const grad = BAR_GRADIENTS[i % BAR_GRADIENTS.length];
                const isCurrent = i === m.ultimos3meses.length - 1;
                return (
                  <div key={d.label} className="flex-1 flex flex-col items-center justify-end gap-2">
                    <div className="text-xs font-semibold text-gray-700 tabular-nums">
                      {d.receita > 0 ? formatBRL(d.receita).replace("R$", "R$ ") : "R$ 0"}
                    </div>
                    <div
                      className={`w-full rounded-t-lg bg-gradient-to-t ${grad} transition-all ${isCurrent ? "ring-2 ring-offset-2 ring-gray-900/10" : ""}`}
                      style={{ height: `${Math.max(pct, 4)}%`, minHeight: "8px" }}
                    />
                    <span className="text-[11px] uppercase font-semibold text-gray-500 tracking-wider">{d.label}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Total receita 7d */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-1">
              <div>
                <p className="text-xs text-gray-500">Últimos 7 dias</p>
                <p className="font-display text-2xl text-gray-900 tracking-tight mt-1">{formatBRL(m.receitaSemana)}</p>
                <p className="text-xs text-emerald-600 font-medium mt-1">+{m.vendasSemana} venda(s)</p>
              </div>
            </div>

            {/* Barras pequenas 7d em violeta */}
            <div className="flex items-end gap-1.5 h-28 mt-5">
              {m.ultimos7.map((d, i) => {
                const pct = (d.receita / m.max7) * 100;
                const hoje = i === m.ultimos7.length - 1;
                return (
                  <div key={d.label + i} className="flex-1 flex flex-col items-center justify-end gap-1.5">
                    <div
                      className={`w-full rounded-t transition-all ${
                        hoje
                          ? "bg-gradient-to-t from-violet-500 to-violet-400"
                          : d.receita > 0
                          ? "bg-violet-200 hover:bg-violet-300"
                          : "bg-gray-100"
                      }`}
                      style={{ height: `${Math.max(pct, 4)}%`, minHeight: "4px" }}
                      title={`${d.label}: ${formatBRL(d.receita)}`}
                    />
                    <span className={`text-[10px] ${hoje ? "text-violet-700 font-semibold" : "text-gray-400"}`}>{d.label}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Distribuição por serviço + Saúde da base */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="font-display text-base font-semibold text-gray-900">Distribuição por serviço</h2>
                <p className="text-xs text-gray-500 mt-0.5">{m.totalDistTag} processo(s) ativos</p>
              </div>
              <button className="size-7 grid place-items-center rounded-md text-gray-400 hover:bg-gray-100">
                <MoreHorizontal className="size-4" />
              </button>
            </div>
            {m.totalDistTag === 0 ? (
              <p className="text-sm text-gray-400 py-6 text-center">Sem dados</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(m.distTag).map(([tag, qtd]) => {
                  const pct = (qtd / m.totalDistTag) * 100;
                  return (
                    <div key={tag}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="flex items-center gap-2 text-sm text-gray-700">
                          <span className={`size-2 rounded-full ${TAG_CORES[tag] || "bg-gray-400"}`} />
                          {TAG_LABELS[tag] || tag}
                        </span>
                        <span className="font-semibold text-gray-900 tabular-nums text-sm">{qtd}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${TAG_CORES[tag] || "bg-gray-400"}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Funil + Operacao */}
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-display text-base font-semibold text-gray-900">Funil de vendas</h2>
                <p className="text-xs text-gray-500 mt-0.5">Processos por etapa</p>
              </div>
              <Link href="/painel/processos" className="text-xs text-gray-500 hover:text-gray-900 font-medium inline-flex items-center gap-1 group">
                Ver Kanban
                <ChevronRight className="size-3.5 group-hover:translate-x-0.5 transition" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {m.funilEtapas.map((e, i) => {
                const cores = ["bg-gray-400", "bg-amber-500", "bg-violet-500", "bg-cyan-500", "bg-emerald-500"];
                return (
                  <div key={e.codigo} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`size-1.5 rounded-full ${cores[i] || "bg-gray-400"}`} />
                      <p className="text-[11px] text-gray-500 font-medium truncate">{e.nome}</p>
                    </div>
                    <p className="font-display text-2xl text-gray-900 tabular-nums">{e.qtd}</p>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-100">
              <OpStat label="Em tratativa" value={m.emTratativa} cor="bg-amber-500" />
              <OpStat label="Aguardando órgãos" value={m.aguardandoOrgaos} cor="bg-violet-500" />
              <OpStat label="Nome limpo" value={m.nomeLimpoCount} cor="bg-emerald-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ultimos pagamentos + Score */}
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
              <ul className="divide-y divide-gray-100">
                {m.ultimosPagamentos.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="size-9 rounded-full bg-gradient-to-br from-violet-400 via-fuchsia-400 to-rose-400 grid place-items-center text-white font-semibold text-[11px] shrink-0">
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
            <h2 className="font-display text-base font-semibold text-gray-900 mb-5">Saúde da base</h2>

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
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-2">
                  <div
                    className={`h-full rounded-full transition-all ${
                      (m.scoreMedio ?? 0) >= 701 ? "bg-emerald-500" :
                      (m.scoreMedio ?? 0) >= 501 ? "bg-amber-500" :
                      "bg-red-500"
                    }`}
                    style={{ width: `${Math.min(100, ((m.scoreMedio ?? 0) / 1000) * 100)}%` }}
                  />
                </div>
              </div>
              <div className="pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-1.5">Dívidas identificadas</p>
                <p className="font-display text-xl text-gray-900 tracking-tight tabular-nums">{formatBRL(m.totalPendencias)}</p>
                <p className="text-[11px] text-gray-400 mt-1">{m.clientesComPendencia} cliente(s) com pendência</p>
              </div>
              <div className="pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-1.5">Blindagens ativas</p>
                <div className="flex items-baseline gap-2">
                  <p className="font-display text-xl text-gray-900 tracking-tight tabular-nums">{m.blindagemAtiva}</p>
                  {m.blindagemAlerta > 0 && (
                    <span className="text-[10px] uppercase tracking-wider font-bold text-red-700 bg-red-50 px-1.5 py-0.5 rounded">
                      {m.blindagemAlerta} alerta
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Origem (rodapé) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <OrigemCard
          icon={Globe}
          label="Site"
          value={m.origemSite}
          accentBg="bg-cyan-50"
          accentText="text-cyan-600"
        />
        <OrigemCard
          icon={MessageCircle}
          label="WhatsApp"
          value={m.origemWA}
          accentBg="bg-emerald-50"
          accentText="text-emerald-600"
        />
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
  label, value, trendValue, trendDirection,
}: {
  label: string;
  value: string;
  trendValue?: string;
  trendDirection?: "up" | "down" | "neutral";
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
        <p className="font-display text-3xl text-gray-900 tracking-tight tabular-nums">{value}</p>
        {trendValue && (
          <div className="flex items-center gap-1.5 mt-2">
            {trendDirection === "up" && (
              <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-emerald-600">
                <ArrowUpRight className="size-3" />
              </span>
            )}
            {trendDirection === "down" && (
              <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-red-600">
                <ArrowDownRight className="size-3" />
              </span>
            )}
            <span className="text-[11px] text-gray-500">{trendValue}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function OpStat({ label, value, cor }: { label: string; value: number; cor: string }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <span className={`size-1.5 rounded-full ${cor}`} />
        <p className="text-[11px] text-gray-500 truncate">{label}</p>
      </div>
      <p className="font-display text-xl text-gray-900 tabular-nums">{value}</p>
    </div>
  );
}

function OrigemCard({
  icon: Icon, label, value, accentBg, accentText,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  accentBg: string;
  accentText: string;
}) {
  return (
    <Card>
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`size-12 rounded-xl ${accentBg} grid place-items-center shrink-0`}>
          <Icon className={`size-5 ${accentText}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500">{label}</p>
          <p className="font-display text-2xl text-gray-900 tabular-nums mt-0.5">{value}</p>
          <p className="text-[11px] text-gray-400">leads + consultas</p>
        </div>
      </CardContent>
    </Card>
  );
}

// usado pra evitar import unused
void TrendingUp; void Wallet; void ShieldCheck; void Activity;
