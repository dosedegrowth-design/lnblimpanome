import { redirect } from "next/navigation";
import { getClienteSession, getClienteDashboardData } from "@/lib/auth/cliente";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBRL, formatDateTimeBR, maskCPF } from "@/lib/utils";
import type { ConsultaRow } from "@/lib/supabase/types";
import { FileSearch, Download, MessageCircle } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

const WHATSAPP =
  "https://wa.me/5541996171780?text=" +
  encodeURIComponent("Olá! Quero limpar meu nome — vi minha consulta na LNB.");

export default async function RelatorioPage() {
  const session = await getClienteSession();
  if (!session) redirect("/conta/login");

  const dash = await getClienteDashboardData(session.cpf);
  const data = dash.consulta as ConsultaRow | null;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl text-forest-800">Relatório de Consulta</h1>
        <p className="text-gray-500 mt-1">Resultado completo do seu CPF</p>
      </header>

      {!data ? (
        <Card>
          <CardContent className="p-16 text-center">
            <FileSearch className="size-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 font-medium mb-1">Nenhuma consulta realizada ainda</p>
            <p className="text-sm text-gray-400 mb-6 max-w-md mx-auto">
              Por R$ 19,99 você descobre se seu nome tem pendências, qual o score, quanto deve e pra quem.
            </p>
            <Link
              href="/consultar"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-500 hover:bg-brand-600 px-6 h-11 text-sm font-semibold text-white shadow-md shadow-brand-500/25 transition"
            >
              Fazer minha consulta agora
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="overflow-hidden">
            <div className={`p-6 ${data.tem_pendencia ? "bg-gradient-to-br from-red-50 to-red-100" : "bg-gradient-to-br from-emerald-50 to-emerald-100"}`}>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Situação</p>
              {data.tem_pendencia
                ? <p className="font-display text-3xl text-red-700">Possui pendências</p>
                : <p className="font-display text-3xl text-emerald-700">Nome limpo ✓</p>}
            </div>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-6 p-6">
              <Stat label="CPF" value={maskCPF(data.cpf)} mono />
              <Stat label="Pendências" value={data.tem_pendencia ? `${data.qtd_pendencias ?? 0}` : "0"} />
              <Stat label="Total débito" value={data.tem_pendencia ? formatBRL(data.total_dividas) : "—"} />
              <Stat label="Provedor" value={data.provider === "apifull" ? "API Full" : data.provider ?? "—"} />
            </CardContent>
            {data.resumo && (
              <div className="px-6 pb-6">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">Resumo</p>
                <p className="text-sm text-gray-700 leading-relaxed">{data.resumo}</p>
              </div>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Documento PDF</CardTitle>
            </CardHeader>
            <CardContent>
              {data.pdf_url ? (
                <div className="space-y-3">
                  <a
                    href={data.pdf_url}
                    target="_blank"
                    rel="noopener"
                    className="inline-flex items-center gap-2 rounded-xl bg-brand-500 hover:bg-brand-600 hover:-translate-y-0.5 px-6 h-12 text-sm font-semibold text-white shadow-md shadow-brand-500/25 transition-all"
                  >
                    <Download className="size-4" />
                    Abrir PDF do relatório
                  </a>
                  <p className="text-xs text-gray-400">
                    Realizada em {formatDateTimeBR(data.created_at)}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-500">PDF ainda sendo gerado. Atualize em alguns minutos.</p>
              )}
            </CardContent>
          </Card>

          {data.tem_pendencia && !data.fechou_limpeza && (
            <Card className="bg-gradient-to-br from-red-50 via-amber-50/40 to-red-50 border-red-200">
              <CardContent className="p-6 flex items-start gap-4 flex-wrap">
                <div className="flex-1 min-w-[260px]">
                  <p className="font-bold text-red-800 mb-1">A LNB pode limpar seu nome em até 20 dias úteis</p>
                  <p className="text-sm text-gray-700">
                    Sem você precisar quitar a dívida ou negociar com cada credor.
                  </p>
                </div>
                <a
                  href={WHATSAPP}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex items-center gap-2 rounded-xl bg-red-500 hover:bg-red-600 text-white px-6 h-12 font-semibold shadow-md transition"
                >
                  <MessageCircle className="size-4" />
                  Falar com consultor
                </a>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function Stat({
  label, value, mono,
}: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">{label}</p>
      <p className={`mt-1.5 font-bold ${mono ? "font-mono" : ""} text-forest-800`}>
        {value}
      </p>
    </div>
  );
}
