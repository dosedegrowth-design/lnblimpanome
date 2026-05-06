import { requireAdmin } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPhone, formatDateBR, maskCPF } from "@/lib/utils";
import type { CRMRow } from "@/lib/supabase/types";
import { Users } from "lucide-react";

export const dynamic = "force-dynamic";

function statusOf(r: CRMRow): { label: string; variant: "default" | "brand" | "success" | "warning" | "danger" } {
  if (r.Fechado) return { label: "Fechado", variant: "success" };
  if (r.consulta_paga) return { label: "Consulta paga", variant: "brand" };
  if (r.Qualificado) return { label: "Qualificado", variant: "warning" };
  if (r.Interessado) return { label: "Interessado", variant: "default" };
  return { label: "Lead", variant: "default" };
}

export default async function LeadsPage() {
  await requireAdmin();
  const supa = await createClient();
  const { data } = await supa
    .from("LNB - CRM")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  const leads = (data ?? []) as CRMRow[];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-4xl text-forest-800">Leads & CRM</h1>
          <p className="text-gray-500 mt-1">{leads.length} contatos cadastrados</p>
        </div>
        <div className="size-12 rounded-xl bg-brand-50 grid place-items-center">
          <Users className="size-5 text-brand-600" />
        </div>
      </header>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-sand-50 border-b border-gray-200">
              <tr className="text-left text-gray-500 text-xs uppercase tracking-wider">
                <th className="px-5 py-4 font-semibold">Nome</th>
                <th className="px-5 py-4 font-semibold">Telefone</th>
                <th className="px-5 py-4 font-semibold">CPF</th>
                <th className="px-5 py-4 font-semibold">Email</th>
                <th className="px-5 py-4 font-semibold">Status</th>
                <th className="px-5 py-4 font-semibold">Criado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {leads.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-gray-400">
                    <Users className="size-8 mx-auto mb-2 opacity-30" />
                    Nenhum lead cadastrado ainda.
                  </td>
                </tr>
              )}
              {leads.map((r) => {
                const s = statusOf(r);
                return (
                  <tr key={r.id} className="hover:bg-sand-50/40 transition-colors">
                    <td className="px-5 py-4 font-semibold text-forest-800">{r.nome ?? "—"}</td>
                    <td className="px-5 py-4 text-gray-700">{formatPhone(r.id)}</td>
                    <td className="px-5 py-4 text-gray-700 font-mono text-xs">
                      {r.CPF ? maskCPF(r.CPF) : "—"}
                    </td>
                    <td className="px-5 py-4 text-gray-700">{r["e-mail"] ?? "—"}</td>
                    <td className="px-5 py-4"><Badge variant={s.variant}>{s.label}</Badge></td>
                    <td className="px-5 py-4 text-gray-500">{formatDateBR(r.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
