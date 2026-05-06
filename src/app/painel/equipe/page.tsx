import { requireAdmin, canManageUsers } from "@/lib/auth/admin";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTimeBR } from "@/lib/utils";
import type { AdminUserRow } from "@/lib/supabase/types";
import { UserCog } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function EquipePage() {
  const ctx = await requireAdmin();
  if (!canManageUsers(ctx.user.role)) redirect("/painel/dashboard?denied=1");

  const supa = await createClient();
  const { data } = await supa
    .from("lnb_admin_users")
    .select("*")
    .order("created_at", { ascending: false });

  const users = (data ?? []) as AdminUserRow[];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-4xl text-forest-800">Equipe</h1>
          <p className="text-gray-500 mt-1">{users.length} usuários do painel</p>
        </div>
        <div className="size-12 rounded-xl bg-brand-50 grid place-items-center">
          <UserCog className="size-5 text-brand-600" />
        </div>
      </header>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-sand-50 border-b border-gray-200">
              <tr className="text-left text-gray-500 text-xs uppercase tracking-wider">
                <th className="px-5 py-4 font-semibold">Nome</th>
                <th className="px-5 py-4 font-semibold">Email</th>
                <th className="px-5 py-4 font-semibold">Papel</th>
                <th className="px-5 py-4 font-semibold">Status</th>
                <th className="px-5 py-4 font-semibold">Último login</th>
                <th className="px-5 py-4 font-semibold">Criado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-sand-50/40 transition-colors">
                  <td className="px-5 py-4 flex items-center gap-3">
                    <div className="size-9 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 grid place-items-center text-white font-bold text-sm shrink-0">
                      {u.nome.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-semibold text-forest-800">{u.nome}</span>
                  </td>
                  <td className="px-5 py-4 text-gray-700">{u.email}</td>
                  <td className="px-5 py-4">
                    <Badge variant={u.role === "owner" ? "brand" : u.role === "admin" ? "forest" : "default"}>
                      {u.role}
                    </Badge>
                  </td>
                  <td className="px-5 py-4">
                    <Badge variant={u.ativo ? "success" : "danger"}>
                      {u.ativo ? "ativo" : "inativo"}
                    </Badge>
                  </td>
                  <td className="px-5 py-4 text-gray-500">{formatDateTimeBR(u.last_login_at)}</td>
                  <td className="px-5 py-4 text-gray-500">{formatDateTimeBR(u.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="mt-4 text-xs text-gray-400">
        Pra adicionar usuário: criar conta no Supabase Auth e inserir registro em{" "}
        <code className="bg-sand-100 px-1.5 py-0.5 rounded">lnb_admin_users</code>.
      </p>
    </div>
  );
}
