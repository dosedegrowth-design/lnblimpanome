import { requireAdmin } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowUpRight, Plus, Upload, Play, Pause, Square,
  Calendar, MessageCircle, Sparkles, ChevronRight,
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

  const [consultas, processos, clientesResult] = await Promise.all([
    supa.from("LNB_Consultas").select("id, nome, cpf, tem_pendencia, total_dividas, consulta_paga, fechou_limpeza, origem, score, created_at"),
    supa.rpc("admin_processos_list", { p_tipo: null, p_etapa: null, p_responsavel_id: null }),
    supa.rpc("admin_clientes_list"),
  ]);

  const allClientes = ((clientesResult.data as { clientes?: Array<{
    id: string; nome: string; cpf: string; tag_servico: string | null;
    valor_pago: number | null; etapa: string; created_at: string; tem_pendencia: boolean | null;
    score: number | null;
  }> } | null)?.clientes) ?? [];

  const allConsultas = consultas.data ?? [];
  const allProcessos = (processos.data ?? []) as Array<{
    id: string; nome: string; cpf: string; etapa: string;
    dias_na_etapa?: number; tag_servico?: string | null;
  }>;

  const consultasPagas = allConsultas.filter((c) => c.consulta_paga).length;
  const limpezasPagas = allConsultas.filter((c) => c.fechou_limpeza).length;

  const taxaConversao = consultasPagas > 0 ? ((limpezasPagas / consultasPagas) * 100) : 0;
  const receitaTotal = consultasPagas * PRECO_CONSULTA + limpezasPagas * PRECO_LIMPEZA;

  const emTratativa = allProcessos.filter((p) => p.etapa === "em_tratativa").length;
  const aguardandoOrgaos = allProcessos.filter((p) => p.etapa === "aguardando_orgaos").length;
  const nomeLimpoCount = allProcessos.filter((p) => p.etapa === "nome_limpo").length;
  const aguardandoMuito = allProcessos.filter((p) => p.etapa === "aguardando_orgaos" && (p.dias_na_etapa ?? 0) >= 5);

  // Receita por dia (ultimos 7 dias) - estilo Donezo
  const hoje = new Date();
  const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const pagosNoIntervalo = (start: Date, end?: Date) =>
    allClientes.filter((c) => {
      if (!c.valor_pago || Number(c.valor_pago) <= 0) return false;
      const d = new Date(c.created_at);
      return d >= start && (!end || d < end);
    });

  const ultimos7: Array<{ label: string; valor: number; isToday: boolean; vendas: number }> = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(inicioHoje); d.setDate(inicioHoje.getDate() - i);
    const next = new Date(d); next.setDate(d.getDate() + 1);
    const vendas = pagosNoIntervalo(d, next);
    const dia = d.toLocaleDateString("pt-BR", { weekday: "short" }).charAt(0).toUpperCase();
    ultimos7.push({
      label: dia,
      valor: vendas.reduce((s, c) => s + Number(c.valor_pago ?? 0), 0),
      vendas: vendas.length,
      isToday: i === 0,
    });
  }
  const max7 = Math.max(1, ...ultimos7.map((d) => d.valor));
  const totalSemana = ultimos7.reduce((s, d) => s + d.valor, 0);

  // Ultimos pagamentos
  const ultimosPagamentos = allClientes
    .filter((c) => c.valor_pago && Number(c.valor_pago) > 0)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  // Funil etapas pre-pagamento
  const funilEtapas = etapas
    .filter((e) => ["lead", "interessado", "qualificado", "consulta_paga", "limpeza_paga"].includes(e.codigo))
    .map((e) => ({ ...e, qtd: allProcessos.filter((p) => p.etapa === e.codigo).length }));

  // Total dividas
  const totalPendencias = (allConsultas as Array<{ tem_pendencia: boolean | null; total_dividas: number | null }>)
    .filter((c) => c.tem_pendencia)
    .reduce((s, c) => s + Number(c.total_dividas ?? 0), 0);

  return {
    consultasPagas, limpezasPagas,
    receitaTotal,
    taxaConversao,
    totalProcessos: allProcessos.length,
    emTratativa, aguardandoOrgaos, nomeLimpoCount,
    aguardandoMuito,
    ultimos7, max7, totalSemana,
    ultimosPagamentos,
    funilEtapas,
    totalPendencias,
  };
}

