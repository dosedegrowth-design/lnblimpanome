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

  const total = items.reduce((s, i) => s + i.valor, 0);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl text-forest-800">Pagamentos</h1>
        <p className="text-gray-500 mt-1">Histórico das suas transações</p>
      </header>

      {items.length > 0 && (
        <Card className="bg-gradient-to-br from-brand-500 to-brand-700 text-white border-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
          <CardContent className="p-6 relative">
            <p className="text-xs text-brand-100 uppercase tracking-wider font-semibold">Total investido</p>
            <p className="font-display text-4xl text-white mt-1">{formatBRL(total)}</p>
            <p className="text-sm text-brand-100 mt-1">{items.length} transação(ões)</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Histórico</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Receipt className="size-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium text-gray-500">Nenhum pagamento registrado ainda</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {items.map((it, i) => (
                <li key={i} className="py-4 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-forest-800">{it.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{formatDateTimeBR(it.data)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-xl text-forest-800">{formatBRL(it.valor)}</p>
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
