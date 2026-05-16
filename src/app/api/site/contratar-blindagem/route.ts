/**
 * POST /api/site/contratar-blindagem
 *
 * Cria uma assinatura mensal de Blindagem no Asaas e cadastra em LNB_Blindagem.
 *
 * Body: { cpf, nome, email, telefone }
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { criarAssinaturaLNB } from "@/lib/asaas";
import { cleanCPF, isValidCPF } from "@/lib/utils";
import { getProduto, isModoTeste } from "@/lib/produtos";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const cpf = cleanCPF(String(body?.cpf || ""));
  const nome = String(body?.nome || "").trim();
  const email = String(body?.email || "").trim();
  const telefone = String(body?.telefone || "").replace(/\D/g, "");

  if (!isValidCPF(cpf)) return NextResponse.json({ ok: false, error: "CPF inválido" }, { status: 400 });
  if (!nome || nome.length < 2) return NextResponse.json({ ok: false, error: "Nome obrigatório" }, { status: 400 });
  if (!email || !email.includes("@")) return NextResponse.json({ ok: false, error: "Email inválido" }, { status: 400 });
  if (!telefone || telefone.length < 10) return NextResponse.json({ ok: false, error: "Telefone inválido" }, { status: 400 });

  const modoTeste = isModoTeste();
  const produto = await getProduto("blindagem");
  if (!produto) return NextResponse.json({ ok: false, error: "Produto blindagem não configurado" }, { status: 500 });

  const supa = await createClient();

  // Verifica se ja tem assinatura ativa
  const { data: existente } = await supa
    .from("LNB_Blindagem")
    .select("id, ativo, asaas_subscription_id")
    .eq("cpf", cpf)
    .maybeSingle<{ id: string; ativo: boolean; asaas_subscription_id: string | null }>();

  if (existente?.ativo && existente.asaas_subscription_id) {
    return NextResponse.json(
      { ok: false, error: "Você já tem uma assinatura de Blindagem ativa.", motivo: "ja_ativa" },
      { status: 409 }
    );
  }

  // Cria assinatura no Asaas
  let assinatura;
  try {
    assinatura = await criarAssinaturaLNB({
      cpf,
      nome,
      email,
      telefone,
      valor: produto.valor,
      cycle: "MONTHLY",
      descricao: modoTeste
        ? "[TESTE] LNB - Blindagem mensal"
        : "LNB - Blindagem mensal (monitoramento de score)",
      externalReference: `BLINDAGEM-${cpf}-${Date.now()}`,
    });
  } catch (e) {
    console.error("[contratar-blindagem] asaas erro:", e);
    return NextResponse.json(
      { ok: false, error: "Não foi possível criar a assinatura. Tente novamente." },
      { status: 502 }
    );
  }

  // Cadastra/atualiza em LNB_Blindagem
  const proximaVerificacao = new Date();
  proximaVerificacao.setDate(proximaVerificacao.getDate() + 30);

  try {
    await supa
      .from("LNB_Blindagem")
      .upsert(
        {
          cpf,
          nome,
          email,
          telefone,
          plano: "mensal",
          valor: produto.valor,
          ativo: true,
          asaas_subscription_id: assinatura.subscriptionId,
          asaas_customer_id: assinatura.customerId,
          proxima_verificacao: proximaVerificacao.toISOString(),
        } as never,
        { onConflict: "cpf" }
      );
  } catch (e) {
    console.error("[contratar-blindagem] upsert erro (segue):", e);
  }

  return NextResponse.json({
    ok: true,
    subscription_id: assinatura.subscriptionId,
    invoice_url: assinatura.invoiceUrl,
    next_due_date: assinatura.nextDueDate,
    valor: produto.valor,
  });
}
