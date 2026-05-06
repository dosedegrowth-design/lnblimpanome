import { requireAdmin } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTimeBR, maskCPF } from "@/lib/utils";
import type { BlindagemRow } from "@/lib/supabase/types";
import { ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BlindagemPage() {
  await requireAdmin();
  const supa = await createClient();
  const { data } = await supa
    .from("LNB_Blindagem")
    .select("*")
    .order("created_at", { ascending: false });

  const items = (data ?? []) as BlindagemRow[];
  const ativas = items.filter((i) => i.status === "ativa").length;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-4xl text-forest-800">Blindagem</h1>
          <p className="text-gray-500 mt-1">
            {ativas} blindagens ativas · {items.length} total
          </p>
        </div>
        <div className="size-12 rounded-xl bg-brand-50 grid place-items-center">
          <ShieldCheck className="size-5 text-brand-600" />
        </div>
      </header>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-sand-50 border-b border-gray-200">
              <tr className="text-left text-gray-500 text-xs uppercase tracking-wider">
                <th className="px-5 py-4 font-semibold">Cliente</th>
                <th className="px-5 py-4 font-semibold">CPF</th>
                <th className="px-5 py-4 font-semibold">Status</th>
                <th className="px-5 py-4 font-semibold">Última verificação</th>
                <th className="px-5 py-4 font-semibold">Próxima</th>
                <th className="px-5 py-4 font-semibold">Alertas</th>
                <th className="px-5 py-4 font-semibold">Último resultado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center text-gray-400">
                    <ShieldCheck className="size-8 mx-auto mb-2 opacity-30" />
                    Nenhuma blindagem ativa ainda.
                  </td>
                </tr>
              )}
              {items.map((b) => (
                <tr key={b.cpf} className="hover:bg-sand-50/40 transition-colors">
                  <td className="px-5 py-4 font-semibold text-forest-800">{b.nome ?? "—"}</td>
                  <td className="px-5 py-4 font-mono text-xs">{maskCPF(b.cpf)}</td>
                  <td className="px-5 py-4">
                    <Badge variant={
                      b.status === "ativa" ? "success" :
                      b.status === "pausada" ? "warning" : "danger"
                    }>
                      {b.status}
                    </Badge>
                  </td>
                  <td className="px-5 py-4 text-gray-500">{formatDateTimeBR(b.ultima_verificacao)}</td>
                  <td className="px-5 py-4 text-gray-500">{formatDateTimeBR(b.proxima_verificacao)}</td>
                  <td className="px-5 py-4 text-gray-700 font-semibold">{b.alertas_enviados ?? 0}</td>
                  <td className="px-5 py-4 text-gray-700 max-w-xs truncate" title={b.ultimo_resultado ?? ""}>
                    {b.ultimo_resultado ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
