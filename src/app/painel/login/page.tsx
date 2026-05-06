import { redirect } from "next/navigation";
import { getAdminContext } from "@/lib/auth/admin";
import { LoginForm } from "./login-form";

/**
 * Página de login admin.
 * - Se já logado → redireciona pra dashboard (SSR redirect)
 * - Se não → mostra form de login
 */
export default async function AdminLoginPage() {
  const ctx = await getAdminContext();
  if (ctx) redirect("/painel/dashboard");

  return <LoginForm />;
}
