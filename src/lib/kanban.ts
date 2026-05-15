/**
 * Helpers de KANBAN — SERVER-ONLY (le do banco).
 * Tipos e funcoes puras estao em src/lib/kanban-shared.ts (client-safe).
 */
import "server-only";
import { createClient } from "@/lib/supabase/server";
import {
  type Etapa,
  type Tag,
  FALLBACK_ETAPAS,
  FALLBACK_TAGS,
} from "@/lib/kanban-shared";

// Re-export tipos e helpers puros pra quem importa daqui
export {
  findEtapa,
  findTag,
  getProximaEtapa,
  getEtapasParaTag,
  corClasses,
  COR_CLASSES,
  type Etapa,
  type Tag,
  type EtapaCor,
} from "@/lib/kanban-shared";

const TTL_MS = 60_000;
let cacheEtapas: { at: number; lista: Etapa[] } | null = null;
let cacheTags: { at: number; lista: Tag[] } | null = null;

export async function getEtapas(): Promise<Etapa[]> {
  const now = Date.now();
  if (cacheEtapas && now - cacheEtapas.at < TTL_MS) return cacheEtapas.lista;

  try {
    const supa = await createClient();
    const { data, error } = await supa.rpc("lnb_get_etapas");
    if (error) throw error;
    const r = data as { ok: boolean; etapas: Etapa[] } | null;
    if (!r?.ok || !Array.isArray(r.etapas)) throw new Error("RPC retornou vazio");
    cacheEtapas = { at: now, lista: r.etapas };
    return r.etapas;
  } catch (e) {
    console.error("[kanban] getEtapas fallback:", e);
    return FALLBACK_ETAPAS;
  }
}

export async function getTags(): Promise<Tag[]> {
  const now = Date.now();
  if (cacheTags && now - cacheTags.at < TTL_MS) return cacheTags.lista;

  try {
    const supa = await createClient();
    const { data, error } = await supa.rpc("lnb_get_tags");
    if (error) throw error;
    const r = data as { ok: boolean; tags: Tag[] } | null;
    if (!r?.ok || !Array.isArray(r.tags)) throw new Error("RPC retornou vazio");
    cacheTags = { at: now, lista: r.tags };
    return r.tags;
  } catch (e) {
    console.error("[kanban] getTags fallback:", e);
    return FALLBACK_TAGS;
  }
}

export async function getEtapa(codigo: string): Promise<Etapa | null> {
  const lista = await getEtapas();
  return lista.find((e) => e.codigo === codigo) || null;
}

export async function getTag(codigo: string): Promise<Tag | null> {
  const lista = await getTags();
  return lista.find((t) => t.codigo === codigo) || null;
}

export function invalidarCacheKanban(): void {
  cacheEtapas = null;
  cacheTags = null;
}
