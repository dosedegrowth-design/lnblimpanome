import { requireAdmin } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/admin/page-header";
import type { CRMRow } from "@/lib/supabase/types";
import { LeadsTable } from "./leads-table";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  await requireAdmin();

  const supa = await createClient();
  const { data } = await supa
    .from("LNB - CRM")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);

  const leads = (data ?? []) as CRMRow[];

  return (
    <div className="p-6 sm:p-8 max-w-[1400px] mx-auto">
      <PageHeader
        title="Leads & CRM"
        subtitle={`${leads.length} lead(s) cadastrado(s)`}
      />
      <LeadsTable leads={leads} />
    </div>
  );
}
