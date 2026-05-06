"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Edit2, X, Save, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { formatDateTimeBR } from "@/lib/utils";
import type { AdminUserRow, AdminRole } from "@/lib/supabase/types";

interface Props {
  users: AdminUserRow[];
  currentUserId: string;
  isOwner: boolean;
}

const ROLES: AdminRole[] = ["owner", "admin", "consultor", "viewer"];

export function EquipeManager({ users, currentUserId, isOwner }: Props) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div>
      {isOwner && (
        <div className="mb-4 flex justify-end">
          <Button onClick={() => setAdding(true)} size="sm" className="gap-2">
            <UserPlus className="size-4" />
            Adicionar usuário
          </Button>
        </div>
      )}

      {adding && (
        <AddForm onClose={() => setAdding(false)} onDone={() => { setAdding(false); router.refresh(); }} />
      )}

      <div className="overflow-x-auto -mx-6">
        <table className="w-full text-sm">
          <thead className="bg-sand-50 border-y border-gray-200">
            <tr className="text-left text-gray-500 text-xs uppercase tracking-wider">
              <th className="px-6 py-3 font-semibold">Nome</th>
              <th className="px-6 py-3 font-semibold">Email</th>
              <th className="px-6 py-3 font-semibold">Papel</th>
              <th className="px-6 py-3 font-semibold">Status</th>
              <th className="px-6 py-3 font-semibold">Último login</th>
              {isOwner && <th className="px-6 py-3 font-semibold">Ações</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((u) =>
              editingId === u.id ? (
                <EditRow
                  key={u.id}
                  user={u}
                  isSelf={u.id === currentUserId}
                  onCancel={() => setEditingId(null)}
                  onDone={() => { setEditingId(null); router.refresh(); }}
                />
              ) : (
                <tr key={u.id} className="hover:bg-sand-50/40 transition-colors">
                  <td className="px-6 py-3 flex items-center gap-3">
                    <div className="size-9 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 grid place-items-center text-white font-bold text-sm shrink-0">
                      {u.nome.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-semibold text-forest-800">{u.nome}</span>
                    {u.id === currentUserId && <Badge variant="outline">Você</Badge>}
                  </td>
                  <td className="px-6 py-3 text-gray-700">{u.email}</td>
                  <td className="px-6 py-3">
                    <Badge variant={u.role === "owner" ? "brand" : u.role === "admin" ? "forest" : "default"}>
                      {u.role}
                    </Badge>
                  </td>
                  <td className="px-6 py-3">
                    <Badge variant={u.ativo ? "success" : "danger"}>
                      {u.ativo ? "ativo" : "inativo"}
                    </Badge>
                  </td>
                  <td className="px-6 py-3 text-gray-500 text-xs whitespace-nowrap">
                    {formatDateTimeBR(u.last_login_at)}
                  </td>
                  {isOwner && (
                    <td className="px-6 py-3">
                      <button
                        onClick={() => setEditingId(u.id)}
                        className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-semibold"
                      >
                        <Edit2 className="size-3.5" /> Editar
                      </button>
                    </td>
                  )}
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AddForm({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ user_id: "", email: "", nome: "", role: "viewer" as AdminRole });
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) {
        toast.error(d.error || "Erro");
        return;
      }
      toast.success("Usuário adicionado");
      onDone();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="bg-brand-50/40 border border-brand-200 rounded-xl p-5 mb-4 space-y-3">
      <p className="font-bold text-forest-800 mb-2">Adicionar usuário</p>
      <p className="text-xs text-gray-500">
        Crie a conta primeiro no Supabase Auth (Authentication → Add user) e cole o UUID aqui.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label>UUID auth.users *</Label>
          <Input required value={form.user_id} onChange={(e) => setForm({ ...form, user_id: e.target.value })}
            placeholder="00000000-0000-0000-0000-000000000000" />
        </div>
        <div>
          <Label>Email *</Label>
          <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div>
          <Label>Nome *</Label>
          <Input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
        </div>
        <div>
          <Label>Papel</Label>
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as AdminRole })}
            className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm"
          >
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose} size="sm">
          <X className="size-3.5" /> Cancelar
        </Button>
        <Button type="submit" loading={loading} size="sm" className="gap-2">
          <Save className="size-3.5" /> Adicionar
        </Button>
      </div>
    </form>
  );
}

function EditRow({
  user, isSelf, onCancel, onDone,
}: { user: AdminUserRow; isSelf: boolean; onCancel: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ nome: user.nome, role: user.role, ativo: user.ativo });
  const [loading, setLoading] = useState(false);

  async function save() {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          role: form.role,
          ativo: form.ativo,
          nome: form.nome,
        }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) {
        toast.error(d.error || "Erro ao salvar");
        return;
      }
      toast.success("Usuário atualizado");
      onDone();
    } finally {
      setLoading(false);
    }
  }

  return (
    <tr className="bg-brand-50/40">
      <td className="px-6 py-3">
        <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="h-8 text-sm" />
      </td>
      <td className="px-6 py-3 text-gray-700 text-sm">{user.email}</td>
      <td className="px-6 py-3">
        <select
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value as AdminRole })}
          className="h-8 px-2 rounded-md border border-gray-200 bg-white text-xs font-semibold"
        >
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </td>
      <td className="px-6 py-3">
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.ativo}
            onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
            className="rounded text-brand-500 focus:ring-brand-500"
          />
          <span className="text-xs">{form.ativo ? "Ativo" : "Inativo"}</span>
        </label>
      </td>
      <td className="px-6 py-3 text-xs text-gray-400">
        {isSelf && <span className="text-amber-600">Você não pode se rebaixar/desativar como único owner</span>}
      </td>
      <td className="px-6 py-3 flex gap-2">
        <button onClick={save} disabled={loading} className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700">
          <Save className="size-3.5" /> Salvar
        </button>
        <button onClick={onCancel} className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
          <X className="size-3.5" /> Cancelar
        </button>
      </td>
    </tr>
  );
}
