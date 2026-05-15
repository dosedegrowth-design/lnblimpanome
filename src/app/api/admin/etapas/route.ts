/**
 * /api/admin/etapas — CRUD admin de etapas do Kanban (lista UNICA).
 *
 * GET   → lista etapas ativas
 * PATCH → upsert 1 etapa: { codigo, patch: {...} }
 * PUT   → reordenar: { ordem: ['etapa1', 'etapa2', ...] }
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin";
import { invalidarCacheKanban } from "@/lib/kanban";

export async function GET() {
  await requireAdmin(["owner", "admin"]);
  const supa = await createClient();
  const { data, error } = await supa.rpc("lnb_get_etapas");
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
  const { data, error } = await supa.rpc("lnb_admin_update_etapa", {
    p_codigo: codigo,
    p_patch: patch,
  });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  invalidarCacheKanban();
  return NextResponse.json(data);
}

export async function PUT(req: Request) {
  await requireAdmin(["owner", "admin"]);
  const { ordem } = await req.json();
  if (!Array.isArray(ordem) || ordem.length === 0) {
    return NextResponse.json({ ok: false, error: "ordem (array de codigos) obrigatoria" }, { status: 400 });
  }
  const supa = await createClient();
  const { data, error } = await supa.rpc("lnb_admin_reordenar_etapas", { p_ordem: ordem });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  invalidarCacheKanban();
  return NextResponse.json(data);
}
