"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { LogOut, LayoutDashboard, FileText, ShieldCheck, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/conta/dashboard",  label: "Início",      icon: LayoutDashboard },
  { href: "/conta/relatorio",  label: "Relatório",   icon: FileText },
  { href: "/conta/blindagem",  label: "Blindagem",   icon: ShieldCheck },
  { href: "/conta/pagamentos", label: "Pagamentos",  icon: Receipt },
];

export function ClienteHeader({ nome }: { nome: string }) {
  const path = usePathname();
  const router = useRouter();
  async function logout() {
    await fetch("/api/cliente/logout", { method: "POST" });
    router.push("/conta/login");
    router.refresh();
  }
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Logo height={36} href="/conta/dashboard" />
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-sm text-gray-600">Olá, <strong>{nome.split(" ")[0]}</strong></span>
            <button onClick={logout} className="text-gray-500 hover:text-gray-900 p-2" aria-label="Sair">
              <LogOut className="size-5" />
            </button>
          </div>
        </div>
        <nav className="flex gap-1 -mb-px">
          {items.map((it) => {
            const active = path === it.href || path.startsWith(it.href + "/");
            return (
              <Link
                key={it.href}
                href={it.href}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition",
                  active
                    ? "border-brand-500 text-brand-700"
                    : "border-transparent text-gray-500 hover:text-gray-900"
                )}
              >
                <it.icon className="size-4" />
                <span className="hidden sm:inline">{it.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
