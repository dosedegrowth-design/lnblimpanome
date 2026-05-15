import { requireAdmin, canManageUsers } from "@/lib/auth/admin";
import { redirect } from "next/navigation";
import { getProdutos, isModoTeste } from "@/lib/produtos";
import { PageHeader } from "@/components/admin/page-header";
import { Package } from "lucide-react";
import Link from "next/link";
import { ProdutosForm } from "./produtos-form";

export const dynamic = "force-dynamic";

export default async function ProdutosPage() {
  const ctx = await requireAdmin();
  if (!canManageUsers(ctx.user.role)) redirect("/painel/configuracoes?denied=1");

  const produtos = await getProdutos();
  const modoTeste = isModoTeste();

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-4">
        <Link href="/painel/configuracoes" className="text-sm text-brand-600 hover:underline">
          ← Configurações
        </Link>
      </div>

      <PageHeader
        title="Produtos & Preços"
        subtitle="Valores dos 5 produtos LNB. Mudanças entram em vigor em até 60 segundos."
        icon={Package}
      />

      {modoTeste && (
        <div className="mb-6 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          <strong>⚠️ Modo Teste ativo</strong> · todos os checkouts cobram apenas o valor de teste configurado abaixo.
          Para desligar, remova a variável <code>LNB_MODO_TESTE</code> no Vercel.
        </div>
      )}

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 mb-6 leading-snug">
        <strong>Aviso:</strong> mudar preços aqui afeta novos checkouts imediatamente.
        Cobranças já geradas mantêm o valor original. JSON-LD do SEO (homepage) precisa de redeploy manual.
      </div>

      <ProdutosForm initial={produtos} modoTeste={modoTeste} />
    </div>
  );
}
