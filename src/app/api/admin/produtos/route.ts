/**
 * /api/admin/produtos — CRUD admin de produtos LNB.
 *
 * GET   → lista produtos (mapa codigo → produto)
 * PATCH → atualiza 1 produto: { codigo, patch: {...} }
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin";
import { invalidarCacheProdutos } from "@/lib/produtos";

export async function GET() {
  await requireAdmin(["owner", "admin"]);
  const supa = await createClient();
  const { data, error } = await supa.rpc("lnb_get_precos_map", { p_modo_teste: false });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(req: Request) {
  await requireAdmin(["owner", "admin"]);
  const { codigo, patch } = await req.json();
  if (!codigo || !patch || typeof patch !== "object") {
    return NextResponse.json({ ok: false, error: "codigo e patch obrigatorios" }, { status: 400 });
  }
  const supa = await createClient();
  const { data, error } = await supa.rpc("lnb_admin_update_produto", {
    p_codigo: codigo,
    p_patch: patch,
  });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  invalidarCacheProdutos();
  return NextResponse.json(data);
}
