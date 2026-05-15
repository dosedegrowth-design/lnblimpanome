"use client";
import { Bell, Search, Mail } from "lucide-react";

interface Props {
  userName: string;
  userEmail: string;
}

export function AdminTopbar({ userName, userEmail }: Props) {
  const initials = userName.trim().split(/\s+/).slice(0, 2).map((s) => s.charAt(0).toUpperCase()).join("") || "U";

  return (
    <header className="bg-white border-b border-gray-100 h-16 px-6 sm:px-8 flex items-center gap-4 shrink-0">
      {/* Search central (estilo Donezo) */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400 pointer-events-none" />
          <input
            type="search"
            placeholder="Pesquisar..."
            className="w-full pl-9 pr-12 py-2 rounded-lg bg-gray-50 border border-transparent focus:bg-white focus:border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-200/50 text-sm placeholder:text-gray-400"
          />
          <kbd className="hidden sm:inline-flex absolute right-2 top-1/2 -translate-y-1/2 items-center gap-0.5 text-[10px] font-medium text-gray-400 bg-white border border-gray-200 rounded px-1.5 py-0.5">
            ⌘F
          </kbd>
        </div>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <button className="size-9 grid place-items-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition relative">
          <Mail className="size-4" />
        </button>
        <button className="size-9 grid place-items-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition relative">
          <Bell className="size-4" />
          <span className="absolute top-1.5 right-1.5 size-1.5 bg-red-500 rounded-full"></span>
        </button>

        <div className="hidden sm:flex items-center gap-2.5 ml-2 pl-3 border-l border-gray-100">
          <div className="text-right hidden md:block">
            <p className="text-sm font-semibold text-gray-900 leading-tight">{userName}</p>
            <p className="text-[11px] text-gray-500 truncate max-w-[160px]">{userEmail}</p>
          </div>
          <div className="size-9 rounded-full bg-gradient-to-br from-violet-400 via-fuchsia-400 to-rose-400 grid place-items-center text-white font-semibold text-xs shadow-sm">
            {initials}
          </div>
        </div>
      </div>
    </header>
  );
}
