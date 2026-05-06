"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CheckCircle2, ArrowRight, ArrowLeft, Lock, FileSearch, CreditCard,
  Sparkles, ShieldCheck, Zap,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatCPF, cleanCPF, isValidCPF, formatPhone, formatBRL } from "@/lib/utils";

const STEPS = [
  { n: 1, label: "Identificação", icon: FileSearch },
  { n: 2, label: "Pagamento",     icon: CreditCard },
  { n: 3, label: "Resultado",     icon: Sparkles },
] as const;

export default function ConsultarWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    cpf: "",
    nome: "",
    email: "",
    telefone: "",
    senha: "",
    metodo: "pix" as "pix" | "cartao",
  });
  const [resultado, setResultado] = useState<{
    score: number;
    has_debt: boolean;
    pendencias: number;
    total: string;
  } | null>(null);

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function nextStep() {
    if (step === 1) {
      if (!isValidCPF(cleanCPF(form.cpf))) return toast.error("CPF inválido");
      if (form.nome.length < 2)            return toast.error("Nome inválido");
      if (!form.email.includes("@"))       return toast.error("Email inválido");
      if (form.telefone.replace(/\D/g, "").length < 10) return toast.error("Telefone inválido");
      if (form.senha.length < 8)           return toast.error("Senha precisa ter ao menos 8 caracteres");
    }
    setStep((s) => s + 1);
  }

  async function processarPagamento() {
    setLoading(true);

    /**
     * Backend integrado:
     * 1) cadastra cliente em lnb_cliente_auth (RPC lnb_cliente_register)
     * 2) cria cobrança Mercado Pago (atualmente: simulação local)
     * 3) cliente paga
     * 4) webhook MP → cria registro em LNB_Consultas + chama API Full
     * 5) na confirmação, redireciona pra área logada
     *
     * MVP: registra o cliente + simula resultado pra demonstração
     * (até integração Mercado Pago + n8n cobrança terminar).
     */
    try {
      const r = await fetch("/api/cliente/cadastro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cpf: cleanCPF(form.cpf),
          nome: form.nome,
          email: form.email,
          telefone: form.telefone.replace(/\D/g, ""),
          senha: form.senha,
        }),
      });
      const d = await r.json();
      if (!r.ok && d.error !== "CPF já cadastrado. Faça login.") {
        toast.error(d.error ?? "Erro ao criar conta");
        setLoading(false);
        return;
      }
    } catch {
      // continua mesmo se já existir
    }

    // Simulação de cobrança e resultado da consulta — SUBSTITUIR
    // pela integração real Mercado Pago + API Full (via webhook n8n) quando ativo
    await new Promise((r) => setTimeout(r, 2000));

    const seed = cleanCPF(form.cpf).slice(-3);
    const has_debt = parseInt(seed) % 2 === 0;
    setResultado({
      score: has_debt ? 412 : 758,
      has_debt,
      pendencias: has_debt ? 3 : 0,
      total: has_debt ? "4.872,00" : "0,00",
    });
    setLoading(false);
    setStep(3);
    toast.success("Consulta concluída!");
  }

  return (
    <div>
      {/* Stepper */}
      <ol className="flex items-center gap-2 mb-10">
        {STEPS.map((s, i) => {
          const isActive = step === s.n;
          const isDone = step > s.n;
          return (
            <li key={s.n} className="flex items-center gap-2 flex-1">
              <div className="flex flex-col items-center w-full">
                <div className={`size-10 rounded-full grid place-items-center transition-all ${
                  isDone ? "bg-brand-500 text-white shadow-md shadow-brand-500/30" :
                  isActive ? "bg-brand-100 text-brand-700 ring-4 ring-brand-50" :
                  "bg-white border-2 border-gray-200 text-gray-400"
                }`}>
                  {isDone ? <CheckCircle2 className="size-5" /> : <s.icon className="size-4" />}
                </div>
                <span className={`mt-2 text-xs font-semibold ${isActive || isDone ? "text-forest-800" : "text-gray-400"}`}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mb-7 transition-colors ${isDone ? "bg-brand-400" : "bg-gray-200"}`} />
              )}
            </li>
          );
        })}
      </ol>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <Card className="shadow-xl shadow-forest-800/5">
              <CardContent className="p-8 lg:p-10">
                <h2 className="font-display text-3xl text-forest-800 mb-2">Quem é você?</h2>
                <p className="text-gray-500 mb-8">
                  Preenchemos automaticamente sua área logada com esses dados. <br />
                  <strong className="text-forest-700">Cadastro 100% protegido.</strong>
                </p>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="cpf">CPF *</Label>
                    <Input id="cpf" inputMode="numeric" required
                      value={form.cpf} onChange={(e) => set("cpf", formatCPF(e.target.value))}
                      placeholder="000.000.000-00" />
                  </div>
                  <div>
                    <Label htmlFor="nome">Nome completo *</Label>
                    <Input id="nome" required value={form.nome}
                      onChange={(e) => set("nome", e.target.value)} placeholder="Como aparece no seu RG" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <Input id="email" type="email" required value={form.email}
                        onChange={(e) => set("email", e.target.value)} placeholder="voce@email.com" />
                    </div>
                    <div>
                      <Label htmlFor="telefone">WhatsApp *</Label>
                      <Input id="telefone" inputMode="numeric" required
                        value={form.telefone} onChange={(e) => set("telefone", formatPhone(e.target.value))}
                        placeholder="(11) 99999-9999" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="senha">Crie uma senha *</Label>
                    <Input id="senha" type="password" required minLength={8}
                      value={form.senha} onChange={(e) => set("senha", e.target.value)}
                      placeholder="Mínimo 8 caracteres" />
                    <p className="text-xs text-gray-500 mt-1.5">
                      Você usa essa senha pra entrar na sua área logada depois.
                    </p>
                  </div>
                </div>

                <div className="mt-8 flex justify-end">
                  <Button onClick={nextStep} size="lg" className="gap-2">
                    Continuar <ArrowRight className="size-4" />
                  </Button>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-500">
                  <Lock className="size-3.5 text-emerald-600" />
                  Seus dados são criptografados (LGPD compatível)
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <Card className="shadow-xl shadow-forest-800/5">
              <CardContent className="p-8 lg:p-10">
                <h2 className="font-display text-3xl text-forest-800 mb-2">Pagamento</h2>
                <p className="text-gray-500 mb-8">
                  Consulta única de R$ 19,99. Resultado em minutos no WhatsApp e na sua área logada.
                </p>

                {/* Resumo do pedido */}
                <div className="rounded-xl bg-sand-50 border border-sand-300/40 p-5 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="font-bold text-forest-800">Consulta CPF</p>
                      <p className="text-xs text-gray-500">Resultado em até 5 minutos</p>
                    </div>
                    <span className="font-display text-2xl text-forest-800">{formatBRL(19.99)}</span>
                  </div>
                  <div className="pt-4 border-t border-sand-300/40 flex items-center justify-between">
                    <span className="font-semibold text-forest-800">Total</span>
                    <span className="font-display text-3xl text-brand-600">{formatBRL(19.99)}</span>
                  </div>
                </div>

                {/* Método */}
                <div className="space-y-3 mb-6">
                  <Label>Método de pagamento</Label>
                  <button
                    type="button"
                    onClick={() => set("metodo", "pix")}
                    className={`w-full text-left rounded-xl border-2 p-4 transition-all ${
                      form.metodo === "pix"
                        ? "border-brand-500 bg-brand-50/50 shadow-sm"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`size-10 rounded-lg grid place-items-center ${
                        form.metodo === "pix" ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-500"
                      }`}>
                        <Zap className="size-5" />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-forest-800">Pix</p>
                        <p className="text-xs text-gray-500">Aprovação instantânea</p>
                      </div>
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">
                        Recomendado
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => set("metodo", "cartao")}
                    className={`w-full text-left rounded-xl border-2 p-4 transition-all ${
                      form.metodo === "cartao"
                        ? "border-brand-500 bg-brand-50/50 shadow-sm"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`size-10 rounded-lg grid place-items-center ${
                        form.metodo === "cartao" ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-500"
                      }`}>
                        <CreditCard className="size-5" />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-forest-800">Cartão de crédito</p>
                        <p className="text-xs text-gray-500">À vista no cartão</p>
                      </div>
                    </div>
                  </button>
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" size="lg" onClick={() => setStep(1)}>
                    <ArrowLeft className="size-4" />
                    Voltar
                  </Button>
                  <Button onClick={processarPagamento} loading={loading} size="lg" className="gap-2">
                    Pagar {formatBRL(19.99)}
                    <ArrowRight className="size-4" />
                  </Button>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-100 grid grid-cols-3 gap-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <Lock className="size-3.5 text-emerald-600" />
                    Pagamento seguro
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="size-3.5 text-emerald-600" />
                    Dados protegidos
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Zap className="size-3.5 text-emerald-600" />
                    Instantâneo
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === 3 && resultado && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <Card className="shadow-xl shadow-forest-800/5 overflow-hidden">
              <div className={`p-8 text-white ${
                resultado.has_debt
                  ? "bg-gradient-to-br from-red-500 to-red-700"
                  : "bg-gradient-to-br from-emerald-500 to-emerald-700"
              }`}>
                <motion.div
                  initial={{ scale: 0, rotate: -90 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.2, type: "spring", duration: 0.7 }}
                  className="size-16 rounded-2xl bg-white/20 backdrop-blur grid place-items-center mb-4"
                >
                  {resultado.has_debt ? (
                    <FileSearch className="size-8 text-white" />
                  ) : (
                    <CheckCircle2 className="size-8 text-white" />
                  )}
                </motion.div>
                <h2 className="font-display text-3xl mb-2">
                  {resultado.has_debt ? "Possui pendências" : "Nome limpo!"}
                </h2>
                <p className="text-white/90">
                  {resultado.has_debt
                    ? "Encontramos pendências no seu CPF. Veja os detalhes abaixo."
                    : "Ótima notícia! Seu CPF está limpo. Recomendamos blindagem."}
                </p>
              </div>

              <CardContent className="p-8">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                  <Stat label="Score" value={String(resultado.score)} valueClass={
                    resultado.score >= 700 ? "text-emerald-600" :
                    resultado.score >= 500 ? "text-amber-600" : "text-red-600"
                  } />
                  <Stat label="Pendências" value={String(resultado.pendencias)} />
                  <Stat label="Total débito" value={resultado.has_debt ? `R$ ${resultado.total}` : "—"} />
                  <Stat label="Status" value={resultado.has_debt ? "Negativado" : "Limpo"} />
                </div>

                <div className="rounded-xl bg-gradient-to-br from-brand-50 via-sand-50 to-brand-50 border border-brand-100 p-6 mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="size-5 text-brand-600" />
                    <p className="font-bold text-brand-800">Próximo passo</p>
                  </div>
                  <p className="text-sm text-forest-800 leading-relaxed">
                    {resultado.has_debt
                      ? "A LNB pode limpar seu nome em até 20 dias úteis, sem você precisar quitar a dívida. Acesse sua conta pra ver o relatório completo e seguir."
                      : "Seu nome está limpo! Pra mantê-lo protegido, contrate a Blindagem de CPF — monitoramento 24/7."}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button onClick={() => router.push("/conta/login")} size="lg" width="full">
                    Acessar minha área
                    <ArrowRight className="size-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    width="full"
                    onClick={() => window.open("https://wa.me/5511999999999", "_blank")}
                  >
                    Falar com consultor
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Stat({
  label, value, valueClass,
}: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="text-center sm:text-left">
      <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">{label}</p>
      <p className={`font-display text-2xl mt-1 ${valueClass ?? "text-forest-800"}`}>{value}</p>
    </div>
  );
}
