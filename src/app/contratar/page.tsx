"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  CheckCircle2, ArrowLeft, Lock, Shield,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import {
  formatCPF, cleanCPF, isValidCPF, formatPhone, formatBRL,
} from "@/lib/utils";
import { PLANOS, isPlanoTipo, type PlanoTipo, getPlano } from "@/lib/planos";

export default function ContratarPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-gray-400">Carregando...</div>}>
      <ContratarForm />
    </Suspense>
  );
}

function ContratarForm() {
  const router = useRouter();
  const params = useSearchParams();

  const planoParam = params.get("plano") || "limpeza_desconto";
  const planoTipo: PlanoTipo = isPlanoTipo(planoParam) ? planoParam : "limpeza_desconto";
  const plano = getPlano(planoTipo);

  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    cpf: "",
    nome: "",
    email: "",
    telefone: "",
    senha: "",
    aceiteTermos: false,
  });

  function set<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function validate(): string | null {
    if (!isValidCPF(cleanCPF(form.cpf))) return "CPF inválido";
    if (form.nome.length < 2)            return "Informe seu nome completo";
    if (!form.email.includes("@"))       return "Email inválido";
    if (form.telefone.replace(/\D/g, "").length < 10) return "Telefone inválido";
    if (form.senha.length < 8)           return "Senha precisa ter ao menos 8 caracteres";
    if (!form.aceiteTermos)              return "Você precisa aceitar os termos pra prosseguir";
    return null;
  }

  async function processarPagamento() {
    const err = validate();
    if (err) return toast.error(err);

    setLoading(true);
    try {
      const r = await fetch("/api/site/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: planoTipo,
          cpf: cleanCPF(form.cpf),
          nome: form.nome,
          email: form.email,
          telefone: form.telefone.replace(/\D/g, ""),
          senha: form.senha,
        }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok || !d.init_point) {
        toast.error(d.error || "Não conseguimos gerar a cobrança. Tente novamente.");
        setLoading(false);
        return;
      }
      try { localStorage.setItem("lnb_last_cpf", d.cpf); } catch {}
      window.location.assign(d.init_point);
    } catch (e) {
      console.error(e);
      toast.error("Falha de conexão. Tente novamente.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sand-50 via-white to-brand-50/40">
      {/* Header simples */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur sticky top-0 z-30">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-4 flex items-center justify-between">
          <Logo height={32} />
          <Link href="/" className="text-sm font-semibold text-gray-700 hover:text-brand-600 inline-flex items-center gap-1.5">
            <ArrowLeft className="size-4" />
            Voltar
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-8 sm:py-14">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8"
        >
          {/* Resumo do plano (esquerda) */}
          <div className="lg:col-span-2">
            <Card className="lg:sticky lg:top-24">
              <CardContent className="p-6 sm:p-8">
                {plano.badge && (
                  <span className="inline-block text-[10px] font-bold text-brand-700 bg-brand-50 px-3 py-1 rounded-full uppercase tracking-wider">
                    {plano.badge}
                  </span>
                )}
                <h1 className="mt-3 font-display text-2xl sm:text-3xl text-forest-800">
                  {plano.nome}
                </h1>
                <p className="text-sm text-gray-700 font-medium mt-1">{plano.resumo}</p>

                <div className="mt-5 flex items-baseline gap-1">
                  <span className="font-display text-4xl sm:text-5xl text-forest-800">
                    {plano.precoLabel}
                  </span>
                  {plano.recorrencia && (
                    <span className="text-base text-gray-700 font-bold">{plano.recorrencia}</span>
                  )}
                </div>

                <ul className="mt-6 space-y-2.5 text-sm text-gray-800 font-semibold">
                  {plano.beneficios.map((b) => (
                    <li key={b} className="flex gap-2.5">
                      <CheckCircle2 className="size-4 sm:size-5 text-brand-500 shrink-0 mt-0.5" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-6 pt-5 border-t border-gray-100 grid grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center gap-2 text-gray-700 font-semibold">
                    <Lock className="size-3.5 text-brand-600" />
                    Pagamento seguro
                  </div>
                  <div className="flex items-center gap-2 text-gray-700 font-semibold">
                    <Shield className="size-3.5 text-brand-600" />
                    Dados protegidos
                  </div>
                </div>

                <div className="mt-3 text-[11px] text-gray-500">
                  Processado por Mercado Pago. Pix, cartão de crédito ou boleto.
                </div>
              </CardContent>
            </Card>

            {/* Outras opções */}
            <div className="mt-4 text-center">
              <p className="text-xs font-semibold text-gray-700 mb-2">Outros planos</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {Object.values(PLANOS)
                  .filter((p) => p.tipo !== planoTipo)
                  .map((p) => (
                    <Link
                      key={p.tipo}
                      href={p.rota}
                      className="text-xs font-bold text-brand-700 bg-white border border-brand-200 hover:border-brand-400 px-3 py-1.5 rounded-full transition"
                    >
                      {p.nome} · {p.precoLabel}{p.recorrencia || ""}
                    </Link>
                  ))}
              </div>
            </div>
          </div>

          {/* Form (direita) */}
          <div className="lg:col-span-3">
            <Card>
              <CardContent className="p-6 sm:p-8 space-y-4">
                <div>
                  <h2 className="font-display text-xl sm:text-2xl text-forest-800">
                    Dados pra contratação
                  </h2>
                  <p className="text-sm text-gray-700 font-medium mt-1">
                    Você vai criar sua conta na LNB e ser redirecionado pro Mercado Pago.
                  </p>
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                  >
                    <div className="sm:col-span-2">
                      <Label htmlFor="cpf">CPF</Label>
                      <Input
                        id="cpf"
                        inputMode="numeric"
                        value={form.cpf}
                        onChange={(e) => set("cpf", formatCPF(e.target.value))}
                        placeholder="000.000.000-00"
                        autoComplete="off"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label htmlFor="nome">Nome completo</Label>
                      <Input
                        id="nome"
                        value={form.nome}
                        onChange={(e) => set("nome", e.target.value)}
                        placeholder="Como está no seu RG"
                        autoComplete="name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">E-mail</Label>
                      <Input
                        id="email"
                        type="email"
                        value={form.email}
                        onChange={(e) => set("email", e.target.value)}
                        placeholder="seu@email.com"
                        autoComplete="email"
                      />
                    </div>
                    <div>
                      <Label htmlFor="tel">Telefone (WhatsApp)</Label>
                      <Input
                        id="tel"
                        inputMode="tel"
                        value={form.telefone}
                        onChange={(e) => set("telefone", formatPhone(e.target.value))}
                        placeholder="(11) 99999-9999"
                        autoComplete="tel"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label htmlFor="senha">Senha de acesso à área do cliente</Label>
                      <Input
                        id="senha"
                        type="password"
                        value={form.senha}
                        onChange={(e) => set("senha", e.target.value)}
                        placeholder="Mínimo 8 caracteres"
                        autoComplete="new-password"
                      />
                      <p className="text-[11px] text-gray-700 font-medium mt-1.5">
                        Você vai usar essa senha pra acompanhar seu processo no painel.
                      </p>
                    </div>
                  </motion.div>
                </AnimatePresence>

                <label className="flex items-start gap-2.5 pt-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.aceiteTermos}
                    onChange={(e) => set("aceiteTermos", e.target.checked)}
                    className="mt-1 rounded text-brand-500 focus:ring-brand-500 size-4"
                  />
                  <span className="text-xs sm:text-sm text-gray-700 font-medium leading-relaxed">
                    Li e aceito os{" "}
                    <Link href="/termos" target="_blank" className="text-brand-600 hover:underline font-semibold">
                      Termos de uso
                    </Link>
                    {" "}e a{" "}
                    <Link href="/privacidade" target="_blank" className="text-brand-600 hover:underline font-semibold">
                      Política de privacidade
                    </Link>
                    .
                  </span>
                </label>

                <div className="rounded-xl border border-brand-100 bg-brand-50/40 p-4 text-xs text-forest-800 font-medium">
                  Total a pagar agora:{" "}
                  <strong className="font-display text-base text-brand-700">
                    {formatBRL(plano.preco)}
                  </strong>
                  {plano.recorrencia && <span className="text-gray-700"> {plano.recorrencia}</span>}
                </div>

                <Button
                  onClick={processarPagamento}
                  loading={loading}
                  width="full"
                  className="h-12 sm:h-14 text-base"
                >
                  {loading ? "Processando..." : `Ir pro pagamento · ${formatBRL(plano.preco)}`}
                </Button>

                <p className="text-center text-[11px] text-gray-700 font-medium">
                  Você será redirecionado pro Mercado Pago.
                </p>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
