"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X, Search } from "lucide-react";
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

  function close() { setOpen(false); }

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full transition-all duration-300",
        scrolled || open
          ? "border-b border-gray-200 bg-white/95 backdrop-blur-md shadow-sm"
          : "bg-transparent"
      )}
    >
      <div className="mx-auto flex h-16 sm:h-18 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 py-2 sm:py-3 gap-3">
        <Logo height={36} priority />

        <nav className="hidden md:flex items-center gap-7 text-sm font-semibold text-forest-800">
          {navItems.map((it) => (
            <Link key={it.href} href={it.href} className="hover:text-brand-600 transition-colors">
              {it.label}
            </Link>
          ))}
          <Link href="/conta" className="hover:text-brand-600 transition-colors">
            Área do Cliente
          </Link>
        </nav>

        <div className="hidden md:flex items-center gap-2">
          <Link
            href="/consultar"
            aria-label="Consultar CPF"
            className="inline-flex items-center justify-center rounded-lg border border-brand-200 bg-brand-50 hover:bg-brand-100 hover:border-brand-300 size-10 text-brand-700 transition-all"
            title="Consultar CPF"
          >
            <Search className="size-4" />
          </Link>
          <Link
            href="/consultar"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 hover:bg-brand-600 px-5 h-10 text-sm font-bold text-white shadow-md shadow-brand-500/25 hover:shadow-lg hover:-translate-y-0.5 transition-all"
          >
            Consultar agora
          </Link>
        </div>

        <button
          onClick={() => setOpen(!open)}
          className="md:hidden p-2 -mr-2 rounded-md hover:bg-gray-100"
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          aria-expanded={open}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <nav className="px-4 py-4 flex flex-col gap-1 text-sm font-semibold">
            {navItems.map((it) => (
              <Link key={it.href} href={it.href} onClick={close} className="py-3 px-2 text-forest-800 hover:text-brand-600 hover:bg-gray-50 rounded-md">
                {it.label}
              </Link>
            ))}
            <Link href="/conta" onClick={close} className="py-3 px-2 text-forest-800 hover:text-brand-600 hover:bg-gray-50 rounded-md">
              Área do Cliente
            </Link>
            <Link href="/consultar" onClick={close} className="mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white py-3 font-bold shadow-md shadow-brand-500/25">
              <Search className="size-4" />
              Consultar agora
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
