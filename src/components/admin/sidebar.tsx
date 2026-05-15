"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Users, FileSearch, Briefcase,
  Wallet, Settings as SettingsIcon, LogOut, UserCog, Sparkles, ListTodo,
  ChevronDown,
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
      { href: "/painel/leads",      label: "Leads",       icon: ListTodo },
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
          "group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all",
          active
            ? "bg-gray-100 text-gray-900 font-semibold"
            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium"
        )}
      >
        <it.icon className={cn("size-[18px] shrink-0", active ? "text-gray-900" : "text-gray-400 group-hover:text-gray-700")} />
        <span className="flex-1 truncate">{it.label}</span>
      </Link>
    );
  }

  const initials = userName.trim().split(/\s+/).slice(0, 2).map((s) => s.charAt(0).toUpperCase()).join("");

  return (
    <aside className="w-64 shrink-0 bg-white border-r border-gray-100 flex flex-col h-screen sticky top-0">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-gray-100">
        <Logo height={28} className="text-gray-900" href="/painel/dashboard" />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
        {sections.map((section) => (
          <div key={section.label}>
            <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map(renderItem)}
            </div>
          </div>
        ))}
      </nav>

      {/* User profile */}
      <div className="border-t border-gray-100 p-3">
        <div className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50 transition group cursor-default">
          <div className="size-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 grid place-items-center text-white font-semibold text-xs shadow-sm shrink-0">
            {initials || "U"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900 truncate leading-tight">{userName}</p>
            <p className="text-[11px] text-gray-500 capitalize">{userRole}</p>
          </div>
          <button
            onClick={logout}
            className="size-7 grid place-items-center rounded-md text-gray-400 hover:bg-white hover:text-gray-700 transition"
            title="Sair"
          >
            <LogOut className="size-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
