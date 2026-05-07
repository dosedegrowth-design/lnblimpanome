"use client";
import Link from "next/link";
import { Clock, MessageCircle } from "lucide-react";
import { getEtapas, type ProcessoRow, type TipoServico } from "@/lib/processos";
import { formatPhone, maskCPF } from "@/lib/utils";

interface Props {
  tipo: TipoServico;
  processos: ProcessoRow[];
}

const CORES: Record<string, { bg: string; border: string; text: string; chip: string }> = {
  brand:   { bg: "bg-brand-50",    border: "border-brand-200",   text: "text-brand-700",   chip: "bg-brand-500" },
  amber:   { bg: "bg-amber-50",    border: "border-amber-200",   text: "text-amber-700",   chip: "bg-amber-500" },
  violet:  { bg: "bg-violet-50",   border: "border-violet-200",  text: "text-violet-700",  chip: "bg-violet-500" },
  forest:  { bg: "bg-forest-50",   border: "border-forest-200",  text: "text-forest-700",  chip: "bg-forest-700" },
  emerald: { bg: "bg-emerald-50",  border: "border-emerald-200", text: "text-emerald-700", chip: "bg-emerald-500" },
  red:     { bg: "bg-red-50",      border: "border-red-200",     text: "text-red-700",     chip: "bg-red-500" },
  gray:    { bg: "bg-gray-50",     border: "border-gray-200",    text: "text-gray-700",    chip: "bg-gray-500" },
};

export function ProcessosKanban({ tipo, processos }: Props) {
  const etapas = getEtapas(tipo);

  function porEtapa(etapaId: string) {
    return processos.filter((p) => p.etapa === etapaId);
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {etapas.map((etapa) => {
        const lista = porEtapa(etapa.id);
        const cor = CORES[etapa.cor];
        return (
          <div
            key={etapa.id}
            className={`min-w-[280px] w-[280px] shrink-0 rounded-xl border ${cor.border} ${cor.bg} p-3`}
          >
            <header className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <span className={`inline-block size-2 rounded-full ${cor.chip}`} />
                <p className={`font-bold text-sm ${cor.text}`}>
                  {etapa.emoji} {etapa.label}
                </p>
              </div>
              <span className="text-xs font-bold text-gray-500">{lista.length}</span>
            </header>

            <div className="space-y-2">
              {lista.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">Vazio</p>
              ) : (
                lista.map((p) => (
                  <Link
                    key={p.id}
                    href={`/painel/processos/${p.id}`}
                    className="block bg-white rounded-lg border border-gray-200 p-3 hover:shadow-md hover:border-brand-300 transition group"
                  >
                    <p className="font-bold text-forest-800 text-sm truncate group-hover:text-brand-700">
                      {p.nome}
                    </p>
                    <p className="text-xs text-gray-500 font-mono mt-0.5">{maskCPF(p.cpf)}</p>
                    {p.telefone && (
                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <MessageCircle className="size-3" /> {formatPhone(p.telefone)}
                      </p>
                    )}
                    {typeof p.dias_na_etapa === "number" && (
                      <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                        <Clock className="size-3" /> {p.dias_na_etapa}d na etapa
                      </p>
                    )}
                  </Link>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
