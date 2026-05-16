import { requireAdmin } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/admin/page-header";
import { ShieldCheck, AlertTriangle, MessageCircle } from "lucide-react";
import { formatBRL, formatDateBR, formatPhone, maskCPF } from "@/lib/utils";
import { AvatarCircle, PriorityPill } from "@/components/ui/data-table-bits";

export const dynamic = "force-dynamic";

interface BlindagemRow {
  id: string;
  cpf: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  plano: string | null;
  valor: number | null;
  ativo: boolean;
  tem_pendencia_atual: boolean | null;
  ultima_verificacao: string | null;
  proxima_verificacao: string | null;
  asaas_subscription_id: string | null;
  created_at: string;
}

export default async function BlindagensPage() {
  await requireAdmin();
  const supa = await createClient();

  const { data } = await supa
    .from("LNB_Blindagem")
    .select("*")
    .order("created_at", { ascending: false });

  const blindagens = (data ?? []) as BlindagemRow[];
  const ativas = blindagens.filter((b) => b.ativo);
  const comAlerta = ativas.filter((b) => b.tem_pendencia_atual);
  const mrr = ativas.reduce((s, b) => s + Number(b.valor ?? 0), 0);

  return (
    <div className="p-6 sm:p-8 max-w-[1400px] mx-auto">
      <PageHeader
        title="Blindagens"
        subtitle={`${ativas.length} assinatura(s) ativa(s) · MRR ${formatBRL(mrr)}`}
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-2">
              <p className="text-xs text-gray-500 font-medium">Assinaturas ativas</p>
              <ShieldCheck className="size-4 text-emerald-500" />
            </div>
            <p className="font-display text-3xl text-gray-900 tabular-nums">{ativas.length}</p>
            <p className="text-[11px] text-gray-400 mt-2">{blindagens.length - ativas.length} canceladas</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-2">
              <p className="text-xs text-gray-500 font-medium">MRR</p>
            </div>
            <p className="font-display text-3xl text-gray-900 tabular-nums">{formatBRL(mrr)}</p>
            <p className="text-[11px] text-gray-400 mt-2">Receita mensal recorrente</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-2">
              <p className="text-xs text-gray-500 font-medium">Com alerta</p>
              <AlertTriangle className="size-4 text-amber-500" />
            </div>
            <p className="font-display text-3xl text-gray-900 tabular-nums">{comAlerta.length}</p>
            <p className="text-[11px] text-gray-400 mt-2">Pendência detectada</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela */}
      <div className="rounded-xl bg-white border border-gray-100 shadow-[0_1px_3px_rgba(16,24,40,0.06)] overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-gray-400 text-xs">
            <tr className="border-b border-gray-100">
              <th className="text-left py-3 px-4 font-normal">Cliente</th>
              <th className="text-left py-3 px-3 font-normal">Status</th>
              <th className="text-left py-3 px-3 font-normal">Plano</th>
              <th className="text-right py-3 px-3 font-normal">Valor</th>
              <th className="text-left py-3 px-3 font-normal">Última verif.</th>
              <th className="text-left py-3 px-3 font-normal">Próxima</th>
              <th className="text-right py-3 px-3 font-normal">Cliente</th>
            </tr>
          </thead>
          <tbody>
            {blindagens.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-gray-400 text-sm">
                  Nenhuma blindagem ativa ainda
                </td>
              </tr>
            ) : (
              blindagens.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50/40 border-b border-gray-50 last:border-0">
                  <td className="py-4 px-4">
                    <p className="font-medium text-gray-900">{b.nome || "—"}</p>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">{maskCPF(b.cpf)}</p>
                  </td>
                  <td className="py-4 px-3">
                    {!b.ativo ? (
                      <PriorityPill tone="neutral" label="Cancelada" />
                    ) : b.tem_pendencia_atual ? (
                      <PriorityPill tone="warning" label="Alerta" />
                    ) : (
                      <PriorityPill tone="success" label="Ativa" />
                    )}
                  </td>
                  <td className="py-4 px-3 text-xs text-gray-600 capitalize">{b.plano ?? "—"}</td>
                  <td className="py-4 px-3 text-right font-mono text-xs text-emerald-700 font-semibold">
                    {b.valor ? formatBRL(Number(b.valor)) : "—"}
                  </td>
                  <td className="py-4 px-3 text-xs text-gray-500">
                    {b.ultima_verificacao ? formatDateBR(b.ultima_verificacao) : "—"}
                  </td>
                  <td className="py-4 px-3 text-xs text-gray-500">
                    {b.proxima_verificacao ? formatDateBR(b.proxima_verificacao) : "—"}
                  </td>
                  <td className="py-4 px-3">
                    <div className="flex items-center justify-end gap-2">
                      {b.telefone && (
                        <a
                          href={`https://wa.me/${b.telefone.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noopener"
                          className="text-gray-400 hover:text-emerald-600 transition"
                          title={`WhatsApp ${formatPhone(b.telefone)}`}
                        >
                          <MessageCircle className="size-4" />
                        </a>
                      )}
                      <AvatarCircle name={b.nome || "?"} size={28} />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
