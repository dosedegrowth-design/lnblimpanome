import { requireAdmin, canManageUsers } from "@/lib/auth/admin";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTimeBR } from "@/lib/utils";
import type { AdminUserRow } from "@/lib/supabase/types";

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
    <div className="p-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Equipe</h1>
        <p className="text-gray-500 mt-1">{users.length} usuários do painel</p>
      </header>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left text-gray-500 text-xs uppercase tracking-wide">
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Papel</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Último login</th>
                <th className="px-4 py-3 font-medium">Criado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 font-medium text-gray-900">{u.nome}</td>
                  <td className="px-4 py-3 text-gray-700">{u.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant={u.role === "owner" ? "brand" : "default"}>{u.role}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={u.ativo ? "success" : "danger"}>
                      {u.ativo ? "ativo" : "inativo"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatDateTimeBR(u.last_login_at)}</td>
                  <td className="px-4 py-3 text-gray-500">{formatDateTimeBR(u.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="mt-4 text-xs text-gray-400">
        Pra adicionar usuário: criar conta no Supabase Auth (Painel → Authentication) e inserir
        registro em <code className="bg-gray-100 px-1.5 py-0.5 rounded">lnb_admin_users</code> com o UUID retornado.
      </p>
    </div>
  );
}
