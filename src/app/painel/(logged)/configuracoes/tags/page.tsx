import { requireAdmin, canManageUsers } from "@/lib/auth/admin";
import { redirect } from "next/navigation";
import { getTags } from "@/lib/kanban";
import { getProdutos } from "@/lib/produtos";
import { PageHeader } from "@/components/admin/page-header";
import { Tag } from "lucide-react";
import Link from "next/link";
import { TagsManager } from "./tags-manager";

export const dynamic = "force-dynamic";

export default async function TagsPage() {
  const ctx = await requireAdmin();
  if (!canManageUsers(ctx.user.role)) redirect("/painel/configuracoes?denied=1");

  const [tags, produtos] = await Promise.all([getTags(), getProdutos()]);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-4">
        <Link href="/painel/configuracoes" className="text-sm text-brand-600 hover:underline">
          ← Configurações
        </Link>
      </div>

      <PageHeader
        title="Tags de Serviço"
        subtitle="Identificação visual de cada card no Kanban (cor, emoji, vínculo com produto)"
        icon={Tag}
      />

      <TagsManager initial={tags} produtos={produtos} />
    </div>
  );
}
