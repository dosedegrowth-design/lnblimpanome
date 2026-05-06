"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pause, Play, Loader2 } from "lucide-react";

interface Props {
  cpf: string;
  ativa: boolean;
}

export function BlindagemActions({ cpf, ativa }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/blindagem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cpf, action: ativa ? "pausar" : "reativar" }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) {
        toast.error(d.error || "Falha na operação");
        return;
      }
      toast.success(ativa ? "Blindagem pausada" : "Blindagem reativada");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 rounded-md px-3 h-8 text-xs font-semibold transition disabled:opacity-50 ${
        ativa
          ? "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
          : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
      }`}
    >
      {loading ? <Loader2 className="size-3 animate-spin" /> :
       ativa ? <Pause className="size-3" /> : <Play className="size-3" />}
      {ativa ? "Pausar" : "Reativar"}
    </button>
  );
}
