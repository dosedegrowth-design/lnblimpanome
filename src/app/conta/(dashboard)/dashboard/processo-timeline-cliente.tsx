"use client";
import { ArrowRight, MessageSquare, Settings, FileText } from "lucide-react";
import { formatDateTimeBR } from "@/lib/utils";
import { getEtapa, type TipoServico } from "@/lib/processos";

interface EventoCliente {
  id: string;
  tipo: "etapa" | "mensagem" | "arquivo" | "sistema";
  etapa_nova: string | null;
  mensagem: string | null;
  autor_nome: string | null;
  created_at: string;
}

interface Props {
  tipo: TipoServico;
  eventos: EventoCliente[];
}

export function ProcessoTimelineCliente({ tipo, eventos }: Props) {
  if (eventos.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-4">Sem atualizações ainda</p>;
  }

  return (
    <ol className="space-y-3">
      {eventos.slice(0, 8).map((e) => {
        const etapa = e.etapa_nova ? getEtapa(tipo, e.etapa_nova) : null;
        let icon = <Settings className="size-3.5 text-gray-500" />;
        let bg = "bg-gray-100";
        if (e.tipo === "etapa") {
          icon = <ArrowRight className="size-3.5 text-brand-600" />;
          bg = "bg-brand-100";
        } else if (e.tipo === "mensagem") {
          icon = <MessageSquare className="size-3.5 text-violet-600" />;
          bg = "bg-violet-100";
        } else if (e.tipo === "arquivo") {
          icon = <FileText className="size-3.5 text-amber-600" />;
          bg = "bg-amber-100";
        }
        return (
          <li key={e.id} className="flex gap-3">
            <div className={`size-8 rounded-full ${bg} grid place-items-center shrink-0`}>
              {icon}
            </div>
            <div className="flex-1 min-w-0">
              {e.tipo === "etapa" && etapa && (
                <p className="text-sm font-semibold text-forest-800">
                  Avançou pra: {etapa.emoji} {etapa.label}
                </p>
              )}
              {e.tipo === "mensagem" && (
                <p className="text-sm font-semibold text-forest-800">Mensagem da equipe</p>
              )}
              {e.tipo === "arquivo" && (
                <p className="text-sm font-semibold text-forest-800">Arquivo disponível</p>
              )}
              {e.tipo === "sistema" && e.mensagem && (
                <p className="text-sm font-semibold text-forest-800">{e.mensagem}</p>
              )}
              {e.mensagem && e.tipo !== "sistema" && (
                <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap">{e.mensagem}</p>
              )}
              <p className="text-xs text-gray-400 mt-1">{formatDateTimeBR(e.created_at)}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
