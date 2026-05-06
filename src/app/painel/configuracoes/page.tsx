import { requireAdmin } from "@/lib/auth/admin";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default async function ConfiguracoesPage() {
  const ctx = await requireAdmin();

  return (
    <div className="p-8 max-w-3xl">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Configurações</h1>
        <p className="text-gray-500 mt-1">Sua conta e preferências</p>
      </header>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Perfil</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Nome</span>
              <span className="font-medium text-gray-900">{ctx.user.nome}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Email</span>
              <span className="font-medium text-gray-900">{ctx.user.email}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-500">Papel</span>
              <span className="font-medium text-gray-900 capitalize">{ctx.user.role}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sobre o painel LNB</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-600 space-y-2">
            <p>Versão 0.1.0 — Painel admin Limpa Nome Brazil</p>
            <p>Stack: Next.js 16, React 19, Supabase, Tailwind v4, shadcn/ui</p>
            <p>Repositório: <a href="https://github.com/dosedegrowth-design/lnblimpanome" className="text-brand-600 hover:underline">github.com/dosedegrowth-design/lnblimpanome</a></p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
