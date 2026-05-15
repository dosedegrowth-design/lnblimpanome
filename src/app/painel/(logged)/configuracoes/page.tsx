import { requireAdmin, canManageUsers } from "@/lib/auth/admin";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings as SettingsIcon, Package, Columns3, Tag, Cog, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { ChangePasswordForm } from "./change-password-form";
import Link from "next/link";

export default async function ConfiguracoesPage() {
  const ctx = await requireAdmin();
  const isAdmin = canManageUsers(ctx.user.role);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <PageHeader title="Configurações" subtitle="Sua conta, produtos, etapas e tags" icon={SettingsIcon} />

      {isAdmin && (
        <>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 mt-2">
            Gerenciamento do produto
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
            <NavCard
              href="/painel/configuracoes/produtos"
              icon={Package}
              titulo="Produtos & Preços"
              descricao="Editar valores dos 5 produtos (Consulta CPF/CNPJ, Limpeza CPF/CNPJ, Blindagem)"
              cor="from-emerald-400 to-emerald-600"
            />
            <NavCard
              href="/painel/configuracoes/etapas"
              icon={Columns3}
              titulo="Etapas do Kanban"
              descricao="Reordenar, criar e editar etapas únicas do Kanban (drag-and-drop)"
              cor="from-brand-400 to-brand-600"
            />
            <NavCard
              href="/painel/configuracoes/tags"
              icon={Tag}
              titulo="Tags de Serviço"
              descricao="Identificação visual de cada card no Kanban (cor, emoji, ordem)"
              cor="from-violet-400 to-violet-600"
            />
            <NavCard
              href="/painel/configuracoes/sistema"
              icon={Cog}
              titulo="Sistema"
              descricao="Modo teste, versão da aplicação, provedores de consulta"
              cor="from-amber-400 to-amber-600"
            />
          </div>
        </>
      )}

      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
        Minha conta
      </h2>
      <div className="space-y-4 max-w-3xl">
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
      </div>
    </div>
  );
}

function NavCard({
  href, icon: Icon, titulo, descricao, cor,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  titulo: string;
  descricao: string;
  cor: string;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-xl border border-gray-200 bg-white p-5 hover:border-brand-300 hover:shadow-md transition-all"
    >
      <div className="flex items-start gap-4">
        <div className={`size-11 rounded-xl bg-gradient-to-br ${cor} grid place-items-center shadow-md shrink-0`}>
          <Icon className="size-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h3 className="font-display text-lg text-forest-800">{titulo}</h3>
            <ChevronRight className="size-4 text-gray-400 group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all shrink-0" />
          </div>
          <p className="text-xs text-gray-500 leading-snug">{descricao}</p>
        </div>
      </div>
    </Link>
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
