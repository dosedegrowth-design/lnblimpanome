/**
 * Helpers de PRODUTOS — SERVER-ONLY (le do banco).
 * Tipos e fallback estao em src/lib/produtos-shared.ts (client-safe).
 */
import "server-only";
import { createClient } from "@/lib/supabase/server";
import {
  type Produto,
  type ProdutoCodigo,
  type ProdutosMap,
  FALLBACK_PRODUTOS,
} from "@/lib/produtos-shared";

// Re-export tipos pra quem importa daqui
export {
  type Produto,
  type ProdutoCodigo,
  type ProdutosMap,
} from "@/lib/produtos-shared";

const TTL_MS = 60_000;
let cache: { at: number; modoTeste: boolean; map: ProdutosMap } | null = null;

export function isModoTeste(): boolean {
  return process.env.LNB_MODO_TESTE === "true";
}

export async function getProdutos(): Promise<ProdutosMap> {
  const modoTeste = isModoTeste();
  const now = Date.now();

  if (cache && cache.modoTeste === modoTeste && now - cache.at < TTL_MS) {
    return cache.map;
  }

  try {
    const supa = await createClient();
    const { data, error } = await supa.rpc("lnb_get_precos_map", { p_modo_teste: modoTeste });
    if (error) throw error;
    const r = data as { ok: boolean; produtos: Record<string, Produto> } | null;
    if (!r?.ok || !r.produtos) throw new Error("RPC retornou vazio");
    const map = r.produtos as ProdutosMap;
    cache = { at: now, modoTeste, map };
    return map;
  } catch (e) {
    console.error("[produtos] getProdutos fallback:", e);
    return FALLBACK_PRODUTOS;
  }
}

export async function getProduto(codigo: ProdutoCodigo): Promise<Produto | null> {
  const map = await getProdutos();
  return map[codigo] || null;
}

export async function getValor(codigo: ProdutoCodigo): Promise<number> {
  const p = await getProduto(codigo);
  return p?.valor ?? FALLBACK_PRODUTOS[codigo].valor;
}

export async function getValorComDesconto(codigo: ProdutoCodigo): Promise<number> {
  const p = await getProduto(codigo);
  if (!p) return FALLBACK_PRODUTOS[codigo].valor;
  return Math.max(p.valor - p.desconto_consulta, 0);
}

export function invalidarCacheProdutos(): void {
  cache = null;
}
