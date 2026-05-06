import { requireAdmin } from "@/lib/auth/admin";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings as SettingsIcon } from "lucide-react";

export default async function ConfiguracoesPage() {
  const ctx = await requireAdmin();

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-4xl text-forest-800">Configurações</h1>
          <p className="text-gray-500 mt-1">Sua conta e preferências</p>
        </div>
        <div className="size-12 rounded-xl bg-brand-50 grid place-items-center">
          <SettingsIcon className="size-5 text-brand-600" />
        </div>
      </header>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Perfil</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <Row label="Nome"  value={ctx.user.nome} />
            <Row label="Email" value={ctx.user.email} />
            <Row label="Papel" value={<Badge variant={ctx.user.role === "owner" ? "brand" : "default"}>{ctx.user.role}</Badge>} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sobre o painel LNB</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-600 space-y-2">
            <p>Versão 0.2.0 — Painel admin Limpa Nome Brazil</p>
            <p>Stack: Next.js 16, React 19, Supabase, Tailwind v4, Framer Motion</p>
            <p>Repositório: <a href="https://github.com/dosedegrowth-design/lnblimpanome" className="text-brand-600 hover:underline font-semibold">github.com/dosedegrowth-design/lnblimpanome</a></p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-3 border-b border-gray-100 last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className="font-semibold text-forest-800">{value}</span>
    </div>
  );
}
