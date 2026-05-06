"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/#como-funciona", label: "Como Funciona" },
  { href: "/#servicos",      label: "Serviços" },
  { href: "/#blindagem",     label: "Blindagem" },
  { href: "/#faq",           label: "Dúvidas" },
];

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full transition-all duration-300",
        scrolled
          ? "border-b border-gray-200 bg-white/85 backdrop-blur-md shadow-sm"
          : "bg-transparent"
      )}
    >
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 py-3">
        <Logo height={42} priority />

        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-gray-700">
          {navItems.map((it) => (
            <Link key={it.href} href={it.href} className="hover:text-brand-600 transition-colors">
              {it.label}
            </Link>
          ))}
          <Link href="/conta" className="hover:text-brand-600 transition-colors">
            Área do Cliente
          </Link>
        </nav>

        <div className="hidden md:flex items-center">
          <Link
            href="/consultar"
            className="inline-flex items-center justify-center rounded-lg bg-brand-500 hover:bg-brand-600 px-5 h-10 text-sm font-semibold text-white shadow-md shadow-brand-500/25 hover:shadow-lg hover:-translate-y-0.5 transition-all"
          >
            Consultar agora
          </Link>
        </div>

        <button
          onClick={() => setOpen(!open)}
          className="md:hidden p-2 rounded-md hover:bg-gray-100"
          aria-label="Menu"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <nav className="px-4 py-4 flex flex-col gap-3 text-sm font-medium">
            {navItems.map((it) => (
              <Link key={it.href} href={it.href} onClick={() => setOpen(false)} className="py-2 text-gray-700 hover:text-brand-600">
                {it.label}
              </Link>
            ))}
            <Link href="/conta" onClick={() => setOpen(false)} className="py-2 text-gray-700 hover:text-brand-600">
              Área do Cliente
            </Link>
            <Link href="/consultar" onClick={() => setOpen(false)} className="mt-2 text-center rounded-lg bg-brand-500 hover:bg-brand-600 text-white py-3 font-semibold">
              Consultar agora
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
