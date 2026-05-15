import { ReactNode } from "react";
import { requireAdmin } from "@/lib/auth/admin";
import { AdminSidebar } from "@/components/admin/sidebar";
import { AdminTopbar } from "@/components/admin/topbar";

/**
 * Layout DAS PÁGINAS LOGADAS do /painel.
 */
export default async function LoggedLayout({ children }: { children: ReactNode }) {
  const ctx = await requireAdmin();

  return (
    <div className="flex min-h-screen bg-[#f1f2f4]">
      <AdminSidebar userName={ctx.user.nome} userRole={ctx.user.role} />
      <div className="flex-1 min-w-0 flex flex-col">
        <AdminTopbar userName={ctx.user.nome} userEmail={ctx.user.email} />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
