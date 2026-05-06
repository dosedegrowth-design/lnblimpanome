import { requireAdmin } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatBRL, formatDateTimeBR, maskCPF } from "@/lib/utils";
import type { ConsultaRow } from "@/lib/supabase/types";
import { FileSearch } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ConsultasPage() {
  await requireAdmin();
  const supa = await createClient();
  const { data } = await supa
    .from("LNB_Consultas")
    .select("*")
    .order("data_consulta", { ascending: false })
    .limit(200);

  const consultas = (data ?? []) as ConsultaRow[];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-4xl text-forest-800">Consultas</h1>
          <p className="text-gray-500 mt-1">{consultas.length} consultas realizadas</p>
        </div>
        <div className="size-12 rounded-xl bg-brand-50 grid place-items-center">
          <FileSearch className="size-5 text-brand-600" />
        </div>
      </header>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-sand-50 border-b border-gray-200">
              <tr className="text-left text-gray-500 text-xs uppercase tracking-wider">
                <th className="px-5 py-4 font-semibold">Cliente</th>
                <th className="px-5 py-4 font-semibold">CPF</th>
                <th className="px-5 py-4 font-semibold">Score</th>
                <th className="px-5 py-4 font-semibold">Pendências</th>
                <th className="px-5 py-4 font-semibold">Total Débito</th>
                <th className="px-5 py-4 font-semibold">PDF</th>
                <th className="px-5 py-4 font-semibold">Realizada</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {consultas.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center text-gray-400">
                    <FileSearch className="size-8 mx-auto mb-2 opacity-30" />
                    Nenhuma consulta realizada ainda.
                  </td>
                </tr>
              )}
              {consultas.map((c) => (
                <tr key={c.cpf} className="hover:bg-sand-50/40 transition-colors">
                  <td className="px-5 py-4 font-semibold text-forest-800">{c.nome ?? "—"}</td>
                  <td className="px-5 py-4 text-gray-700 font-mono text-xs">{maskCPF(c.cpf)}</td>
                  <td className="px-5 py-4">
                    <span className={`font-bold ${
                      (c.score ?? 0) >= 700 ? "text-emerald-600" :
                      (c.score ?? 0) >= 500 ? "text-amber-600" : "text-red-600"
                    }`}>
                      {c.score ?? "—"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {c.has_debt ? (
                      <Badge variant="danger">{c.total_pendencias ?? 0} pendência(s)</Badge>
                    ) : (
                      <Badge variant="success">Limpo</Badge>
                    )}
                  </td>
                  <td className="px-5 py-4 text-gray-700">{c.total_debitos ? formatBRL(c.total_debitos) : "—"}</td>
                  <td className="px-5 py-4">
                    {c.pdf_url ? (
                      <a href={c.pdf_url} target="_blank" rel="noopener" className="text-brand-600 hover:text-brand-700 text-xs font-semibold underline">
                        Abrir PDF
                      </a>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-gray-500">{formatDateTimeBR(c.data_consulta)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
