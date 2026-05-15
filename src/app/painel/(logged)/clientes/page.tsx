import { requireAdmin } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";
import { Users } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { getEtapas, getTags } from "@/lib/kanban";
import { ClientesTable } from "./clientes-table";

export const dynamic = "force-dynamic";

interface Cliente {
  id: string;
  cpf: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  tipo: string | null;
  tag_servico: string | null;
  etapa: string;
  valor_pago: number | null;
  pdf_url: string | null;
  created_at: string;
  updated_at: string;
  finalizado_em: string | null;
  tem_pendencia: boolean | null;
  score: number | null;
  qtd_pendencias: number | null;
  total_dividas: number | null;
}

export default async function ClientesPage() {
  await requireAdmin();

  const supa = await createClient();
  const [etapas, tags, clientesResult] = await Promise.all([
    getEtapas(),
    getTags(),
    supa.rpc("admin_clientes_list"),
  ]);

  const clientes = ((clientesResult.data as { clientes?: Cliente[] } | null)?.clientes ?? []) as Cliente[];

  return (
    <div className="p-6 sm:p-8 max-w-[1400px] mx-auto">
      <PageHeader
        title="Clientes"
        subtitle={`${clientes.length} cliente(s) · tabela única com tudo`}
        icon={Users}
      />

      <ClientesTable clientes={clientes} etapas={etapas} tags={tags} />
    </div>
  );
}
