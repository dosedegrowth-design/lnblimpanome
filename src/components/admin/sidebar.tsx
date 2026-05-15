"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Users, FileSearch, Briefcase,
  Wallet, Settings as SettingsIcon, LogOut, UserCog, Sparkles, ListTodo,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import { createClient } from "@/lib/supabase/client";

const items = [
  { href: "/painel/dashboard",     label: "Dashboard",     icon: LayoutDashboard },
  { href: "/painel/processos",     label: "Processos",     icon: Briefcase },
  { href: "/painel/limpeza",       label: "Limpeza",       icon: Sparkles },
  { href: "/painel/clientes",      label: "Clientes",      icon: Users },
  { href: "/painel/leads",         label: "Leads & CRM",   icon: ListTodo },
  { href: "/painel/consultas",     label: "Consultas",     icon: FileSearch },
  { href: "/painel/financeiro",    label: "Financeiro",    icon: Wallet },
  { href: "/painel/equipe",        label: "Equipe",        icon: UserCog },
  { href: "/painel/configuracoes", label: "Configurações", icon: SettingsIcon },
];

export function AdminSidebar({ userName, userRole }: { userName: string; userRole: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    const supa = createClient();
    await supa.auth.signOut();
    router.push("/painel/login");
    router.refresh();
  }

  return (
    <aside className="w-64 shrink-0 bg-forest-800 text-sand-100 flex flex-col h-screen sticky top-0 border-r border-forest-900/40">
      <div className="px-6 py-6 border-b border-forest-700/40">
        <Logo height={36} variant="mono" className="text-white" href="/painel/dashboard" />
      </div>

      <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
        {items.map((it) => {
          const active = pathname === it.href || pathname.startsWith(it.href + "/");
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-brand-500/15 text-white border-l-2 border-brand-400 -ml-[2px]"
                  : "text-sand-200/70 hover:bg-forest-700/50 hover:text-white"
              )}
            >
              <it.icon className={cn("size-4 transition-colors", active ? "text-brand-300" : "text-sand-200/60 group-hover:text-brand-300")} />
              {it.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-forest-700/40 p-4">
        <div className="flex items-center gap-3 mb-3 p-2 rounded-lg bg-forest-700/30">
          <div className="size-10 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 grid place-items-center text-white font-bold shadow-md">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white truncate">{userName}</p>
            <p className="text-xs text-sand-200/60 capitalize">{userRole}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-sand-200/70 hover:bg-forest-700/50 hover:text-white rounded-lg transition"
        >
          <LogOut className="size-4" />
          Sair
        </button>
      </div>
    </aside>
  );
}
