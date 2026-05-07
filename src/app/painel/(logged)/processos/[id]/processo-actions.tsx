"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, MessageSquare, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getEtapas, getProximaEtapa, type TipoServico } from "@/lib/processos";

interface Props {
  processoId: string;
  tipo: TipoServico;
  etapaAtual: string;
  cliente: { nome: string; email: string | null; telefone: string | null };
}

export function ProcessoActions({ processoId, tipo, etapaAtual, cliente }: Props) {
  const router = useRouter();
  const etapas = getEtapas(tipo);
  const proxima = getProximaEtapa(tipo, etapaAtual);

  const [moveOpen, setMoveOpen] = useState(false);
  const [novaEtapa, setNovaEtapa] = useState(proxima?.id || "");
  const [mensagem, setMensagem] = useState("");
  const [notificar, setNotificar] = useState(true);
  const [loadingMove, setLoadingMove] = useState(false);

  const [msgOpen, setMsgOpen] = useState(false);
  const [msgTexto, setMsgTexto] = useState("");
  const [msgVisivel, setMsgVisivel] = useState(true);
  const [loadingMsg, setLoadingMsg] = useState(false);

  async function moverEtapa() {
    if (!novaEtapa || novaEtapa === etapaAtual) {
      toast.error("Selecione uma etapa diferente da atual");
      return;
    }
    setLoadingMove(true);
    try {
      const r = await fetch("/api/admin/processos/mover-etapa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          processo_id: processoId,
          nova_etapa: novaEtapa,
          mensagem: mensagem || null,
          notificar_cliente: notificar,
        }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) {
        toast.error(d.error || "Erro");
        return;
      }
      toast.success(notificar ? "Etapa atualizada e cliente notificado" : "Etapa atualizada");
      setMoveOpen(false);
      setMensagem("");
      router.refresh();
    } finally {
      setLoadingMove(false);
    }
  }

  async function enviarMensagem() {
    if (msgTexto.length < 2) {
      toast.error("Digite uma mensagem");
      return;
    }
    setLoadingMsg(true);
    try {
      const r = await fetch("/api/admin/processos/mensagem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          processo_id: processoId,
          mensagem: msgTexto,
          visivel_cliente: msgVisivel,
        }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) {
        toast.error(d.error || "Erro");
        return;
      }
      toast.success("Mensagem registrada");
      setMsgOpen(false);
      setMsgTexto("");
      router.refresh();
    } finally {
      setLoadingMsg(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {proxima && !moveOpen && (
          <Button onClick={() => setMoveOpen(true)} className="gap-2">
            <ArrowRight className="size-4" />
            Avançar pra: {proxima.emoji} {proxima.label}
          </Button>
        )}
        {!moveOpen && (
          <Button variant="outline" onClick={() => setMoveOpen(true)}>
            Mover pra outra etapa
          </Button>
        )}
        {!msgOpen && (
          <Button variant="outline" onClick={() => setMsgOpen(true)} className="gap-2">
            <MessageSquare className="size-4" />
            Adicionar mensagem
          </Button>
        )}
      </div>

      {moveOpen && (
        <div className="rounded-xl border border-brand-200 bg-brand-50/40 p-4 space-y-3">
          <p className="font-bold text-forest-800 text-sm">Mover etapa</p>
          <select
            value={novaEtapa}
            onChange={(e) => setNovaEtapa(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm"
          >
            <option value="">Selecione a nova etapa</option>
            {etapas
              .filter((e) => e.id !== etapaAtual)
              .map((e) => (
                <option key={e.id} value={e.id}>
                  {e.emoji} {e.label} — {e.descricao}
                </option>
              ))}
          </select>

          <textarea
            placeholder="Mensagem opcional pro cliente (vai junto na notificação)..."
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={notificar}
              onChange={(e) => setNotificar(e.target.checked)}
              className="rounded text-brand-500 focus:ring-brand-500"
            />
            Notificar cliente por email{cliente.telefone ? " e WhatsApp" : ""}
          </label>

          <div className="flex gap-2 justify-end pt-1">
            <Button variant="outline" size="sm" onClick={() => setMoveOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={moverEtapa} loading={loadingMove} size="sm">
              Confirmar mudança
            </Button>
          </div>
        </div>
      )}

      {msgOpen && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
          <p className="font-bold text-forest-800 text-sm">Adicionar mensagem</p>
          <textarea
            placeholder="Anotação interna ou mensagem pro cliente..."
            value={msgTexto}
            onChange={(e) => setMsgTexto(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={msgVisivel}
              onChange={(e) => setMsgVisivel(e.target.checked)}
              className="rounded text-brand-500 focus:ring-brand-500"
            />
            Visível pro cliente {!msgVisivel && <span className="text-xs text-amber-600">(apenas interno)</span>}
          </label>
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="outline" size="sm" onClick={() => setMsgOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={enviarMensagem} loading={loadingMsg} size="sm">
              {loadingMsg ? <Loader2 className="size-4 animate-spin" /> : "Adicionar"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
