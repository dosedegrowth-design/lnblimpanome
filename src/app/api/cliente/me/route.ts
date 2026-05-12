import { NextResponse } from "next/server";
import { getClienteSession } from "@/lib/auth/cliente";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/cliente/me
 *
 * Retorna dados do cliente LOGADO + estado da consulta CPF dele.
 * Usado por wizards e dashboards pra:
 *  1) Pré-preencher formulários (sem pedir cadastro de novo)
 *  2) Decidir se deve redirecionar pra relatório (consulta já paga) em
 *     vez de cobrar de novo
 *
 * Resposta:
 *   { ok: true, logado: false }
 *   ou
 *   {
 *     ok: true,
 *     logado: true,
 *     cpf, nome, email, telefone,
 *     tem_consulta: bool,          // existe registro em LNB_Consultas?
 *     consulta_paga: bool,         // foi paga?
 *     pdf_pronto: bool,            // PDF disponível?
 *     tem_pendencia: bool | null,
 *     fechou_limpeza: bool
 *   }
 */
export async function GET() {
  const session = await getClienteSession();
  if (!session) {
    return NextResponse.json({ ok: true, logado: false });
  }

  const supa = await createClient();
  const { data, error } = await supa.rpc("lnb_cliente_me", { p_cpf: session.cpf });

  const fallback = {
    ok: true,
    logado: true,
    cpf: session.cpf,
    nome: session.nome,
    email: "",
    telefone: "",
    tem_consulta: false,
    consulta_paga: false,
    pdf_pronto: false,
    tem_pendencia: null as boolean | null,
    fechou_limpeza: false,
  };

  if (error) {
    console.error("[/api/cliente/me] rpc erro:", error);
    return NextResponse.json(fallback);
  }

  const d = data as {
    ok: boolean;
    cpf?: string;
    nome?: string;
    email?: string;
    telefone?: string;
    tem_consulta?: boolean;
    consulta_paga?: boolean;
    pdf_pronto?: boolean;
    tem_pendencia?: boolean | null;
    fechou_limpeza?: boolean;
  };

  if (!d?.ok) return NextResponse.json(fallback);

  return NextResponse.json({
    ok: true,
    logado: true,
    cpf: d.cpf || session.cpf,
    nome: d.nome || session.nome,
    email: d.email || "",
    telefone: d.telefone || "",
    tem_consulta: !!d.tem_consulta,
    consulta_paga: !!d.consulta_paga,
    pdf_pronto: !!d.pdf_pronto,
    tem_pendencia: d.tem_pendencia ?? null,
    fechou_limpeza: !!d.fechou_limpeza,
  });
}
