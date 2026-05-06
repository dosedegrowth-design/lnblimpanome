import { redirect } from "next/navigation";
import { getAdminContext } from "@/lib/auth/admin";

/**
 * /painel → redireciona pra dashboard se logado, senão pra login.
 */
export default async function PainelIndex() {
  const ctx = await getAdminContext();
  redirect(ctx ? "/painel/dashboard" : "/painel/login");
}
