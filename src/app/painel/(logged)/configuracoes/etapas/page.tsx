import { requireAdmin, canManageUsers } from "@/lib/auth/admin";
import { redirect } from "next/navigation";
import { getEtapas } from "@/lib/kanban";
import { PageHeader } from "@/components/admin/page-header";
import { Columns3 } from "lucide-react";
import Link from "next/link";
import { EtapasManager } from "./etapas-manager";

export const dynamic = "force-dynamic";

export default async function EtapasPage() {
  const ctx = await requireAdmin();
  if (!canManageUsers(ctx.user.role)) redirect("/painel/configuracoes?denied=1");

  const etapas = await getEtapas();

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-4">
        <Link href="/painel/configuracoes" className="text-sm text-brand-600 hover:underline">
          ← Configurações
        </Link>
      </div>

      <PageHeader
        title="Etapas do Kanban"
        subtitle="Lista única de etapas. Aplicada a todos os tipos de serviço (cards diferenciados por tag)."
        icon={Columns3}
      />

      <EtapasManager initial={etapas} />
    </div>
  );
}
