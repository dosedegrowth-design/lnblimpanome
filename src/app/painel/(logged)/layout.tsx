import { ReactNode } from "react";
import { requireAdmin } from "@/lib/auth/admin";
import { AdminSidebar } from "@/components/admin/sidebar";

/**
 * Layout DAS PÁGINAS LOGADAS do /painel.
 *
 * Como funciona:
 * - `requireAdmin()` redireciona pra /painel/login se não logado
 * - Renderiza sidebar + children
 *
 * Não cobre /painel/login (route fora do group `(logged)`)
 */
export default async function LoggedLayout({ children }: { children: ReactNode }) {
  const ctx = await requireAdmin();

  return (
    <div className="flex min-h-screen bg-[#f1f2f4]">
      <AdminSidebar userName={ctx.user.nome} userRole={ctx.user.role} />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
