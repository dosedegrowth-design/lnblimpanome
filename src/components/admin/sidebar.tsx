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

interface SectionItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface Section {
  label: string;
  items: SectionItem[];
}

const sections: Section[] = [
  {
    label: "Operação",
    items: [
      { href: "/painel/dashboard",  label: "Dashboard",   icon: LayoutDashboard },
      { href: "/painel/processos",  label: "Processos",   icon: Briefcase },
      { href: "/painel/limpeza",    label: "Limpeza",     icon: Sparkles },
      { href: "/painel/clientes",   label: "Clientes",    icon: Users },
      { href: "/painel/leads",      label: "Leads & CRM", icon: ListTodo },
    ],
  },
  {
    label: "Análise",
    items: [
      { href: "/painel/consultas",  label: "Consultas",  icon: FileSearch },
      { href: "/painel/financeiro", label: "Financeiro", icon: Wallet },
    ],
  },
  {
    label: "Configuração",
    items: [
      { href: "/painel/equipe",        label: "Equipe",        icon: UserCog },
      { href: "/painel/configuracoes", label: "Configurações", icon: SettingsIcon },
    ],
  },
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

  function renderItem(it: SectionItem) {
    const active = pathname === it.href || pathname.startsWith(it.href + "/");
    return (
      <Link
        key={it.href}
        href={it.href}
        className={cn(
          "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
          active
            ? "bg-brand-500/15 text-white"
            : "text-sand-200/70 hover:bg-forest-700/50 hover:text-white"
        )}
      >
        {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-0.5 bg-brand-400 rounded-r" />}
        <it.icon className={cn("size-4 transition-colors", active ? "text-brand-300" : "text-sand-200/60 group-hover:text-brand-300")} />
        <span className="flex-1">{it.label}</span>
      </Link>
    );
  }

  return (
    <aside className="w-64 shrink-0 bg-forest-800 text-sand-100 flex flex-col h-screen sticky top-0 border-r border-forest-900/40">
      <div className="px-6 py-5 border-b border-forest-700/40">
        <Logo height={32} variant="mono" className="text-white" href="/painel/dashboard" />
      </div>

      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
        {sections.map((section) => (
          <div key={section.label}>
            <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-sand-200/40">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map(renderItem)}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-forest-700/40 p-3">
        <div className="flex items-center gap-3 mb-2 p-2.5 rounded-lg bg-forest-700/30 hover:bg-forest-700/50 transition">
          <div className="size-9 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 grid place-items-center text-white font-bold text-sm shadow-md shrink-0">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white truncate">{userName}</p>
            <p className="text-[10px] text-sand-200/50 capitalize">{userRole}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-sand-200/60 hover:bg-forest-700/40 hover:text-white rounded-lg transition"
        >
          <LogOut className="size-3.5" />
          Sair
        </button>
      </div>
    </aside>
  );
}