const TAG_ICONS: Record<string, { bg: string; text: string; emoji: string }> = {
  consulta_cpf: { bg: "bg-cyan-100", text: "text-cyan-700", emoji: "🔍" },
  consulta_cnpj: { bg: "bg-blue-100", text: "text-blue-700", emoji: "🏢" },
  limpeza_cpf: { bg: "bg-emerald-100", text: "text-emerald-700", emoji: "✨" },
  limpeza_cnpj: { bg: "bg-teal-100", text: "text-teal-700", emoji: "🏛️" },
  blindagem: { bg: "bg-amber-100", text: "text-amber-700", emoji: "🛡️" },
};

export default async function DashboardPage() {
  const ctx = await requireAdmin();
  const m = await getMetrics();
  const modoTeste = process.env.LNB_MODO_TESTE === "true";

  return (
    <div className="p-6 sm:p-8 max-w-[1400px] mx-auto">
      {/* Header estilo Donezo */}
      <header className="mb-6 flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl tracking-tight text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Olá {ctx.user.nome.split(" ")[0]}, você tem {m.emTratativa} processo{m.emTratativa === 1 ? "" : "s"} em tratativa hoje
          </p>
        </div>
        <div className="flex items-center gap-2">
          {modoTeste && (
            <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-bold text-amber-700 bg-amber-100 px-2.5 py-1.5 rounded-lg">
              Modo teste ativo
            </span>
          )}
          <Link
            href="/painel/processos"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition shadow-sm"
          >
            <Plus className="size-4" />
            Ver Kanban
          </Link>
          <Link
            href="/painel/limpeza"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-gray-200 bg-white text-gray-700 text-sm font-semibold hover:bg-gray-50 transition"
          >
            <Upload className="size-4" />
            Limpeza
          </Link>
        </div>
      </header>

      {/* KPI Cards - 1 DESTACADO em verde solido (Donezo style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* DESTACADO VERDE */}
        <KpiFeatured
          label="Receita total"
          value={formatBRL(m.receitaTotal)}
          subtext={`${m.consultasPagas + m.limpezasPagas} venda(s) acumuladas`}
        />
        <KpiPlain
          label="Conversão"
          value={`${m.taxaConversao.toFixed(1)}%`}
          subtext={`${m.limpezasPagas} de ${m.consultasPagas} consultas`}
        />
        <KpiPlain
          label="Processos ativos"
          value={String(m.totalProcessos)}
          subtext={`${m.emTratativa} em tratativa`}
        />
        <KpiPlain
          label="Dívidas identificadas"
          value={formatBRL(m.totalPendencias)}
          subtext="Total de pendências"
        />
      </div>

      {/* Row 2: Project Analytics (barras Donezo) + Reminders + Project list */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Vendas semana (estilo Project Analytics Donezo) */}
        <Card className="lg:col-span-1">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-5">
              <h2 className="font-semibold text-sm text-gray-900">Vendas semana</h2>
              <span className="text-[11px] text-gray-400">{formatBRL(m.totalSemana)}</span>
            </div>
            <div className="flex items-end gap-2 h-32">
              {m.ultimos7.map((d, i) => {
                const pct = (d.valor / m.max7) * 100;
                return (
                  <div key={d.label + i} className="flex-1 flex flex-col items-center justify-end gap-1.5">
                    {d.isToday && d.valor > 0 && (
                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1 py-0.5 rounded">
                        {Math.round((d.valor / m.max7) * 100)}%
                      </span>
                    )}
                    <div
                      className={`w-full rounded-t-full transition-all relative overflow-hidden ${
                        d.isToday
                          ? "bg-gradient-to-t from-emerald-600 to-emerald-500"
                          : d.valor > 0
                          ? "bg-emerald-100"
                          : "bg-gray-100"
                      }`}
                      style={{ height: `${Math.max(pct, 8)}%`, minHeight: d.valor > 0 ? "20px" : "6px" }}
                    >
                      {!d.isToday && d.valor === 0 && (
                        <div className="absolute inset-0 opacity-50" style={{
                          backgroundImage: "repeating-linear-gradient(45deg, transparent 0, transparent 3px, #d1d5db 3px, #d1d5db 4px)"
                        }} />
                      )}
                    </div>
                    <span className={`text-[10px] uppercase font-medium ${d.isToday ? "text-emerald-700 font-bold" : "text-gray-400"}`}>
                      {d.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Reminders / Próximas ações (Donezo) */}
        <Card>
          <CardContent className="p-5">
            <h2 className="font-semibold text-sm text-gray-900 mb-1">Próxima ação</h2>
            <p className="font-display text-xl text-gray-900 leading-tight mt-3">
              {m.aguardandoMuito.length > 0
                ? `${m.aguardandoMuito.length} processo(s) parados`
                : m.emTratativa > 0
                ? `${m.emTratativa} em tratativa`
                : "Nenhuma pendência"}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {m.aguardandoMuito.length > 0
                ? "Aguardando órgãos há 5+ dias"
                : "Equipe pode iniciar próximas limpezas"}
            </p>
            <Link
              href="/painel/limpeza"
              className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold transition"
            >
              <Sparkles className="size-3.5" />
              Abrir painel de Limpeza
            </Link>
          </CardContent>
        </Card>

        {/* Lista compacta (estilo Project Donezo) */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-sm text-gray-900">Funil</h2>
              <Link href="/painel/processos" className="text-[10px] uppercase tracking-wider font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                Ver
              </Link>
            </div>
            <ul className="space-y-3.5">
              {m.funilEtapas.map((e, i) => {
                const dots = ["bg-gray-400", "bg-amber-500", "bg-violet-500", "bg-cyan-500", "bg-emerald-500"];
                return (
                  <li key={e.codigo} className="flex items-center gap-3">
                    <span className={`size-2 rounded-full ${dots[i] || "bg-gray-400"} shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{e.nome}</p>
                      <p className="text-[10px] text-gray-400">Total: {e.qtd}</p>
                    </div>
                    <span className="text-sm font-bold text-gray-900 tabular-nums">{e.qtd}</span>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Últimos pagamentos + Project Progress (donut) + Time Tracker DARK */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Últimos pagamentos */}
        <Card className="lg:col-span-1">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-sm text-gray-900">Últimos pagamentos</h2>
              <Link href="/painel/clientes" className="text-[10px] uppercase tracking-wider font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                + Add
              </Link>
            </div>
            {m.ultimosPagamentos.length === 0 ? (
              <p className="text-sm text-gray-400 py-8 text-center">Sem pagamentos</p>
            ) : (
              <ul className="space-y-3.5">
                {m.ultimosPagamentos.map((p) => {
                  const tagInfo = p.tag_servico ? TAG_ICONS[p.tag_servico] : null;
                  return (
                    <li key={p.id} className="flex items-center gap-3">
                      <div className={`size-9 rounded-full grid place-items-center text-base shrink-0 ${tagInfo?.bg || "bg-gray-100"}`}>
                        {tagInfo?.emoji || "💳"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate leading-tight">{p.nome}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          Pago em: {new Date(p.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                        </p>
                      </div>
                      <span className="text-[11px] font-bold text-emerald-700 tabular-nums">{formatBRL(Number(p.valor_pago ?? 0))}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Conversão (donut estilo Donezo Project Progress) */}
        <Card>
          <CardContent className="p-5">
            <h2 className="font-semibold text-sm text-gray-900 mb-1">Taxa de conversão</h2>
            <p className="text-[11px] text-gray-500">Consulta → Limpeza</p>

            <div className="flex items-center justify-center my-6">
              <DonutChart value={m.taxaConversao} />
            </div>

            <div className="flex items-center justify-center gap-4 text-[10px]">
              <Legend dot="bg-emerald-500" label="Convertidos" />
              <Legend dot="bg-emerald-200" label="Em aberto" />
              <Legend dot="bg-gray-200" label="Sem consulta" pattern />
            </div>
          </CardContent>
        </Card>

        {/* Card DARK estilo Time Tracker Donezo */}
        <Card className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-0">
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: "radial-gradient(circle at 20% 80%, rgba(16,185,129,0.4) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(139,92,246,0.3) 0%, transparent 50%)"
          }} />
          <CardContent className="p-5 relative">
            <p className="text-[11px] uppercase tracking-wider font-bold text-emerald-300 mb-3">Status da operação</p>
            <p className="font-display text-3xl text-white tracking-tight tabular-nums">{m.emTratativa + m.aguardandoOrgaos}</p>
            <p className="text-xs text-gray-400 mt-1">Em processamento agora</p>

            <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-white/10">
              <div>
                <p className="text-[9px] uppercase tracking-wider text-gray-400">Tratativa</p>
                <p className="font-display text-lg text-white tabular-nums">{m.emTratativa}</p>
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-wider text-gray-400">Aguardando</p>
                <p className="font-display text-lg text-white tabular-nums">{m.aguardandoOrgaos}</p>
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-wider text-gray-400">Limpos</p>
                <p className="font-display text-lg text-emerald-400 tabular-nums">{m.nomeLimpoCount}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-5">
              <Link
                href="/painel/limpeza"
                className="size-9 grid place-items-center rounded-full bg-white text-gray-900 hover:bg-gray-100 transition"
              >
                <Play className="size-4 fill-current" />
              </Link>
              <Link
                href="/painel/processos"
                className="size-9 grid place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 transition border border-white/20"
              >
                <Square className="size-3.5" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertas */}
      {m.aguardandoMuito.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/40 mb-3">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="size-2 rounded-full bg-amber-500" />
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

// KPI CARD DESTACADO em verde sólido (estilo Donezo "Total Projects 24")
function KpiFeatured({ label, value, subtext }: { label: string; value: string; subtext: string }) {
  return (
    <Card className="relative bg-emerald-700 border-emerald-700 shadow-lg overflow-hidden">
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: "radial-gradient(circle at 80% 20%, rgba(255,255,255,0.3) 0%, transparent 50%)"
      }} />
      <CardContent className="p-5 relative">
        <div className="flex items-start justify-between mb-2">
          <p className="text-xs text-emerald-50 font-medium">{label}</p>
          <button className="size-7 grid place-items-center rounded-full bg-white/15 hover:bg-white/25 text-white transition">
            <ArrowUpRight className="size-3.5" />
          </button>
        </div>
        <p className="font-display text-3xl text-white tracking-tight tabular-nums">{value}</p>
        <p className="text-[11px] text-emerald-100 mt-2 inline-flex items-center gap-1 bg-emerald-800/40 px-2 py-1 rounded-md">
          <ArrowUpRight className="size-3" />
          {subtext}
        </p>
      </CardContent>
    </Card>
  );
}

function KpiPlain({ label, value, subtext }: { label: string; value: string; subtext: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-2">
          <p className="text-xs text-gray-500 font-medium">{label}</p>
          <button className="size-7 grid place-items-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 transition">
            <ArrowUpRight className="size-3.5" />
          </button>
        </div>
        <p className="font-display text-3xl text-gray-900 tracking-tight tabular-nums">{value}</p>
        <p className="text-[11px] text-gray-400 mt-2">{subtext}</p>
      </CardContent>
    </Card>
  );
}

function DonutChart({ value }: { value: number }) {
  const size = 160;
  const stroke = 18;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const pct = Math.min(100, Math.max(0, value));
  const offset = circ * (1 - pct / 100);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="#e5e7eb" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#donutGrad)"
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <defs>
          <linearGradient id="donutGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <p className="font-display text-3xl text-gray-900 tabular-nums leading-none">{pct.toFixed(0)}%</p>
          <p className="text-[10px] text-gray-500 mt-1">Convertido</p>
        </div>
      </div>
    </div>
  );
}

function Legend({ dot, label, pattern }: { dot: string; label: string; pattern?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-gray-500">
      <span className={`size-2 rounded-full ${dot} ${pattern ? "" : ""}`} />
      {label}
    </span>
  );
}

// silenciar imports nao usados
void Pause; void Calendar; void MessageCircle; void ChevronRight;
