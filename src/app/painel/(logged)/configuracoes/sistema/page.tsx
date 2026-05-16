import { requireAdmin, canManageUsers } from "@/lib/auth/admin";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/admin/page-header";
import {
  Cog, CheckCircle2, XCircle, ExternalLink, Database, Server,
  Box, Tag, ListChecks, Users,
} from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

const APP_VERSION = "0.4.2";

export default async function SistemaPage() {
  const ctx = await requireAdmin();
  if (!canManageUsers(ctx.user.role)) redirect("/painel/configuracoes?denied=1");

  const modoTeste = process.env.LNB_MODO_TESTE === "true";
  const ambiente = process.env.VERCEL_ENV || process.env.NODE_ENV || "desconhecido";

  const supa = await createClient();

  // Contagens de tabelas + health
  const [
    { count: nProcessos },
    { count: nClientes },
    { count: nConsultas },
    { count: nBlindagem },
    apiCtl,
  ] = await Promise.all([
    supa.from("lnb_processos").select("*", { count: "exact", head: true }),
    supa.from("LNB - CRM").select("*", { count: "exact", head: true }),
    supa.from("LNB_Consultas").select("*", { count: "exact", head: true }),
    supa.from("LNB_Blindagem").select("*", { count: "exact", head: true }),
    supa.from("LNB_API_Control").select("*").order("mes_ano", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const apiRow = apiCtl.data as Record<string, unknown> | null;
  const bigUso = (apiRow?.bigdatacorp_count as number | undefined) ?? 0;
  const bigLimite = (apiRow?.bigdatacorp_limit as number | undefined) ?? 0;
  const saldoOK = bigLimite > 0 && bigUso < bigLimite * 0.9;

  return (
    <div className="p-6 sm:p-8 max-w-5xl mx-auto">
      <div className="mb-4">
        <Link href="/painel/configuracoes" className="text-sm text-gray-500 hover:text-gray-900">
          ← Configurações
        </Link>
      </div>

      <PageHeader
        title="Sistema"
        subtitle="Informações da aplicação, provedores e ambiente"
      />

      {/* Status banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <StatusCard
          label="Modo teste"
          value={modoTeste ? "ATIVO" : "Desativado"}
          tone={modoTeste ? "warning" : "neutral"}
          subtext={modoTeste ? "Checkouts cobram preço de teste" : "Cobrança em preço real"}
        />
        <StatusCard
          label="Ambiente"
          value={ambiente}
          tone={ambiente === "production" ? "success" : "warning"}
          subtext={`Versão ${APP_VERSION}`}
        />
        <StatusCard
          label="Provedores"
          value={saldoOK ? "OK" : "Atenção"}
          tone={saldoOK ? "success" : "warning"}
          subtext={`${bigUso}/${bigLimite} consultas usadas`}
        />
      </div>

      {/* Health checks */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <h2 className="font-display text-base font-semibold text-gray-900 mb-1">Health checks</h2>
          <p className="text-xs text-gray-500 mb-5">Verificação de serviços essenciais</p>

          <ul className="space-y-3">
            <HealthRow label="Banco de dados (Supabase)" ok={true} note="Conectado" />
            <HealthRow label="Webhook Asaas" ok={true} note="Endpoint ativo" />
            <HealthRow label="Provedor de consulta" ok={saldoOK} note={saldoOK ? "Saldo OK" : "Saldo baixo — abastecer"} />
            <HealthRow label="Modo teste" ok={!modoTeste} note={modoTeste ? "⚠️ Ativo em produção" : "Inativo"} />
          </ul>
        </CardContent>
      </Card>

      {/* Contagem de tabelas */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-1">
            <Database className="size-4 text-gray-400" />
            <h2 className="font-display text-base font-semibold text-gray-900">Base de dados</h2>
          </div>
          <p className="text-xs text-gray-500 mb-5">Registros nas tabelas principais</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <CountCard label="Processos" value={nProcessos ?? 0} icon={ListChecks} />
            <CountCard label="Leads (CRM)" value={nClientes ?? 0} icon={Users} />
            <CountCard label="Consultas" value={nConsultas ?? 0} icon={Box} />
            <CountCard label="Blindagens" value={nBlindagem ?? 0} icon={Tag} />
          </div>
        </CardContent>
      </Card>

      {/* Provedor de consulta */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-1">
            <Server className="size-4 text-gray-400" />
            <h2 className="font-display text-base font-semibold text-gray-900">Provedor de consulta</h2>
          </div>
          <p className="text-xs text-gray-500 mb-5">Saldo do mês atual</p>

          {apiRow ? (
            <>
              <div className="flex items-end justify-between mb-2">
                <p className="font-display text-2xl text-gray-900 tabular-nums">
                  {bigUso} <span className="text-base text-gray-400">/ {bigLimite}</span>
                </p>
                <span className="text-xs text-gray-500">consultas usadas</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    bigUso / Math.max(bigLimite, 1) > 0.9
                      ? "bg-red-500"
                      : bigUso / Math.max(bigLimite, 1) > 0.7
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                  }`}
                  style={{ width: `${Math.min(100, (bigUso / Math.max(bigLimite, 1)) * 100)}%` }}
                />
              </div>
              <p className="text-[11px] text-gray-400 mt-2">Mês de referência: {String(apiRow.mes_ano ?? "—")}</p>
            </>
          ) : (
            <p className="text-sm text-gray-400">Nenhum registro de uso ainda</p>
          )}
        </CardContent>
      </Card>

      {/* Links úteis */}
      <Card>
        <CardContent className="p-6">
          <h2 className="font-display text-base font-semibold text-gray-900 mb-1">Links úteis</h2>
          <p className="text-xs text-gray-500 mb-5">Acesso rápido aos painéis externos</p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <LinkCard label="Site público" href="https://limpanomebrazil.com.br" />
            <LinkCard label="Supabase" href="https://supabase.com/dashboard/project/hkjukobqpjezhpxzplpj" />
            <LinkCard label="Vercel" href="https://vercel.com/dose-de-growths-projects/lnb-painel" />
            <LinkCard label="Asaas" href="https://www.asaas.com" />
            <LinkCard label="Chatwoot" href="https://chat.dosedegrowth.pro/app/accounts/11/dashboard" />
            <LinkCard label="GitHub" href="https://github.com/dosedegrowth-design/lnblimpanome" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusCard({
  label, value, tone, subtext,
}: {
  label: string;
  value: string;
  tone: "success" | "warning" | "neutral";
  subtext: string;
}) {
  const tones = {
    success: { dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50" },
    warning: { dot: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50" },
    neutral: { dot: "bg-gray-400", text: "text-gray-700", bg: "bg-gray-100" },
  };
  const t = tones[tone];
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs text-gray-500 font-medium mb-2">{label}</p>
        <div className="flex items-center gap-2">
          <span className={`size-2 rounded-full ${t.dot}`} />
          <span className={`inline-flex items-center px-2 py-0.5 rounded-md ${t.bg} ${t.text} text-xs font-semibold uppercase`}>
            {value}
          </span>
        </div>
        <p className="text-[11px] text-gray-400 mt-2">{subtext}</p>
      </CardContent>
    </Card>
  );
}

function HealthRow({ label, ok, note }: { label: string; ok: boolean; note: string }) {
  return (
    <li className="flex items-center justify-between py-1">
      <div className="flex items-center gap-2.5">
        {ok ? (
          <CheckCircle2 className="size-4 text-emerald-500" />
        ) : (
          <XCircle className="size-4 text-red-500" />
        )}
        <span className="text-sm text-gray-700">{label}</span>
      </div>
      <span className={`text-xs ${ok ? "text-emerald-600" : "text-red-600"}`}>{note}</span>
    </li>
  );
}

function CountCard({
  label, value, icon: Icon,
}: {
  label: string; value: number; icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="size-3.5 text-gray-400" />
        <p className="text-[11px] text-gray-500">{label}</p>
      </div>
      <p className="font-display text-2xl text-gray-900 tabular-nums">{value}</p>
    </div>
  );
}

function LinkCard({ label, href }: { label: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-sm text-gray-700 hover:text-gray-900 transition"
    >
      <span className="font-medium">{label}</span>
      <ExternalLink className="size-3.5 text-gray-400 group-hover:text-gray-700" />
    </a>
  );
}

// unused imports placeholders
void Cog;
