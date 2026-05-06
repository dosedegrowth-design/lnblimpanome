"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Props {
  telefone: string;
  current: string;
}

const STAGES = [
  { v: "lead",         l: "Lead" },
  { v: "interessado",  l: "Interessado" },
  { v: "agendado",     l: "Agendado" },
  { v: "fechado",      l: "Fechado" },
  { v: "perdido",      l: "Perdido" },
];

export function LeadStageSelect({ telefone, current }: Props) {
  const router = useRouter();
  const [val, setVal] = useState(current);
  const [loading, setLoading] = useState(false);

  async function update(newVal: string) {
    setLoading(true);
    setVal(newVal);
    try {
      const r = await fetch("/api/admin/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telefone, status: newVal }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) {
        toast.error(d.error || "Falha");
        setVal(current);
        return;
      }
      toast.success("Status atualizado");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <select
      value={val}
      onChange={(e) => update(e.target.value)}
      disabled={loading}
      className="h-8 px-2 rounded-md border border-gray-200 bg-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/30 disabled:opacity-50"
    >
      {STAGES.map((s) => (
        <option key={s.v} value={s.v}>{s.l}</option>
      ))}
    </select>
  );
}
