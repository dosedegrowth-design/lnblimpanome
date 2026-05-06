import { ReactNode } from "react";
import { getAdminContext } from "@/lib/auth/admin";
import { AdminSidebar } from "@/components/admin/sidebar";

/**
 * Layout do painel admin (cobre TODA rota /painel/*).
 *
 * Como funciona:
 * - Quando NÃO há ctx (não logado OU está na /painel/login):
 *   renderiza só o children (sem sidebar). A página de login tem
 *   layout próprio fullscreen e fica visualmente correta.
 * - Quando há ctx: renderiza com sidebar + children.
 *
 * Não usar headers() pra detectar pathname — esse header não existe
 * em produção no Next.js. O middleware já cuida de redirect quando
 * não autenticado → /painel/login.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const ctx = await getAdminContext();

  if (!ctx) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar userName={ctx.user.nome} userRole={ctx.user.role} />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
