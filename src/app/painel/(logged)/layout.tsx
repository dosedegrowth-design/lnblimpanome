import { ReactNode } from "react";
import { requireAdmin } from "@/lib/auth/admin";
import { AdminSidebar } from "@/components/admin/sidebar";
import { AdminTopbar } from "@/components/admin/topbar";

/**
 * Layout DAS PÁGINAS LOGADAS do /painel.
 * Estilo Healthink/Donezo/Sullivan: app inteiro dentro de um card branco
 * arredondado, com fundo cinza mais escuro pra contraste.
 */
export default async function LoggedLayout({ children }: { children: ReactNode }) {
  const ctx = await requireAdmin();

  return (
    <div className="min-h-screen bg-[#e4e5e7] p-3 sm:p-4 lg:p-5">
      <div className="flex min-h-[calc(100vh-1.5rem)] sm:min-h-[calc(100vh-2rem)] lg:min-h-[calc(100vh-2.5rem)] bg-white rounded-2xl shadow-[0_4px_24px_rgba(16,24,40,0.08),0_1px_2px_rgba(16,24,40,0.04)] overflow-hidden">
        <AdminSidebar userName={ctx.user.nome} userRole={ctx.user.role} />
        <div className="flex-1 min-w-0 flex flex-col">
          <AdminTopbar userName={ctx.user.nome} userEmail={ctx.user.email} />
          <main className="flex-1 min-w-0 overflow-y-auto bg-[#fafbfc]">{children}</main>
        </div>
      </div>
    </div>
  );
}
