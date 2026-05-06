/**
 * Helpers de auth do PAINEL ADMIN — Supabase Auth.
 * Usar SEMPRE em Server Components / Route Handlers.
 *
 * Não usa service role — cookie autenticado + RLS policy admin_self_select.
 */
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AdminUserRow, AdminRole } from "@/lib/supabase/types";

export interface AdminContext {
  authId: string;
  email: string;
  user: AdminUserRow;
}

export async function getAdminContext(): Promise<AdminContext | null> {
  const supa = await createClient();
  const { data: { user: authUser } } = await supa.auth.getUser();
  if (!authUser) return null;

  // RLS policy "admin_self_select" permite ler o próprio registro
  const { data: row } = await supa
    .from("lnb_admin_users")
    .select("*")
    .eq("id", authUser.id)
    .maybeSingle<AdminUserRow>();

  if (!row || !row.ativo) return null;
  return { authId: authUser.id, email: authUser.email!, user: row };
}

export async function requireAdmin(allowed?: AdminRole[]): Promise<AdminContext> {
  const ctx = await getAdminContext();
  if (!ctx) redirect("/painel/login");
  if (allowed && !allowed.includes(ctx.user.role)) redirect("/painel/dashboard?denied=1");
  return ctx;
}

export function canManageUsers(role: AdminRole) {
  return role === "owner" || role === "admin";
}

export function canViewFinancial(role: AdminRole) {
  return role === "owner" || role === "admin";
}
