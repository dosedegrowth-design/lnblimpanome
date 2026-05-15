import { requireAdmin, canManageUsers } from "@/lib/auth/admin";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import type { AdminUserRow } from "@/lib/supabase/types";
import { PageHeader } from "@/components/admin/page-header";
import { EquipeManager } from "./equipe-manager";

export const dynamic = "force-dynamic";

export default async function EquipePage() {
  const ctx = await requireAdmin();
  if (!canManageUsers(ctx.user.role)) redirect("/painel/dashboard?denied=1");

  const supa = await createClient();
  const { data } = await supa.rpc("admin_users_list");
  const users = (data ?? []) as AdminUserRow[];

  return (
    <div className="p-6 sm:p-8 max-w-[1400px] mx-auto">
      <PageHeader
        title="Equipe"
        subtitle={`${users.length} usuário(s) do painel`}
      />

      <Card>
        <CardContent className="p-6">
          <EquipeManager
            users={users}
            currentUserId={ctx.authId}
            isOwner={ctx.user.role === "owner"}
          />
        </CardContent>
      </Card>

      <p className="mt-4 text-xs text-gray-400">
        Para adicionar novo usuário: crie a conta no Supabase Auth e adicione aqui com o UUID.
      </p>
    </div>
  );
}
