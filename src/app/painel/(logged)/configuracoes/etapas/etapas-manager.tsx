"use client";

import { useState } from "react";
import type { Etapa, EtapaCor } from "@/lib/kanban-shared";
import { corClasses } from "@/lib/kanban-shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUp, ArrowDown, Pencil, Plus, X } from "lucide-react";

const CORES: EtapaCor[] = ["brand", "amber", "emerald", "violet", "red", "gray", "forest"];

export function EtapasManager({ initial }: { initial: Etapa[] }) {
  const [etapas, setEtapas] = useState<Etapa[]>(initial);
  const [editing, setEditing] = useState<Etapa | null>(null);
  const [creating, setCreating] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  function showMsg(tipo: "ok" | "erro", texto: string) {
    setMsg({ tipo, texto });
    setTimeout(() => setMsg(null), 4000);
  }

  async function reordenar(novaOrdem: Etapa[]) {
    setEtapas(novaOrdem);
    try {
      const r = await fetch("/api/admin/etapas", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ordem: novaOrdem.map((e) => e.codigo) }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "Erro");
      showMsg("ok", "Ordem salva");
    } catch (e) {
      showMsg("erro", `Erro: ${e instanceof Error ? e.message : String(e)}`);
      setEtapas(initial); // rollback
    }
  }

  function mover(idx: number, delta: -1 | 1) {
    const novoIdx = idx + delta;
    if (novoIdx < 0 || novoIdx >= etapas.length) return;
    const nova = [...etapas];
    [nova[idx], nova[novoIdx]] = [nova[novoIdx], nova[idx]];
    reordenar(nova);
  }

  async function salvar(form: Partial<Etapa> & { codigo: string }) {
    setSalvando(true);
    try {
      const r = await fetch("/api/admin/etapas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo: form.codigo, patch: form }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "Erro");
      // recarrega
      const r2 = await fetch("/api/admin/etapas");
      const j2 = await r2.json();
      if (j2.ok) setEtapas(j2.etapas);
      setEditing(null);
      setCreating(false);
      showMsg("ok", "Etapa salva");
    } catch (e) {
      showMsg("erro", `Erro: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      {msg && (
        <div
          className={`mb-4 rounded-lg px-4 py-3 text-sm ${
            msg.tipo === "ok"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-red-50 border border-red-200 text-red-800"
          }`}
        >
          {msg.texto}
        </div>
      )}

      <div className="flex justify-end mb-4">
        <Button onClick={() => setCreating(true)} size="sm">
          <Plus className="size-4 mr-1" />
          Nova etapa
        </Button>
      </div>

      <Card>
        <CardContent className="p-2">
          <ul className="divide-y divide-gray-100">
            {etapas.map((e, idx) => {
              const c = corClasses(e.cor);
              return (
                <li key={e.codigo} className="flex items-center gap-3 px-3 py-3 hover:bg-gray-50/50">
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => mover(idx, -1)}
                      disabled={idx === 0}
                      className="text-gray-400 hover:text-brand-600 disabled:opacity-30"
                      title="Subir"
                    >
                      <ArrowUp className="size-3.5" />
                    </button>
                    <button
                      onClick={() => mover(idx, 1)}
                      disabled={idx === etapas.length - 1}
                      className="text-gray-400 hover:text-brand-600 disabled:opacity-30"
                      title="Descer"
                    >
                      <ArrowDown className="size-3.5" />
                    </button>
                  </div>

                  <span className="text-2xl">{e.emoji || "•"}</span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-forest-800">{e.nome}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${c.bg} ${c.text} font-mono uppercase`}>
                        {e.cor}
                      </span>
                      {!e.ativo && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 text-gray-600 uppercase">
                          Inativa
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">{e.descricao || <em className="text-gray-400">sem descrição</em>}</p>
                    <p className="text-[10px] text-gray-400 font-mono mt-0.5">{e.codigo}</p>
                  </div>

                  <Button variant="outline" size="sm" onClick={() => setEditing(e)}>
                    <Pencil className="size-3.5" />
                  </Button>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      {(editing || creating) && (
        <EditModal
          etapa={editing}
          salvando={salvando}
          onSalvar={salvar}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
        />
      )}
    </>
  );
}

function EditModal({
  etapa, onSalvar, onClose, salvando,
}: {
  etapa: Etapa | null;
  salvando: boolean;
  onSalvar: (e: Partial<Etapa> & { codigo: string }) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Partial<Etapa> & { codigo: string }>(
    etapa ?? { codigo: "", nome: "", emoji: "", cor: "gray", descricao: "", ativo: true }
  );

  return (
    <div className="fixed inset-0 bg-black/40 grid place-items-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-display text-xl text-forest-800">
            {etapa ? "Editar etapa" : "Nova etapa"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X className="size-5" />
          </button>
        </div>

        <div className="space-y-3">
          <FormField label="Código (slug, único, não muda depois)">
            <input
              type="text"
              value={form.codigo}
              onChange={(e) => setForm({ ...form, codigo: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") })}
              disabled={!!etapa}
              placeholder="ex: revisao_juridica"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono disabled:bg-gray-100"
            />
          </FormField>

          <FormField label="Nome (aparece no Kanban)">
            <input
              type="text"
              value={form.nome ?? ""}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="ex: Revisão jurídica"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Emoji">
              <input
                type="text"
                value={form.emoji ?? ""}
                onChange={(e) => setForm({ ...form, emoji: e.target.value })}
                maxLength={4}
                placeholder="📋"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-lg text-center"
              />
            </FormField>

            <FormField label="Cor">
              <select
                value={form.cor ?? "gray"}
                onChange={(e) => setForm({ ...form, cor: e.target.value as EtapaCor })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                {CORES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </FormField>
          </div>

          <FormField label="Descrição (opcional)">
            <textarea
              value={form.descricao ?? ""}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              rows={2}
              placeholder="ex: Equipe jurídica revisando o processo antes de protocolar"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </FormField>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={form.ativo ?? true}
              onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
              className="size-4 rounded"
            />
            <span>Etapa ativa (aparece no Kanban)</span>
          </label>
        </div>

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={() => onSalvar(form)}
            disabled={salvando || !form.codigo || !form.nome}
          >
            {salvando ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs text-gray-600 block mb-1">{label}</span>
      {children}
    </label>
  );
}
