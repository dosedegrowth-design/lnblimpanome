"use client";
import { useState, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  CheckCircle2, ArrowRight, ArrowLeft, Lock, FileSearch, CreditCard,
  Sparkles, ShieldCheck, Zap, Loader2, Building2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TermosModal } from "@/components/termos-modal";
import {
  formatCPF, cleanCPF, isValidCPF,
  formatCNPJ, cleanCNPJ, isValidCNPJ,
  formatPhone, formatBRL,
} from "@/lib/utils";

const STEPS = [
  { n: 1, label: "Identificação", icon: FileSearch },
  { n: 2, label: "Pagamento",     icon: CreditCard },
  { n: 3, label: "Resultado",     icon: Sparkles },
] as const;

export default function ConsultarCNPJPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-gray-400">Carregando...</div>}>
      <ConsultarCNPJWizard />
    </Suspense>
  );
}

function ConsultarCNPJWizard() {
  const router = useRouter();
  const params = useSearchParams();

  const initialStep = params.get("status") === "success" ? 3 : 1;
  const initialCnpj = params.get("cnpj") || "";

  const [step, setStep] = useState<1 | 2 | 3>(initialStep as 1 | 2 | 3);
  const [loading, setLoading] = useState(false);
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [modalTermos, setModalTermos] = useState<null | "consulta_cnpj" | "privacidade">(null);
  const [polling, setPolling] = useState(false);
  const [clienteLogado, setClienteLogado] = useState(false);
  const [pollResult, setPollResult] = useState<{
    paga: boolean;
    realizada: boolean;
    pdf_pronto: boolean;
    tem_pendencia: boolean | null;
    qtd_pendencias: number | null;
    total_dividas: number | null;
    razao_social?: string | null;
  } | null>(null);

  const [form, setForm] = useState({
    cnpj: initialCnpj ? formatCNPJ(initialCnpj) : "",
    razao_social: "",
    nome_responsavel: "",
    cpf_responsavel: "",
    email: "",
    telefone: "",
    senha: "",
  });

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  // Pré-preenche dados do responsável se cliente já estiver logado (PF previamente cadastrado)
  useEffect(() => {
    if (step === 3) return;
    (async () => {
      try {
        const r = await fetch("/api/cliente/me");
        const d = await r.json();
        if (d.ok && d.logado) {
          setClienteLogado(true);
          setForm((f) => ({
            ...f,
            nome_responsavel: d.nome || f.nome_responsavel,
            cpf_responsavel: d.cpf ? formatCPF(d.cpf) : f.cpf_responsavel,
            email: d.email || f.email,
            telefone: d.telefone ? formatPhone(d.telefone) : f.telefone,
            senha: "********",
          }));
        }
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function validateStep1(): string | null {
    if (!isValidCNPJ(cleanCNPJ(form.cnpj))) return "CNPJ inválido";
    if (form.razao_social.length < 2) return "Informe a razão social";
    if (form.nome_responsavel.length < 2) return "Informe o nome do responsável (sócio admin)";
    if (!isValidCPF(cleanCPF(form.cpf_responsavel))) return "CPF do responsável inválido";
    if (!form.email.includes("@")) return "Email inválido";
    if (form.telefone.replace(/\D/g, "").length < 10) return "Telefone inválido";
    if (!clienteLogado && form.senha.length < 8) return "Senha precisa ter ao menos 8 caracteres";
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
    if (!aceitouTermos) {
      toast.error("Você precisa aceitar os Termos pra continuar");
      return;
    }
    setLoading(true);
    try {
      // 1) Registra aceite dos termos
      try {
        await fetch("/api/site/aceite-termos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cpf: cleanCPF(form.cpf_responsavel), // identidade do aceitante é o sócio
            tipo: "consulta-cnpj",
            versao: "1.0",
            telefone: form.telefone.replace(/\D/g, ""),
            nome: form.nome_responsavel,
          }),
        });
      } catch (e) {
        console.error("[consultar-cnpj] aceite-termos erro (segue):", e);
      }

      // 2) Cria cobrança Asaas
      const r = await fetch("/api/site/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: "consulta_cnpj",
          cnpj: cleanCNPJ(form.cnpj),
          razao_social: form.razao_social,
          nome_responsavel: form.nome_responsavel,
          cpf_responsavel: cleanCPF(form.cpf_responsavel),
          nome: form.razao_social, // razão social é o "nome" no payment
          email: form.email,
          telefone: form.telefone.replace(/\D/g, ""),
          senha: form.senha,
        }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok || !d.init_point) {
        // CNPJ já consultado → manda pro relatório
        if (d.motivo === "consulta_ja_paga" && d.redirect) {
          toast.info("Esta empresa já tem consulta paga. Levando você ao relatório.");
          setTimeout(() => router.push(d.redirect), 1200);
          return;
        }
        // CPF do responsável já tem cadastro → manda pro login
        if (d.motivo === "cpf_ja_cadastrado") {
          toast.info("O CPF do responsável já tem cadastro. Faça login com sua senha pra continuar.");
          setTimeout(() => router.push("/conta/login"), 1500);
          return;
        }
        toast.error(d.error || "Não conseguimos gerar a cobrança. Tente novamente.");
        setLoading(false);
        return;
      }

      try { localStorage.setItem("lnb_last_cnpj", d.cnpj); } catch {}
      window.location.assign(d.init_point);
    } catch (e) {
      console.error(e);
      toast.error("Falha de conexão. Tente novamente.");
      setLoading(false);
    }
  }

  // Polling resultado pós-pagamento
  useEffect(() => {
    if (step !== 3) return;
    const cnpjPoll =
      initialCnpj ||
      (typeof window !== "undefined" ? localStorage.getItem("lnb_last_cnpj") || "" : "");
    if (!cnpjPoll) return;

    setPolling(true);
    let cancelled = false;

    const poll = async () => {
      try {
        const r = await fetch(`/api/site/consulta-status/${cleanCNPJ(cnpjPoll)}`);
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
            razao_social: d.razao_social ?? null,
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
  }, [step, initialCnpj]);

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
                <div className="inline-flex items-center gap-2 mb-3">
                  <Building2 className="size-5 text-forest-700"/>
                  <p className="text-xs font-bold uppercase tracking-widest text-forest-700">
                    Consulta CNPJ
                  </p>
                </div>
                <h2 className="font-display text-3xl text-forest-800 mb-2">Quem é a empresa?</h2>
                <p className="text-gray-500 mb-8">
                  Vamos consultar a Receita Federal + score/pendências do sócio responsável.
                  <br /><strong className="text-forest-700">Cadastro 100% protegido.</strong>
                </p>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="cnpj">CNPJ da empresa *</Label>
                    <Input id="cnpj" inputMode="numeric" required
                      value={form.cnpj} onChange={(e) => set("cnpj", formatCNPJ(e.target.value))}
                      placeholder="00.000.000/0000-00" maxLength={18} />
                  </div>
                  <div>
                    <Label htmlFor="razao_social">Razão social *</Label>
                    <Input id="razao_social" required value={form.razao_social}
                      onChange={(e) => set("razao_social", e.target.value)}
                      placeholder="Nome da empresa conforme Receita Federal" />
                  </div>

                  <div className="pt-4 mt-4 border-t border-gray-200">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
                      Sócio administrador / responsável
                    </p>
                    <p className="text-xs text-gray-600 mb-4">
                      Pra consulta de crédito empresarial, precisamos verificar o CPF do responsável legal (sócio admin).
                    </p>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="nome_responsavel">Nome completo do responsável *</Label>
                        <Input id="nome_responsavel" required value={form.nome_responsavel}
                          onChange={(e) => set("nome_responsavel", e.target.value)}
                          placeholder="Sócio administrador" />
                      </div>
                      <div>
                        <Label htmlFor="cpf_responsavel">CPF do responsável *</Label>
                        <Input id="cpf_responsavel" inputMode="numeric" required
                          value={form.cpf_responsavel}
                          onChange={(e) => set("cpf_responsavel", formatCPF(e.target.value))}
                          placeholder="000.000.000-00" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 mt-4 border-t border-gray-200">
                    <div>
                      <Label htmlFor="email">Email da empresa *</Label>
                      <Input id="email" type="email" required value={form.email}
                        onChange={(e) => set("email", e.target.value)}
                        placeholder="contato@empresa.com.br" />
                    </div>
                    <div>
                      <Label htmlFor="telefone">WhatsApp *</Label>
                      <Input id="telefone" inputMode="numeric" required
                        value={form.telefone} onChange={(e) => set("telefone", formatPhone(e.target.value))}
                        placeholder="(11) 99999-9999" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="senha">Crie uma senha de acesso *</Label>
                    <Input id="senha" type="password" required minLength={8}
                      value={form.senha} onChange={(e) => set("senha", e.target.value)}
                      placeholder="Mínimo 8 caracteres" />
                    <p className="text-xs text-gray-500 mt-1.5">
                      Pra acessar sua área logada depois.
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
                  Dados criptografados (LGPD compatível)
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
                  Você vai pra uma tela segura e finaliza com Pix (instantâneo), cartão ou boleto.
                </p>

                <div className="rounded-xl bg-sand-50 border border-sand-300/40 p-5 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="font-bold text-forest-800">Consulta CNPJ</p>
                      <p className="text-xs text-gray-500">Resultado em até 5 minutos no WhatsApp e na sua conta</p>
                    </div>
                    <span className="font-display text-2xl text-forest-800">{formatBRL(39.99)}</span>
                  </div>
                  <div className="pt-4 border-t border-sand-300/40 flex items-center justify-between">
                    <span className="font-semibold text-forest-800">Total</span>
                    <span className="font-display text-3xl text-brand-600">{formatBRL(39.99)}</span>
                  </div>
                </div>

                <div className="rounded-xl bg-brand-50/50 border border-brand-100 p-4 mb-6 text-sm text-forest-800">
                  <strong>O que você vai receber:</strong>
                  <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-700">
                    <li>Cadastro Receita Federal (razão social, sócios, situação)</li>
                    <li>Score de crédito do sócio responsável</li>
                    <li>Pendências financeiras do sócio admin</li>
                    <li>Relatório PDF completo por email</li>
                    <li>Acesso à área online da sua empresa</li>
                  </ul>
                </div>

                {/* Aceite obrigatório */}
                <label
                  htmlFor="aceite-termos-cnpj"
                  className={`flex items-start gap-3 p-4 mb-4 rounded-xl border-2 cursor-pointer transition-all ${
                    aceitouTermos
                      ? "bg-emerald-50 border-emerald-200"
                      : "bg-amber-50 border-amber-200"
                  }`}
                >
                  <input
                    id="aceite-termos-cnpj"
                    type="checkbox"
                    checked={aceitouTermos}
                    onChange={(e) => setAceitouTermos(e.target.checked)}
                    className="mt-0.5 size-5 rounded border-2 border-gray-300 text-brand-600 focus:ring-2 focus:ring-brand-500 cursor-pointer flex-shrink-0"
                  />
                  <span className="text-sm leading-relaxed text-forest-800">
                    Li e concordo com os{" "}
                    <button type="button" onClick={(e) => { e.preventDefault(); setModalTermos("consulta_cnpj"); }}
                       className="font-bold text-brand-600 underline hover:text-brand-700">
                      Termos e Condições da Consulta CNPJ
                    </button>
                    , com a{" "}
                    <button type="button" onClick={(e) => { e.preventDefault(); setModalTermos("privacidade"); }}
                       className="font-bold text-brand-600 underline hover:text-brand-700">
                      Política de Privacidade (LGPD)
                    </button>
                    , e autorizo expressamente a Limpa Nome Brazil a consultar o CNPJ da empresa
                    (Receita Federal) e o CPF do sócio responsável (Serasa, SPC, Boa Vista) pra
                    geração do relatório.
                  </span>
                </label>

                <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3">
                  <Button variant="outline" size="lg" width="full" className="sm:w-auto" onClick={() => setStep(1)}>
                    <ArrowLeft className="size-4" /> Voltar
                  </Button>
                  <Button
                    onClick={processarPagamento}
                    loading={loading}
                    disabled={!aceitouTermos}
                    size="lg" width="full"
                    className="sm:w-auto gap-2"
                  >
                    Ir para pagamento {formatBRL(39.99)}
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
                    <Zap className="size-3.5 text-emerald-600" /> Pix · Cartão · Boleto
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
              <div className="p-8 bg-gradient-to-br from-forest-700 to-forest-900 text-white">
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
                    ? "Consulta CNPJ concluída!"
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
                    label="Consulta realizada nos órgãos oficiais"
                  />
                  <Step
                    done={!!pollResult?.pdf_pronto}
                    loading={!!pollResult?.realizada && !pollResult?.pdf_pronto}
                    pending={!pollResult?.realizada}
                    label="Relatório CNPJ PDF gerado"
                  />
                </ol>

                {/* Upsell limpeza CNPJ */}
                {pollResult?.realizada && pollResult.tem_pendencia === true && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="rounded-2xl bg-gradient-to-br from-forest-800 to-forest-900 p-6 sm:p-8 text-white border-2 border-brand-500/30 shadow-xl"
                  >
                    <span className="inline-flex items-center rounded-full bg-brand-500 text-white text-[10px] sm:text-xs font-bold px-3 py-1 uppercase tracking-wider">
                      Recomendado pra empresa
                    </span>
                    <h3 className="mt-3 font-display text-2xl sm:text-3xl">
                      {pollResult.qtd_pendencias ?? "Encontramos"} pendência
                      {(pollResult.qtd_pendencias ?? 0) > 1 ? "s" : ""} no responsável da empresa
                    </h3>
                    <p className="mt-2 text-sand-100 font-medium text-sm sm:text-base">
                      {pollResult.total_dividas
                        ? `Total: R$ ${Number(pollResult.total_dividas).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}. `
                        : ""}
                      Limpamos o nome do sócio responsável em até 20 dias úteis, sem precisar quitar nada.
                    </p>
                    <div className="mt-5 grid grid-cols-2 gap-3 text-xs sm:text-sm font-semibold">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-brand-400 shrink-0" /> Sem quitar dívida
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-brand-400 shrink-0" /> 20 dias úteis
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-brand-400 shrink-0" /> Monitoramento 12m bônus
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-brand-400 shrink-0" /> Painel pra acompanhar
                      </div>
                    </div>
                    <div className="mt-5 flex items-baseline gap-2">
                      <span className="font-display text-3xl sm:text-4xl">R$ 580,01</span>
                      <span className="text-xs text-sand-200 font-semibold">à vista · 12x no cartão</span>
                    </div>
                    <Button
                      onClick={() => router.push(`/contratar?plano=limpeza_cnpj&cnpj=${cleanCNPJ(form.cnpj || initialCnpj)}`)}
                      size="lg"
                      width="full"
                      className="mt-5 bg-brand-500 hover:bg-brand-400 shadow-lg shadow-brand-500/40 text-base"
                    >
                      <Sparkles className="size-5" />
                      Limpar nome da empresa
                      <ArrowRight className="size-4" />
                    </Button>
                  </motion.div>
                )}

                {pollResult?.realizada && pollResult.tem_pendencia === false && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="rounded-xl bg-emerald-50 border border-emerald-200 p-5"
                  >
                    <p className="font-bold text-emerald-800 text-base">
                      🎉 Boa notícia: empresa e sócio sem pendências!
                    </p>
                    <p className="text-sm text-emerald-700 font-medium mt-1">
                      Seu negócio está apto a obter crédito normalmente. Continue mantendo as contas em dia.
                    </p>
                  </motion.div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-gray-100">
                  <Button
                    onClick={() => router.push("/conta/login")}
                    size="lg" width="full"
                    disabled={!pollResult?.realizada}
                  >
                    {pollResult?.realizada ? "Acessar minha área" : "Aguardando..."}
                    <ArrowRight className="size-4" />
                  </Button>
                  <Button
                    variant="outline" size="lg" width="full"
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

      <TermosModal
        open={modalTermos !== null}
        onClose={() => setModalTermos(null)}
        onAceitar={() => setAceitouTermos(true)}
        tipo={modalTermos ?? "consulta_cnpj"}
      />
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
