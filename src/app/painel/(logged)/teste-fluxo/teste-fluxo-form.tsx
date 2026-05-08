"use client";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2, XCircle, MinusCircle, Loader2, Play, ChevronDown, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

type Step = {
  step: string;
  ok: boolean | null;
  skipped?: boolean;
  latencia_ms?: number;
  [k: string]: unknown;
};

type Resultado = {
  ok: boolean;
  resumo: { total: number; sucesso: number; falhas: number; ignorados: number };
  cpf: string;
  timestamp: string;
  steps: Step[];
};

export function TesteFluxoForm() {
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [aberto, setAberto] = useState<Record<string, boolean>>({});

  const [form, setForm] = useState({
    cpf: "11144477735",
    nome: "Lucas Teste",
    email: "lucas@dosedegrowth.com.br",
    telefone: "5511997440101",
    tipo: "limpeza",
    etapa: "iniciado",
    skip_api_full: false,
    skip_email: false,
    skip_whatsapp: false,
    skip_pdf: false,
  });

  function set<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function executar() {
    setLoading(true);
    setResultado(null);
    setAberto({});

    const skip: string[] = [];
    if (form.skip_api_full) skip.push("api_full");
    if (form.skip_email) skip.push("email");
    if (form.skip_whatsapp) skip.push("whatsapp");
    if (form.skip_pdf) skip.push("pdf");

    try {
      const r = await fetch("/api/admin/teste-fluxo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, skip }),
      });
      const d = await r.json();
      if (!r.ok) {
        toast.error(d.error || "Erro ao executar teste");
        return;
      }
      setResultado(d);
      if (d.ok) toast.success("Fluxo executado com sucesso!");
      else toast.warning(`Fluxo executado com ${d.resumo.falhas} falha(s)`);
    } catch (e) {
      toast.error("Erro de conexão: " + String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Form */}
      <Card className="lg:col-span-1 h-fit lg:sticky lg:top-6">
        <CardContent className="p-5 space-y-3">
          <h2 className="font-bold text-forest-800">Parâmetros do teste</h2>

          <div>
            <Label htmlFor="cpf">CPF</Label>
            <Input
              id="cpf"
              value={form.cpf}
              onChange={(e) => set("cpf", e.target.value.replace(/\D/g, ""))}
              placeholder="11144477735"
              maxLength={11}
            />
          </div>

          <div>
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" value={form.nome} onChange={(e) => set("nome", e.target.value)} />
          </div>

          <div>
            <Label htmlFor="email">Email (recebe teste)</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="tel">Telefone (recebe WhatsApp)</Label>
            <Input
              id="tel"
              value={form.telefone}
              onChange={(e) => set("telefone", e.target.value.replace(/\D/g, ""))}
              placeholder="5511997440101"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="tipo">Tipo</Label>
              <select
                id="tipo"
                value={form.tipo}
                onChange={(e) => set("tipo", e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-gray-300 text-sm bg-white"
              >
                <option value="limpeza">limpeza</option>
                <option value="consulta">consulta</option>
                <option value="blindagem">blindagem</option>
              </select>
            </div>
            <div>
              <Label htmlFor="etapa">Etapa</Label>
              <select
                id="etapa"
                value={form.etapa}
                onChange={(e) => set("etapa", e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-gray-300 text-sm bg-white"
              >
                <option value="iniciado">iniciado</option>
                <option value="documentacao">documentacao</option>
                <option value="analise">analise</option>
                <option value="execucao">execucao</option>
                <option value="finalizado">finalizado</option>
                <option value="pago">pago</option>
                <option value="executada">executada</option>
                <option value="entregue">entregue</option>
                <option value="ativada">ativada</option>
                <option value="monitorando">monitorando</option>
              </select>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-3 space-y-2">
            <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Pular passos
            </p>
            {[
              { key: "skip_api_full", label: "API Full (consulta CPF — custa R$ 2,49)" },
              { key: "skip_email", label: "Resend (email)" },
              { key: "skip_whatsapp", label: "Chatwoot (WhatsApp)" },
              { key: "skip_pdf", label: "PDF Generator (n8n)" },
            ].map((c) => (
              <label key={c.key} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form[c.key as keyof typeof form] as boolean}
                  onChange={(e) =>
                    set(c.key as keyof typeof form, e.target.checked as never)
                  }
                  className="rounded text-brand-500 focus:ring-brand-500"
                />
                <span className="text-gray-700">{c.label}</span>
              </label>
            ))}
          </div>

          <Button onClick={executar} loading={loading} width="full" className="mt-2 h-11">
            <Play className="size-4" />
            Executar fluxo
          </Button>
        </CardContent>
      </Card>

      {/* Resultado */}
      <div className="lg:col-span-2 space-y-3">
        {!resultado && !loading && (
          <Card>
            <CardContent className="p-10 text-center text-gray-500">
              <p className="text-sm font-medium">
                Preencha os parâmetros e clique em &ldquo;Executar fluxo&rdquo;.
              </p>
              <p className="text-xs mt-2 text-gray-400">
                Cada execução chama API Full, Resend, Chatwoot e PDF webhook em sequência.
              </p>
            </CardContent>
          </Card>
        )}

        {loading && (
          <Card>
            <CardContent className="p-10 text-center">
              <Loader2 className="size-8 animate-spin text-brand-500 mx-auto" />
              <p className="text-sm font-medium text-gray-700 mt-3">
                Executando todos os passos...
              </p>
            </CardContent>
          </Card>
        )}

        {resultado && (
          <>
            {/* Resumo */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-forest-800">Resultado geral</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      CPF {resultado.cpf} · {new Date(resultado.timestamp).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      resultado.ok
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {resultado.ok ? "Tudo verde" : `${resultado.resumo.falhas} falha(s)`}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-4 gap-3 text-center">
                  <Stat label="Total" value={resultado.resumo.total} color="gray" />
                  <Stat label="Sucesso" value={resultado.resumo.sucesso} color="emerald" />
                  <Stat label="Falhas" value={resultado.resumo.falhas} color="red" />
                  <Stat label="Ignorados" value={resultado.resumo.ignorados} color="amber" />
                </div>
              </CardContent>
            </Card>

            {/* Steps */}
            {resultado.steps.map((s, idx) => {
              const id = `${s.step}-${idx}`;
              const isOpen = aberto[id];
              return (
                <Card key={id}>
                  <button
                    onClick={() => setAberto((a) => ({ ...a, [id]: !a[id] }))}
                    className="w-full p-4 flex items-center gap-3 text-left hover:bg-gray-50 transition rounded-2xl"
                  >
                    <StepIcon ok={s.ok} skipped={s.skipped} />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-forest-800 text-sm">{stepLabel(s.step)}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {s.skipped
                          ? "Ignorado pelo usuário"
                          : s.ok === true
                          ? `OK${s.latencia_ms ? ` · ${s.latencia_ms}ms` : ""}`
                          : s.ok === false
                          ? `Falhou${s.latencia_ms ? ` · ${s.latencia_ms}ms` : ""}`
                          : "—"}
                      </p>
                    </div>
                    {isOpen ? (
                      <ChevronDown className="size-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="size-4 text-gray-400" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="border-t border-gray-100 p-4 bg-gray-50 rounded-b-2xl">
                      <pre className="text-[11px] font-mono whitespace-pre-wrap break-words text-gray-800">
                        {JSON.stringify(s, null, 2)}
                      </pre>
                    </div>
                  )}
                </Card>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

function StepIcon({ ok, skipped }: { ok: boolean | null; skipped?: boolean }) {
  if (skipped) return <MinusCircle className="size-5 text-gray-400 shrink-0" />;
  if (ok === true) return <CheckCircle2 className="size-5 text-emerald-500 shrink-0" />;
  if (ok === false) return <XCircle className="size-5 text-red-500 shrink-0" />;
  return <MinusCircle className="size-5 text-gray-300 shrink-0" />;
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "gray" | "emerald" | "red" | "amber";
}) {
  const colors = {
    gray: "bg-gray-100 text-gray-700",
    emerald: "bg-emerald-50 text-emerald-700",
    red: "bg-red-50 text-red-700",
    amber: "bg-amber-50 text-amber-700",
  } as const;
  return (
    <div className={`rounded-lg p-3 ${colors[color]}`}>
      <p className="font-display text-2xl">{value}</p>
      <p className="text-[10px] uppercase tracking-wider font-bold">{label}</p>
    </div>
  );
}

function stepLabel(step: string): string {
  const labels: Record<string, string> = {
    api_full: "1 · API Full — consulta CPF",
    templates: "2 · Templates de email/WhatsApp",
    email: "3 · Resend — envio de email",
    whatsapp: "4 · Chatwoot — envio de WhatsApp",
    pdf_webhook: "5 · PDF Generator (n8n)",
    envs_check: "6 · Envs configuradas",
    rpc_elegibilidade: "7 · RPC Supabase elegibilidade",
  };
  return labels[step] || step;
}
