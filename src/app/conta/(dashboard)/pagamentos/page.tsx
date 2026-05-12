import { redirect } from "next/navigation";
import { getClienteSession, getClienteDashboardData } from "@/lib/auth/cliente";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Receipt, Download } from "lucide-react";
import { formatBRL, formatDateTimeBR } from "@/lib/utils";
import type { CRMRow, ConsultaRow } from "@/lib/supabase/types";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface Pagamento {
  label: string;
  valor: number;
  status: "pago" | "pendente";
  data: string | null;
  metodo?: string | null;
  link?: string | null;
}

export default async function PagamentosPage() {
  const session = await getClienteSession();
  if (!session) redirect("/conta/login");

  const dash = await getClienteDashboardData(session.cpf);
  const crm = dash.crm as CRMRow | null;
  const consulta = dash.consulta as ConsultaRow | null;

  const items: Pagamento[] = [];

  if (consulta?.consulta_paga) {
    items.push({
      label: "Consulta CPF",
      valor: 19.99,
      status: "pago",
      data: consulta.created_at,
      metodo: "Asaas",
    });
  }

  if (consulta?.fechou_limpeza || crm?.Fechado) {
    const valor = parseFloat(crm?.value || "480.01") || 480.01;
    items.push({
      label: "Limpeza de Nome + Blindagem",
      valor,
      status: "pago",
      data: crm?.created_at ?? null,
      metodo: crm?.metodo_de_pagamento || "Asaas",
      link: crm?.link_boleto,
    });
  }

  if (crm?.link_pagamento && !crm.Fechado && (crm.status_pagamento ?? "") !== "paid") {
    items.push({
      label: "Pagamento pendente",
      valor: parseFloat(crm.value || "0") || 0,
      status: "pendente",
      data: crm.data_venci,
      link: crm.link_pagamento,
    });
  }

  const total = items.filter((i) => i.status === "pago").reduce((s, i) => s + i.valor, 0);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl text-forest-800">Pagamentos</h1>
        <p className="text-gray-500 mt-1">Histórico das suas transações com a LNB</p>
      </header>

      {items.length > 0 && total > 0 && (
        <Card className="bg-gradient-to-br from-brand-500 to-brand-700 text-white border-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
          <CardContent className="p-6 relative">
            <p className="text-xs text-brand-100 uppercase tracking-wider font-semibold">Total investido</p>
            <p className="font-display text-4xl text-white mt-1">{formatBRL(total)}</p>
            <p className="text-sm text-brand-100 mt-1">
              {items.filter((i) => i.status === "pago").length} transação(ões) confirmada(s)
            </p>
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
              <p className="font-medium text-gray-500 mb-1">Nenhum pagamento ainda</p>
              <p className="text-sm text-gray-400 mb-5">
                Faça sua primeira consulta de CPF por R$ 19,99
              </p>
              <Link
                href="/consultar"
                className="inline-flex items-center gap-2 rounded-lg bg-brand-500 hover:bg-brand-600 px-5 h-10 text-sm font-semibold text-white"
              >
                Consultar agora
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {items.map((it, i) => (
                <li key={i} className="py-4 flex items-center justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <p className="font-bold text-forest-800">{it.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatDateTimeBR(it.data)}
                      {it.metodo && <> · {it.metodo}</>}
                    </p>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    {it.status === "pendente" && it.link && (
                      <a
                        href={it.link}
                        target="_blank"
                        rel="noopener"
                        className="inline-flex items-center gap-1.5 rounded-md bg-amber-500 hover:bg-amber-600 text-white px-3 h-9 text-xs font-semibold transition"
                      >
                        Pagar agora
                      </a>
                    )}
                    {it.status === "pago" && it.link && (
                      <a
                        href={it.link}
                        target="_blank"
                        rel="noopener"
                        className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-brand-600"
                      >
                        <Download className="size-3.5" /> Recibo
                      </a>
                    )}
                    <div>
                      <p className="font-display text-xl text-forest-800">{formatBRL(it.valor)}</p>
                      <Badge variant={it.status === "pago" ? "success" : "warning"} className="mt-1">
                        {it.status === "pago" ? "Pago" : "Pendente"}
                      </Badge>
                    </div>
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
