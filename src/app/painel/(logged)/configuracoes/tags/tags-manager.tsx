"use client";

import { useState } from "react";
import type { Tag, EtapaCor } from "@/lib/kanban-shared";
import type { ProdutosMap } from "@/lib/produtos-shared";
import { corClasses } from "@/lib/kanban-shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUp, ArrowDown, Pencil, Plus, X } from "lucide-react";

const CORES: EtapaCor[] = ["brand", "amber", "emerald", "violet", "red", "gray", "forest"];

export function TagsManager({ initial, produtos }: { initial: Tag[]; produtos: ProdutosMap }) {
  const [tags, setTags] = useState<Tag[]>(initial);
  const [editing, setEditing] = useState<Tag | null>(null);
  const [creating, setCreating] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  const codigosProdutos = Object.keys(produtos);

  function showMsg(tipo: "ok" | "erro", texto: string) {
    setMsg({ tipo, texto });
    setTimeout(() => setMsg(null), 4000);
  }

  async function reordenar(novaOrdem: Tag[]) {
    setTags(novaOrdem);
    try {
      const r = await fetch("/api/admin/tags", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ordem: novaOrdem.map((t) => t.codigo) }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "Erro");
      showMsg("ok", "Ordem salva");
    } catch (e) {
      showMsg("erro", `Erro: ${e instanceof Error ? e.message : String(e)}`);
      setTags(initial);
    }
  }

  function mover(idx: number, delta: -1 | 1) {
    const novoIdx = idx + delta;
    if (novoIdx < 0 || novoIdx >= tags.length) return;
    const nova = [...tags];
    [nova[idx], nova[novoIdx]] = [nova[novoIdx], nova[idx]];
    reordenar(nova);
  }

  async function salvar(form: Partial<Tag> & { codigo: string }) {
    setSalvando(true);
    try {
      const r = await fetch("/api/admin/tags", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo: form.codigo, patch: form }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "Erro");
      const r2 = await fetch("/api/admin/tags");
      const j2 = await r2.json();
      if (j2.ok) setTags(j2.tags);
      setEditing(null);
      setCreating(false);
      showMsg("ok", "Tag salva");
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
          Nova tag
        </Button>
      </div>

      <Card>
        <CardContent className="p-2">
          <ul className="divide-y divide-gray-100">
            {tags.map((t, idx) => {
              const c = corClasses(t.cor);
              return (
                <li key={t.codigo} className="flex items-center gap-3 px-3 py-3 hover:bg-gray-50/50">
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => mover(idx, -1)}
                      disabled={idx === 0}
                      className="text-gray-400 hover:text-brand-600 disabled:opacity-30"
                    >
                      <ArrowUp className="size-3.5" />
                    </button>
                    <button
                      onClick={() => mover(idx, 1)}
                      disabled={idx === tags.length - 1}
                      className="text-gray-400 hover:text-brand-600 disabled:opacity-30"
                    >
                      <ArrowDown className="size-3.5" />
                    </button>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${c.bg} ${c.text} ${c.border} border text-sm font-semibold`}
                  >
                    {t.emoji && <span>{t.emoji}</span>}
                    <span>{t.nome}</span>
                  </span>

                  <div className="flex-1 min-w-0 ml-2">
                    <p className="text-xs text-gray-500">
                      {t.produto_codigo ? (
                        <>
                          Vinculada a <strong>{produtos[t.produto_codigo as keyof ProdutosMap]?.nome ?? t.produto_codigo}</strong>
                        </>
                      ) : (
                        <em className="text-gray-400">Sem vínculo com produto</em>
                      )}
                    </p>
                    <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                      {t.codigo} · {t.processos_count} processo{t.processos_count === 1 ? "" : "s"}
                    </p>
                  </div>

                  {!t.ativo && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 text-gray-600 uppercase">
                      Inativa
                    </span>
                  )}

                  <Button variant="outline" size="sm" onClick={() => setEditing(t)}>
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
          tag={editing}
          codigosProdutos={codigosProdutos}
          produtos={produtos}
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
  tag, codigosProdutos, produtos, onSalvar, onClose, salvando,
}: {
  tag: Tag | null;
  codigosProdutos: string[];
  produtos: ProdutosMap;
  salvando: boolean;
  onSalvar: (t: Partial<Tag> & { codigo: string }) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Partial<Tag> & { codigo: string }>(
    tag ?? { codigo: "", nome: "", emoji: "", cor: "gray", produto_codigo: null, ativo: true }
  );

  return (
    <div className="fixed inset-0 bg-black/40 grid place-items-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-display text-xl text-forest-800">
            {tag ? "Editar tag" : "Nova tag"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X className="size-5" />
          </button>
        </div>

        <div className="space-y-3">
          <FormField label="Código (slug)">
            <input
              type="text"
              value={form.codigo}
              onChange={(e) => setForm({ ...form, codigo: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") })}
              disabled={!!tag}
              placeholder="ex: limpeza_premium"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono disabled:bg-gray-100"
            />
          </FormField>

          <FormField label="Nome (aparece no card)">
            <input
              type="text"
              value={form.nome ?? ""}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="ex: Limpeza Premium"
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
                placeholder="✨"
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

          <FormField label="Vincular ao produto (opcional)">
            <select
              value={form.produto_codigo ?? ""}
              onChange={(e) => setForm({ ...form, produto_codigo: e.target.value || null })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">— Sem vínculo —</option>
              {codigosProdutos.map((c) => (
                <option key={c} value={c}>{produtos[c as keyof ProdutosMap]?.nome ?? c}</option>
              ))}
            </select>
          </FormField>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={form.ativo ?? true}
              onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
              className="size-4 rounded"
            />
            <span>Tag ativa</span>
          </label>
        </div>

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => onSalvar(form)} disabled={salvando || !form.codigo || !form.nome}>
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
