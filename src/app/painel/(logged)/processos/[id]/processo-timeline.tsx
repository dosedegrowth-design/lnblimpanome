import { Clock, ArrowRight, MessageSquare, FileText, Settings, Mail, MessageCircle } from "lucide-react";
import { formatDateTimeBR } from "@/lib/utils";
import { getEtapa, type EventoRow, type TipoServico } from "@/lib/processos";

interface Props {
  tipo: TipoServico;
  eventos: EventoRow[];
}

export function ProcessoTimeline({ tipo, eventos }: Props) {
  if (eventos.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        Nenhum evento ainda
      </div>
    );
  }

  return (
    <ol className="relative space-y-1 pl-1">
      {eventos.map((e, i) => {
        const etapaNova = e.etapa_nova ? getEtapa(tipo, e.etapa_nova) : null;
        const etapaAnt = e.etapa_anterior ? getEtapa(tipo, e.etapa_anterior) : null;

        let icon = <Clock className="size-3.5 text-gray-500" />;
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
        } else if (e.tipo === "sistema") {
          icon = <Settings className="size-3.5 text-gray-600" />;
          bg = "bg-gray-100";
        }

        return (
          <li key={e.id} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className={`size-8 rounded-full ${bg} grid place-items-center shrink-0 ring-4 ring-white`}>
                {icon}
              </div>
              {i < eventos.length - 1 && <div className="w-0.5 flex-1 bg-gray-200 my-1" />}
            </div>
            <div className="flex-1 pb-5 -mt-0.5">
              <div className="flex flex-wrap items-center gap-2">
                {e.tipo === "etapa" && etapaNova && (
                  <p className="font-semibold text-sm text-forest-800">
                    {etapaAnt && (
                      <span className="text-gray-500 font-normal">
                        {etapaAnt.emoji} {etapaAnt.label} →{" "}
                      </span>
                    )}
                    <span className="text-brand-700">
                      {etapaNova.emoji} {etapaNova.label}
                    </span>
                  </p>
                )}
                {e.tipo === "mensagem" && (
                  <p className="font-semibold text-sm text-forest-800">Mensagem</p>
                )}
                {e.tipo === "arquivo" && (
                  <p className="font-semibold text-sm text-forest-800">Arquivo enviado</p>
                )}
                {e.tipo === "sistema" && (
                  <p className="font-semibold text-sm text-gray-600">Sistema</p>
                )}
                {!e.visivel_cliente && (
                  <span className="text-[10px] uppercase font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">Interno</span>
                )}
                {e.notificou_email && (
                  <span title="Email enviado" className="text-emerald-600">
                    <Mail className="size-3.5" />
                  </span>
                )}
                {e.notificou_wa && (
                  <span title="WhatsApp enviado" className="text-emerald-600">
                    <MessageCircle className="size-3.5" />
                  </span>
                )}
              </div>
              {e.mensagem && (
                <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap leading-relaxed">{e.mensagem}</p>
              )}
              <p className="text-xs text-gray-400 mt-1">
                {e.autor_nome && <>{e.autor_nome} · </>}
                {formatDateTimeBR(e.created_at)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
