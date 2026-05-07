import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Mail, MessageCircle } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="bg-forest-800 text-sand-100 mt-20 sm:mt-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-10">
          <div className="space-y-3 sm:space-y-4 col-span-2 md:col-span-1">
            <Logo height={36} variant="mono" className="text-white" />
            <p className="text-sm text-sand-200/80 max-w-xs leading-relaxed">
              Limpeza de nome 100% digital. Resultado em minutos, sem sair de casa.
            </p>
          </div>

          <div>
            <h4 className="text-[11px] sm:text-xs font-semibold text-white mb-3 sm:mb-4 uppercase tracking-wider">Serviços</h4>
            <ul className="space-y-2 sm:space-y-2.5 text-sm text-sand-200/80">
              <li><Link href="/consultar" className="hover:text-brand-300 transition">Consulta CPF</Link></li>
              <li><Link href="/#servicos" className="hover:text-brand-300 transition">Limpeza de Nome</Link></li>
              <li><Link href="/#blindagem" className="hover:text-brand-300 transition">Blindagem</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-[11px] sm:text-xs font-semibold text-white mb-3 sm:mb-4 uppercase tracking-wider">Empresa</h4>
            <ul className="space-y-2 sm:space-y-2.5 text-sm text-sand-200/80">
              <li><Link href="/#como-funciona" className="hover:text-brand-300 transition">Como funciona</Link></li>
              <li><Link href="/#faq" className="hover:text-brand-300 transition">Dúvidas</Link></li>
              <li><Link href="/conta" className="hover:text-brand-300 transition">Área do cliente</Link></li>
            </ul>
          </div>

          <div className="col-span-2 md:col-span-1">
            <h4 className="text-[11px] sm:text-xs font-semibold text-white mb-3 sm:mb-4 uppercase tracking-wider">Contato</h4>
            <ul className="space-y-2.5 sm:space-y-3 text-sm">
              <li>
                <a href="mailto:contato@limpanomebrazil.com.br" className="flex items-center gap-2 text-sand-200/80 hover:text-brand-300 transition break-all">
                  <Mail className="size-4 shrink-0" />
                  <span className="text-xs sm:text-sm">contato@limpanomebrazil.com.br</span>
                </a>
              </li>
              <li>
                <a href="https://wa.me/5511999999999" target="_blank" rel="noopener" className="flex items-center gap-2 text-sand-200/80 hover:text-brand-300 transition">
                  <MessageCircle className="size-4 shrink-0" />
                  WhatsApp
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 sm:mt-14 pt-6 sm:pt-8 border-t border-forest-600/40 flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4 text-xs text-sand-200/60">
          <p className="text-center sm:text-left">© {new Date().getFullYear()} Limpa Nome Brazil. Todos os direitos reservados.</p>
          <div className="flex gap-5 sm:gap-6">
            <Link href="/privacidade" className="hover:text-brand-300">Privacidade</Link>
            <Link href="/termos" className="hover:text-brand-300">Termos de uso</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
