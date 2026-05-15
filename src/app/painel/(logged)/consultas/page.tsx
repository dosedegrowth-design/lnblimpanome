import { requireAdmin } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/admin/page-header";
import type { ConsultaRow } from "@/lib/supabase/types";
import { ConsultasTable } from "./consultas-table";

export const dynamic = "force-dynamic";

export default async function ConsultasPage() {
  await requireAdmin();
  const supa = await createClient();

  const { data } = await supa
    .from("LNB_Consultas")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);

  const consultas = (data ?? []) as ConsultaRow[];

  return (
    <div className="p-6 sm:p-8 max-w-[1400px] mx-auto">
      <PageHeader title="Consultas" subtitle={`${consultas.length} consulta(s) executada(s)`} />
      <ConsultasTable consultas={consultas} />
    </div>
  );
}
