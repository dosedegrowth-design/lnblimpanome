"use client";

import { useState } from "react";
import type { ProdutosMap, ProdutoCodigo } from "@/lib/produtos-shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatBRL } from "@/lib/utils";

export function ProdutosForm({ initial, modoTeste }: { initial: ProdutosMap; modoTeste: boolean }) {
  const [produtos, setProdutos] = useState<ProdutosMap>(initial);
  const [salvando, setSalvando] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  const codigos = Object.keys(produtos).sort(
    (a, b) => (produtos[a as ProdutoCodigo]?.ordem ?? 999) - (produtos[b as ProdutoCodigo]?.ordem ?? 999)
  ) as ProdutoCodigo[];

  function update(codigo: ProdutoCodigo, campo: string, valor: string | number) {
    setProdutos((p) => ({
      ...p,
      [codigo]: { ...p[codigo], [campo]: valor },
    }));
  }

  async function salvar(codigo: ProdutoCodigo) {
    setSalvando(codigo);
    setMensagem(null);
    const p = produtos[codigo];
    try {
      const r = await fetch("/api/admin/produtos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codigo,
          patch: {
            preco_real: p.preco_real,
            preco_teste: p.preco_teste,
            desconto_consulta: p.desconto_consulta,
            custo_api: p.custo_api,
          },
        }),
      });
      const json = await r.json();
      if (!r.ok || !json.ok) {
        throw new Error(json.error || `HTTP ${r.status}`);
      }
      setMensagem({ tipo: "ok", texto: `✅ ${p.nome} salvo com sucesso` });
    } catch (e) {
      setMensagem({ tipo: "erro", texto: `❌ Erro ao salvar: ${e instanceof Error ? e.message : String(e)}` });
    } finally {
      setSalvando(null);
      setTimeout(() => setMensagem(null), 4000);
    }
  }

  return (
    <>
      {mensagem && (
        <div
          className={`mb-4 rounded-lg px-4 py-3 text-sm ${
            mensagem.tipo === "ok"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-red-50 border border-red-200 text-red-800"
          }`}
        >
          {mensagem.texto}
        </div>
      )}

      <div className="space-y-3">
        {codigos.map((codigo) => {
          const p = produtos[codigo];
          const valorVisivel = modoTeste ? p.preco_teste : p.preco_real;
          const podeTerDesconto = codigo === "limpeza_cpf" || codigo === "limpeza_cnpj";
          return (
            <Card key={codigo}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-display text-lg text-forest-800">{p.nome}</h3>
                    <p className="text-xs text-gray-500 font-mono">{codigo}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Valor cobrado atualmente</p>
                    <p className="font-display text-xl text-brand-700">{formatBRL(valorVisivel)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <Field
                    label="Preço real (R$)"
                    value={p.preco_real}
                    onChange={(v) => update(codigo, "preco_real", v)}
                  />
                  <Field
                    label="Preço teste (R$)"
                    value={p.preco_teste}
                    onChange={(v) => update(codigo, "preco_teste", v)}
                    helper="Cobrado quando modo teste ativo"
                  />
                  <Field
                    label="Desconto consulta (R$)"
                    value={p.desconto_consulta}
                    onChange={(v) => update(codigo, "desconto_consulta", v)}
                    helper={podeTerDesconto ? "Aplicado se houve consulta paga ≤15d" : "Não aplicável"}
                    disabled={!podeTerDesconto}
                  />
                  <Field
                    label="Custo do provedor (R$)"
                    value={p.custo_api}
                    onChange={(v) => update(codigo, "custo_api", v)}
                    helper="Custo unitário do provedor (margem)"
                  />
                </div>

                <div className="flex justify-end mt-4">
                  <Button
                    onClick={() => salvar(codigo)}
                    disabled={salvando === codigo}
                    size="sm"
                  >
                    {salvando === codigo ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}

function Field({
  label, value, onChange, helper, disabled,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  helper?: string;
  disabled?: boolean;
}) {
  return (
    <label className={`block ${disabled ? "opacity-50" : ""}`}>
      <span className="text-xs text-gray-600 block mb-1">{label}</span>
      <input
        type="number"
        step="0.01"
        min="0"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        disabled={disabled}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-300"
      />
      {helper && <span className="text-[10px] text-gray-400 block mt-0.5">{helper}</span>}
    </label>
  );
}
