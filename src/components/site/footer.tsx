import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-gray-200 bg-white mt-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <Logo height={36} />
            <p className="text-sm text-gray-600 max-w-xs">
              Limpeza de nome 100% digital. Resultado em minutos, sem sair de casa.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Serviços</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><Link href="/#servicos" className="hover:text-brand-600">Consulta CPF</Link></li>
              <li><Link href="/#servicos" className="hover:text-brand-600">Limpeza de Nome</Link></li>
              <li><Link href="/#blindagem" className="hover:text-brand-600">Blindagem</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Empresa</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><Link href="/sobre" className="hover:text-brand-600">Sobre nós</Link></li>
              <li><Link href="/#como-funciona" className="hover:text-brand-600">Como funciona</Link></li>
              <li><Link href="/#faq" className="hover:text-brand-600">Perguntas Frequentes</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Contato</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><a href="mailto:contato@limpanomebrazil.com.br" className="hover:text-brand-600">contato@limpanomebrazil.com.br</a></li>
              <li><Link href="/conta" className="hover:text-brand-600">Área do cliente</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-500">
          <p>© {new Date().getFullYear()} Limpa Nome Brazil. Todos os direitos reservados.</p>
          <div className="flex gap-4">
            <Link href="/privacidade" className="hover:text-brand-600">Privacidade</Link>
            <Link href="/termos" className="hover:text-brand-600">Termos de uso</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
