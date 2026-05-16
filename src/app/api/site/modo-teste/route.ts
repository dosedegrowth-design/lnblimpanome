/**
 * GET /api/site/modo-teste
 * Retorna se a app está em LNB_MODO_TESTE=true.
 * Usado pelas pages /consultar/* (client) pra mostrar banner.
 */
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    modo_teste: process.env.LNB_MODO_TESTE === "true",
  });
}
