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
    <div className="p-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Consultas</h1>
        <p className="text-gray-500 mt-1">{consultas.length} consultas realizadas</p>
      </header>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left text-gray-500 text-xs uppercase tracking-wide">
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">CPF</th>
                <th className="px-4 py-3 font-medium">Score</th>
                <th className="px-4 py-3 font-medium">Pendências</th>
                <th className="px-4 py-3 font-medium">Total Débito</th>
                <th className="px-4 py-3 font-medium">PDF</th>
                <th className="px-4 py-3 font-medium">Realizada</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {consultas.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    <FileSearch className="size-8 mx-auto mb-2 opacity-30" />
                    Nenhuma consulta realizada ainda.
                  </td>
                </tr>
              )}
              {consultas.map((c) => (
                <tr key={c.cpf} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 font-medium text-gray-900">{c.nome ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-700 font-mono text-xs">{maskCPF(c.cpf)}</td>
                  <td className="px-4 py-3">
                    <span className={`font-semibold ${
                      (c.score ?? 0) >= 700 ? "text-green-600" :
                      (c.score ?? 0) >= 500 ? "text-amber-600" : "text-red-600"
                    }`}>
                      {c.score ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {c.has_debt ? (
                      <Badge variant="danger">{c.total_pendencias ?? 0} pendência(s)</Badge>
                    ) : (
                      <Badge variant="success">Limpo</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{c.total_debitos ? formatBRL(c.total_debitos) : "—"}</td>
                  <td className="px-4 py-3">
                    {c.pdf_url ? (
                      <a href={c.pdf_url} target="_blank" rel="noopener" className="text-brand-600 hover:underline text-xs font-medium">
                        Abrir PDF
                      </a>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatDateTimeBR(c.data_consulta)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
