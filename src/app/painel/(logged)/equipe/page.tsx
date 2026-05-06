import { requireAdmin, canManageUsers } from "@/lib/auth/admin";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTimeBR } from "@/lib/utils";
import type { AdminUserRow } from "@/lib/supabase/types";
import { UserCog } from "lucide-react";
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
    <div className="p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Equipe"
        subtitle={`${users.length} usuário(s) do painel`}
        icon={UserCog}
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
        Pra adicionar um novo usuário: crie a conta no Supabase Auth e adicione aqui com o UUID gerado.
      </p>
    </div>
  );
}
