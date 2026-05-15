"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Users, FileSearch, Briefcase,
  Wallet, Settings as SettingsIcon, LogOut, UserCog, Sparkles, ListTodo,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface SectionItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

interface Section {
  label: string;
  items: SectionItem[];
}

const sections: Section[] = [
  {
    label: "Menu",
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
    label: "Geral",
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
          "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all",
          active
            ? "bg-emerald-50 text-emerald-700 font-semibold"
            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium"
        )}
      >
        <it.icon className={cn("size-[18px] shrink-0", active ? "text-emerald-600" : "text-gray-400 group-hover:text-gray-700")} />
        <span className="flex-1 truncate">{it.label}</span>
        {it.badge && (
          <span className={cn(
            "text-[10px] font-bold px-1.5 py-0.5 rounded-md",
            active ? "bg-emerald-200 text-emerald-800" : "bg-gray-200 text-gray-600"
          )}>
            {it.badge}
          </span>
        )}
      </Link>
    );
  }

  return (
    <aside className="w-[244px] shrink-0 bg-white border-r border-gray-100 flex flex-col self-stretch">
      {/* Brand (estilo Donezo) */}
      <div className="px-5 py-5 flex items-center gap-2.5">
        <div className="size-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 grid place-items-center shadow-sm">
          <Sparkles className="size-5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="font-display text-lg font-bold text-gray-900 leading-none">LNB</p>
          <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">Limpa Nome Brazil</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-5 overflow-y-auto">
        {sections.map((section) => (
          <div key={section.label}>
            <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-400">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map(renderItem)}
            </div>
          </div>
        ))}

        <div>
          <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-400">
            Suporte
          </p>
          <a
            href="https://wa.me/5511997440101"
            target="_blank"
            rel="noopener"
            className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium transition-all"
          >
            <HelpCircle className="size-[18px] text-gray-400 group-hover:text-gray-700" />
            <span className="flex-1">Ajuda</span>
          </a>
          <button
            onClick={logout}
            className="w-full group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-600 hover:bg-red-50 hover:text-red-700 font-medium transition-all"
          >
            <LogOut className="size-[18px] text-gray-400 group-hover:text-red-600" />
            <span className="flex-1 text-left">Sair</span>
          </button>
        </div>
      </nav>

      {/* User card no rodapé estilo Donezo */}
      <div className="border-t border-gray-100 p-3">
        <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition cursor-default">
          <div className="size-9 rounded-full bg-gradient-to-br from-violet-400 via-fuchsia-400 to-rose-400 grid place-items-center text-white font-semibold text-xs shadow-sm shrink-0">
            {userName.trim().split(/\s+/).slice(0, 2).map((s) => s.charAt(0).toUpperCase()).join("") || "U"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900 truncate leading-tight">{userName}</p>
            <p className="text-[11px] text-gray-500 capitalize truncate">{userRole}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
