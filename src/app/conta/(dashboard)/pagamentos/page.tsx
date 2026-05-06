import { redirect } from "next/navigation";
import { getClienteSession, getClienteDashboardData } from "@/lib/auth/cliente";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Receipt } from "lucide-react";
import { formatBRL, formatDateTimeBR } from "@/lib/utils";
import type { CRMRow } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function PagamentosPage() {
  const session = await getClienteSession();
  if (!session) redirect("/conta/login");

  const dash = await getClienteDashboardData(session.cpf);
  const data = dash.crm as CRMRow | null;

  const items: { label: string; valor: number; pago: boolean; data: string | null }[] = [];
  if (data?.consulta_paga) {
    items.push({ label: "Consulta de CPF", valor: 19.99, pago: true, data: data.data_pagamento });
  }
  if (data?.Fechado) {
    items.push({ label: "Limpeza de Nome + Blindagem", valor: 480.01, pago: true, data: data.data_pagamento });
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">Pagamentos</h1>
        <p className="text-gray-500 mt-1">Histórico das suas transações</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Histórico</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Receipt className="size-10 mx-auto mb-3 opacity-30" />
              <p>Nenhum pagamento registrado ainda.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {items.map((it, i) => (
                <li key={i} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{it.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{formatDateTimeBR(it.data)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{formatBRL(it.valor)}</p>
                    <Badge variant={it.pago ? "success" : "warning"} className="mt-1">
                      {it.pago ? "Pago" : "Pendente"}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
