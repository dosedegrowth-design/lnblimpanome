import { redirect } from "next/navigation";
import { getClienteSession } from "@/lib/auth/cliente";

export default async function ContaIndex() {
  const s = await getClienteSession();
  redirect(s ? "/conta/dashboard" : "/conta/login");
}
