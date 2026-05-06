import { ReactNode } from "react";
import { headers } from "next/headers";
import { getAdminContext } from "@/lib/auth/admin";
import { AdminSidebar } from "@/components/admin/sidebar";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const hdrs = await headers();
  const path = hdrs.get("x-pathname") || "";

  // Página de login não precisa de chrome
  if (path.includes("/painel/login")) {
    return <>{children}</>;
  }

  const ctx = await getAdminContext();
  if (!ctx) return <>{children}</>; // middleware redirect handles

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar userName={ctx.user.nome} userRole={ctx.user.role} />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
