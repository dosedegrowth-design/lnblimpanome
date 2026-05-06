import Link from "next/link";
import { Logo } from "@/components/brand/logo";

const WHATSAPP =
  "https://wa.me/5511999999999?text=" +
  encodeURIComponent("Olá! Quero limpar meu nome com a LNB.");

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Logo height={40} priority />
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-700">
          <Link href="/#como-funciona" className="hover:text-brand-600">Como Funciona</Link>
          <Link href="/#servicos" className="hover:text-brand-600">Serviços</Link>
          <Link href="/#blindagem" className="hover:text-brand-600">Blindagem</Link>
          <Link href="/#faq" className="hover:text-brand-600">Dúvidas</Link>
          <Link href="/conta" className="hover:text-brand-600">Área do Cliente</Link>
        </nav>
        <a
          href={WHATSAPP}
          target="_blank"
          rel="noopener"
          className="hidden sm:inline-flex items-center justify-center rounded-md bg-brand-500 px-4 h-10 text-sm font-medium text-white shadow-sm hover:bg-brand-600 transition"
        >
          Consultar Grátis
        </a>
      </div>
    </header>
  );
}
