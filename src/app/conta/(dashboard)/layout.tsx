import { redirect } from "next/navigation";
import { getClienteSession } from "@/lib/auth/cliente";
import { ClienteHeader } from "@/components/cliente/header";

export default async function ClienteAreaLayout({
  children,
}: { children: React.ReactNode }) {
  const session = await getClienteSession();
  if (!session) redirect("/conta/login");

  return (
    <div className="min-h-screen bg-gray-50">
      <ClienteHeader nome={session.nome} />
      <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
