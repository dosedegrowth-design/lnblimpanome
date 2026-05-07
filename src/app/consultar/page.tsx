"use client";
import { useState, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  CheckCircle2, ArrowRight, ArrowLeft, Lock, FileSearch, CreditCard,
  Sparkles, ShieldCheck, Zap, Loader2,
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

export default function ConsultarPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-gray-400">Carregando...</div>}>
      <ConsultarWizard />
    </Suspense>
  );
}

function ConsultarWizard() {
  const router = useRouter();
  const params = useSearchParams();

  // Suporta volta do MP via query string ?status=success&cpf=...
  const initialStep = params.get("status") === "success" ? 3 : 1;
  const initialCpf = params.get("cpf") || "";

  const [step, setStep] = useState<1 | 2 | 3>(initialStep as 1 | 2 | 3);
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);
  const [pollResult, setPollResult] = useState<{
    paga: boolean;
    realizada: boolean;
    pdf_pronto: boolean;
    tem_pendencia: boolean | null;
    qtd_pendencias: number | null;
    total_dividas: number | null;
  } | null>(null);

  const [form, setForm] = useState({
    cpf: initialCpf ? formatCPF(initialCpf) : "",
    nome: "",
    email: "",
    telefone: "",
    senha: "",
  });

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function validateStep1(): string | null {
    if (!isValidCPF(cleanCPF(form.cpf))) return "CPF inválido";
    if (form.nome.length < 2)            return "Informe seu nome completo";
    if (!form.email.includes("@"))       return "Email inválido";
    if (form.telefone.replace(/\D/g, "").length < 10) return "Telefone inválido";
    if (form.senha.length < 8)           return "Senha precisa ter ao menos 8 caracteres";
    return null;
  }

  function nextStep() {
    if (step === 1) {
      const err = validateStep1();
      if (err) return toast.error(err);
    }
    setStep((s) => Math.min(3, s + 1) as 1 | 2 | 3);
  }

  async function processarPagamento() {
    setLoading(true);
    try {
      const r = await fetch("/api/site/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: "consulta",
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

      // Salva CPF em localStorage pra recuperar quando voltar do MP
      try { localStorage.setItem("lnb_last_cpf", d.cpf); } catch {}

      // Redireciona pro Mercado Pago Checkout
      window.location.assign(d.init_point);
    } catch (e) {
      console.error(e);
      toast.error("Falha de conexão. Tente novamente.");
      setLoading(false);
    }
  }

  // Polling do resultado quando o cliente volta do Mercado Pago no step 3
  useEffect(() => {
    if (step !== 3) return;
    const cpfPoll =
      initialCpf ||
      (typeof window !== "undefined" ? localStorage.getItem("lnb_last_cpf") || "" : "");
    if (!cpfPoll) return;

    setPolling(true);
    let cancelled = false;

    const poll = async () => {
      try {
        const r = await fetch(`/api/site/consulta-status/${cleanCPF(cpfPoll)}`);
        const d = await r.json();
        if (cancelled) return;
        if (d.ok) {
          setPollResult({
            paga: !!d.paga,
            realizada: !!d.realizada,
            pdf_pronto: !!d.pdf_pronto,
            tem_pendencia: d.tem_pendencia ?? null,
            qtd_pendencias: d.qtd_pendencias ?? null,
            total_dividas: d.total_dividas ?? null,
          });
          if (d.realizada && d.pdf_pronto) {
            setPolling(false);
            return;
          }
        }
        setTimeout(poll, 4000);
      } catch {
        if (!cancelled) setTimeout(poll, 6000);
      }
    };
    poll();
    return () => { cancelled = true; };
  }, [step, initialCpf]);

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
          <motion.div key="step1"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.4 }}>
            <Card className="shadow-xl shadow-forest-800/5">
              <CardContent className="p-8 lg:p-10">
                <h2 className="font-display text-3xl text-forest-800 mb-2">Quem é você?</h2>
                <p className="text-gray-500 mb-8">
                  Preenchemos sua área logada com esses dados.
                  <br /><strong className="text-forest-700">Cadastro 100% protegido.</strong>
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
                      onChange={(e) => set("nome", e.target.value)}
                      placeholder="Como aparece no seu RG" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <Input id="email" type="email" required value={form.email}
                        onChange={(e) => set("email", e.target.value)}
                        placeholder="voce@email.com" />
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
          <motion.div key="step2"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.4 }}>
            <Card className="shadow-xl shadow-forest-800/5">
              <CardContent className="p-8 lg:p-10">
                <h2 className="font-display text-3xl text-forest-800 mb-2">Pagamento</h2>
                <p className="text-gray-500 mb-8">
                  Você será redirecionado pro Mercado Pago pra finalizar com Pix ou cartão.
                </p>

                <div className="rounded-xl bg-sand-50 border border-sand-300/40 p-5 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="font-bold text-forest-800">Consulta CPF</p>
                      <p className="text-xs text-gray-500">Resultado em até 5 minutos no WhatsApp e na sua conta</p>
                    </div>
                    <span className="font-display text-2xl text-forest-800">{formatBRL(19.99)}</span>
                  </div>
                  <div className="pt-4 border-t border-sand-300/40 flex items-center justify-between">
                    <span className="font-semibold text-forest-800">Total</span>
                    <span className="font-display text-3xl text-brand-600">{formatBRL(19.99)}</span>
                  </div>
                </div>

                <div className="rounded-xl bg-brand-50/50 border border-brand-100 p-4 mb-6 text-sm text-forest-800">
                  <strong>Como funciona:</strong>
                  <ol className="list-decimal pl-5 mt-2 space-y-1 text-gray-700">
                    <li>Clique em &quot;Ir para pagamento&quot;</li>
                    <li>No Mercado Pago: Pix (instantâneo) ou cartão</li>
                    <li>Volta pra cá automaticamente após confirmar</li>
                    <li>Seu resultado aparece em minutos</li>
                  </ol>
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" size="lg" onClick={() => setStep(1)}>
                    <ArrowLeft className="size-4" /> Voltar
                  </Button>
                  <Button onClick={processarPagamento} loading={loading} size="lg" className="gap-2">
                    Ir para pagamento {formatBRL(19.99)}
                    <ArrowRight className="size-4" />
                  </Button>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-100 grid grid-cols-3 gap-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <Lock className="size-3.5 text-emerald-600" /> Pagamento seguro
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="size-3.5 text-emerald-600" /> Dados protegidos
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Zap className="size-3.5 text-emerald-600" /> Mercado Pago
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div key="step3"
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
            <Card className="shadow-xl shadow-forest-800/5 overflow-hidden">
              <div className="p-8 bg-gradient-to-br from-brand-500 to-brand-700 text-white">
                <motion.div
                  animate={polling ? { rotate: 360 } : { scale: [1, 1.06, 1] }}
                  transition={polling
                    ? { duration: 2, repeat: Infinity, ease: "linear" }
                    : { duration: 1.5, repeat: Infinity }
                  }
                  className="size-16 rounded-2xl bg-white/20 backdrop-blur grid place-items-center mb-4"
                >
                  {polling ? <Loader2 className="size-8 text-white" /> : <CheckCircle2 className="size-8 text-white" />}
                </motion.div>
                <h2 className="font-display text-3xl mb-2">
                  {pollResult?.realizada
                    ? "Consulta concluída!"
                    : pollResult?.paga
                    ? "Pagamento confirmado — gerando relatório..."
                    : "Aguardando confirmação do pagamento..."}
                </h2>
                <p className="text-white/90">
                  {pollResult?.realizada
                    ? "Seu relatório está pronto. Acesse a área logada pra ver tudo."
                    : "Estamos verificando seu pagamento. Pode levar até 5 minutos."}
                </p>
              </div>

              <CardContent className="p-8 space-y-6">
                <ol className="space-y-3 text-sm">
                  <Step done label="Cadastro feito" />
                  <Step done={!!pollResult?.paga} loading={!pollResult?.paga} label="Pagamento confirmado" />
                  <Step
                    done={!!pollResult?.realizada}
                    loading={!!pollResult?.paga && !pollResult?.realizada}
                    pending={!pollResult?.paga}
                    label="Consulta realizada (API SCPC/Serasa)"
                  />
                  <Step
                    done={!!pollResult?.pdf_pronto}
                    loading={!!pollResult?.realizada && !pollResult?.pdf_pronto}
                    pending={!pollResult?.realizada}
                    label="Relatório PDF gerado"
                  />
                </ol>

                {/* Upsell: tem pendência → CTA forte pra Limpeza */}
                {pollResult?.realizada && pollResult.tem_pendencia === true && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="rounded-2xl bg-gradient-to-br from-forest-800 to-forest-900 p-6 sm:p-8 text-white border-2 border-brand-500/30 shadow-xl"
                  >
                    <span className="inline-flex items-center rounded-full bg-brand-500 text-white text-[10px] sm:text-xs font-bold px-3 py-1 uppercase tracking-wider">
                      Recomendado pra você
                    </span>
                    <h3 className="mt-3 font-display text-2xl sm:text-3xl">
                      Encontramos {pollResult.qtd_pendencias ?? "algumas"} pendência
                      {(pollResult.qtd_pendencias ?? 0) > 1 ? "s" : ""} no seu CPF
                    </h3>
                    <p className="mt-2 text-sand-100 font-medium text-sm sm:text-base">
                      {pollResult.total_dividas
                        ? `Total em dívidas: R$ ${Number(pollResult.total_dividas).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}. `
                        : ""}
                      A boa notícia: a gente limpa tudo em até 20 dias úteis,
                      sem você precisar quitar nada.
                    </p>
                    <div className="mt-5 grid grid-cols-2 gap-3 text-xs sm:text-sm font-semibold">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-brand-400 shrink-0" />
                        Sem quitar dívida
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-brand-400 shrink-0" />
                        20 dias úteis
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-brand-400 shrink-0" />
                        Blindagem 12 meses
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-brand-400 shrink-0" />
                        Painel pra acompanhar
                      </div>
                    </div>
                    <div className="mt-5 flex items-baseline gap-2">
                      <span className="font-display text-3xl sm:text-4xl">R$ 480,01</span>
                      <span className="text-xs text-sand-200 font-semibold">à vista · 12x no cartão</span>
                    </div>
                    <Button
                      onClick={() => router.push(`/contratar?plano=limpeza_desconto&cpf=${cleanCPF(form.cpf || initialCpf)}`)}
                      size="lg"
                      width="full"
                      className="mt-5 bg-brand-500 hover:bg-brand-400 shadow-lg shadow-brand-500/40 text-base"
                    >
                      <Sparkles className="size-5" />
                      Limpar meu nome agora
                      <ArrowRight className="size-4" />
                    </Button>
                  </motion.div>
                )}

                {/* Sem pendência → mensagem positiva (sem upsell) */}
                {pollResult?.realizada && pollResult.tem_pendencia === false && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="rounded-xl bg-emerald-50 border border-emerald-200 p-5"
                  >
                    <p className="font-bold text-emerald-800 text-base">
                      🎉 Boa notícia: seu nome já está limpo!
                    </p>
                    <p className="text-sm text-emerald-700 font-medium mt-1">
                      Não encontramos pendências no seu CPF. Continue mantendo as contas em
                      dia.
                    </p>
                  </motion.div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-gray-100">
                  <Button
                    onClick={() => router.push("/conta/login")}
                    size="lg"
                    width="full"
                    disabled={!pollResult?.realizada}
                  >
                    {pollResult?.realizada ? "Acessar minha área" : "Aguardando..."}
                    <ArrowRight className="size-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    width="full"
                    onClick={() => window.open("https://wa.me/5511997440101", "_blank")}
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

function Step({
  done = false, loading = false, pending = false, label,
}: { done?: boolean; loading?: boolean; pending?: boolean; label: string }) {
  return (
    <li className="flex items-center gap-3">
      <span className={`size-7 rounded-full grid place-items-center shrink-0 ${
        done ? "bg-brand-500 text-white" :
        loading ? "bg-brand-100 text-brand-700" :
        "bg-gray-100 text-gray-400"
      }`}>
        {done ? <CheckCircle2 className="size-4" /> :
         loading ? <Loader2 className="size-3.5 animate-spin" /> :
         <span className="size-2 rounded-full bg-current" />}
      </span>
      <span className={done ? "text-forest-800 font-semibold" : pending ? "text-gray-400" : "text-forest-800"}>
        {label}
      </span>
    </li>
  );
}
