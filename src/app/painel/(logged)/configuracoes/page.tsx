import { requireAdmin } from "@/lib/auth/admin";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings as SettingsIcon } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { ChangePasswordForm } from "./change-password-form";

export default async function ConfiguracoesPage() {
  const ctx = await requireAdmin();

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <PageHeader title="Configurações" subtitle="Sua conta e preferências" icon={SettingsIcon} />

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Perfil</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <Row label="Nome"  value={ctx.user.nome} />
            <Row label="Email" value={ctx.user.email} />
            <Row
              label="Papel"
              value={<Badge variant={ctx.user.role === "owner" ? "brand" : "default"}>{ctx.user.role}</Badge>}
            />
            <Row label="Cadastrado em" value={new Date(ctx.user.created_at).toLocaleDateString("pt-BR")} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Trocar senha</CardTitle>
          </CardHeader>
          <CardContent>
            <ChangePasswordForm />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sobre o painel LNB</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-600 space-y-2">
            <p>Versão 0.3.0</p>
            <p>Stack: Next.js 16, React 19, Supabase, Tailwind v4, Framer Motion</p>
            <p>
              Repositório:{" "}
              <a
                href="https://github.com/dosedegrowth-design/lnblimpanome"
                target="_blank"
                rel="noopener"
                className="text-brand-600 hover:underline font-semibold"
              >
                github.com/dosedegrowth-design/lnblimpanome
              </a>
            </p>
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
