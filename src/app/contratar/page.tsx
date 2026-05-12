"use client";
import { useState, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  CheckCircle2, ArrowLeft, Lock, Shield, AlertCircle, FileSearch,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import {
  formatCPF, cleanCPF, isValidCPF,
  formatCNPJ, cleanCNPJ, isValidCNPJ,
  formatPhone, formatBRL,
} from "@/lib/utils";
import { PLANOS, isPlanoTipo, type PlanoTipo, getPlano } from "@/lib/planos";

export default function ContratarPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-gray-400">Carregando...</div>}>
      <ContratarForm />
    </Suspense>
  );
}

interface Elegibilidade {
  pode: boolean;
  motivo?: string;
  mensagem?: string;
  qtd_pendencias?: number;
  total_dividas?: number;
}

function ContratarForm() {
  const router = useRouter();
  const params = useSearchParams();

  const planoParam = params.get("plano") || "limpeza_desconto";
  const planoTipo: PlanoTipo = isPlanoTipo(planoParam) ? planoParam : "limpeza_desconto";
  const plano = getPlano(planoTipo);
  const cpfFromUrl = params.get("cpf") || "";
  const cnpjFromUrl = params.get("cnpj") || "";

  const isCNPJ = plano.tipoDocumento === "CNPJ";

  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"cpf" | "form" | "bloqueado">(
    plano.requerConsulta ? "cpf" : "form"
  );
  const [eleg, setEleg] = useState<Elegibilidade | null>(null);
  const [validandoCpf, setValidandoCpf] = useState(false);

  const [form, setForm] = useState({
    // CPF (para fluxo PF) OU CPF do responsável (para fluxo PJ)
    cpf: cpfFromUrl ? formatCPF(cpfFromUrl) : "",
    // Campos CNPJ (só usados quando isCNPJ)
    cnpj: cnpjFromUrl ? formatCNPJ(cnpjFromUrl) : "",
    razao_social: "",
    nome_responsavel: "",
    cpf_responsavel: "",
    nome: "",
    email: "",
    telefone: "",
    senha: "",
    aceiteTermos: false,
  });

  // Se chegou da consulta com CPF/CNPJ na URL, valida automaticamente
  useEffect(() => {
    if (plano.requerConsulta && step === "cpf") {
      if (isCNPJ && cnpjFromUrl) {
        const cnpjLimpo = cleanCNPJ(cnpjFromUrl);
        if (isValidCNPJ(cnpjLimpo)) setTimeout(() => validarDocumento(), 200);
      } else if (!isCNPJ && cpfFromUrl) {
        const cpfLimpo = cleanCPF(cpfFromUrl);
        if (isValidCPF(cpfLimpo)) setTimeout(() => validarDocumento(), 200);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function set<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function validarDocumento() {
    setValidandoCpf(true);
    try {
      let url = "";
      if (isCNPJ) {
        const cnpjLimpo = cleanCNPJ(form.cnpj);
        if (!isValidCNPJ(cnpjLimpo)) {
          toast.error("CNPJ inválido");
          setValidandoCpf(false);
          return;
        }
        url = `/api/site/elegibilidade-limpeza?cnpj=${cnpjLimpo}`;
      } else {
        const cpfLimpo = cleanCPF(form.cpf);
        if (!isValidCPF(cpfLimpo)) {
          toast.error("CPF inválido");
          setValidandoCpf(false);
          return;
        }
        url = `/api/site/elegibilidade-limpeza?cpf=${cpfLimpo}`;
      }
      const r = await fetch(url);
      const d: Elegibilidade & { ok: boolean } = await r.json();
      setEleg(d);
      if (d.pode) setStep("form");
      else setStep("bloqueado");
    } catch {
      toast.error(`Erro ao validar ${isCNPJ ? "CNPJ" : "CPF"}. Tente novamente.`);
    } finally {
      setValidandoCpf(false);
    }
  }

  // Alias mantido pra compat de chamadas internas
  const validarCpf = validarDocumento;

  function validate(): string | null {
    if (isCNPJ) {
      if (!isValidCNPJ(cleanCNPJ(form.cnpj))) return "CNPJ inválido";
      if (form.razao_social.length < 2)       return "Informe a razão social";
      if (form.nome_responsavel.length < 2)   return "Informe o nome do responsável";
      if (!isValidCPF(cleanCPF(form.cpf_responsavel))) return "CPF do responsável inválido";
    } else {
      if (!isValidCPF(cleanCPF(form.cpf)))    return "CPF inválido";
      if (form.nome.length < 2)               return "Informe seu nome completo";
    }
    if (!form.email.includes("@"))            return "Email inválido";
    if (form.telefone.replace(/\D/g, "").length < 10) return "Telefone inválido";
    if (form.senha.length < 8)                return "Senha precisa ter ao menos 8 caracteres";
    if (!form.aceiteTermos)                   return "Você precisa aceitar os termos pra prosseguir";
    return null;
  }

  // Mapeia planoTipo → tipo de termos (consulta/limpeza CPF ou CNPJ)
  const tipoTermos: "consulta" | "consulta-cnpj" | "limpeza" | "limpeza-cnpj" =
    planoTipo === "limpeza_cnpj" ? "limpeza-cnpj" :
    planoTipo === "consulta_cnpj" ? "consulta-cnpj" :
    planoTipo === "limpeza_desconto" ? "limpeza" :
    "consulta";

  async function processarPagamento() {
    const err = validate();
    if (err) return toast.error(err);

    setLoading(true);
    try {
      // 1) Registra aceite dos termos antes do checkout
      try {
        await fetch("/api/site/aceite-termos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cpf: cleanCPF(isCNPJ ? form.cpf_responsavel : form.cpf),
            tipo: tipoTermos,
            versao: "1.0",
            telefone: form.telefone.replace(/\D/g, ""),
            nome: isCNPJ ? form.nome_responsavel : form.nome,
          }),
        });
      } catch (e) {
        console.error("[contratar] aceite-termos erro (segue):", e);
      }

      // 2) Cria cobrança Asaas
      const payload: Record<string, unknown> = {
        tipo: planoTipo,
        email: form.email,
        telefone: form.telefone.replace(/\D/g, ""),
        senha: form.senha,
      };
      if (isCNPJ) {
        payload.cnpj = cleanCNPJ(form.cnpj);
        payload.razao_social = form.razao_social;
        payload.nome_responsavel = form.nome_responsavel;
        payload.cpf_responsavel = cleanCPF(form.cpf_responsavel);
        payload.nome = form.razao_social;
      } else {
        payload.cpf = cleanCPF(form.cpf);
        payload.nome = form.nome;
      }
      const r = await fetch("/api/site/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!r.ok || !d.ok || !d.init_point) {
        if (d.requer_consulta) {
          toast.error(d.error || "Faça a consulta primeiro");
          setTimeout(() => router.push("/consultar"), 1200);
        } else {
          toast.error(d.error || "Não conseguimos gerar a cobrança. Tente novamente.");
        }
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
          {/* Resumo do plano */}
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
                  Pagamento seguro · Pix, cartão de crédito ou boleto.
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Form / Validação */}
          <div className="lg:col-span-3">
            <AnimatePresence mode="wait">
              {/* Step 1: Validar CPF ou CNPJ (consulta prévia) */}
              {step === "cpf" && (
                <motion.div
                  key="cpf"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <Card>
                    <CardContent className="p-6 sm:p-8 space-y-5">
                      <div>
                        <h2 className="font-display text-xl sm:text-2xl text-forest-800">
                          Antes de contratar
                        </h2>
                        <p className="text-sm text-gray-700 font-medium mt-1">
                          {isCNPJ
                            ? "A limpeza só faz sentido se a empresa/sócio tem nome sujo. Vamos verificar o CNPJ."
                            : "A limpeza só faz sentido se você tem nome sujo. Vamos verificar seu CPF."}
                        </p>
                      </div>

                      {isCNPJ ? (
                        <div>
                          <Label htmlFor="cnpj-check">CNPJ da empresa</Label>
                          <Input
                            id="cnpj-check"
                            inputMode="numeric"
                            value={form.cnpj}
                            onChange={(e) => set("cnpj", formatCNPJ(e.target.value))}
                            placeholder="00.000.000/0000-00"
                            maxLength={18}
                            autoComplete="off"
                            autoFocus
                          />
                        </div>
                      ) : (
                        <div>
                          <Label htmlFor="cpf-check">Seu CPF</Label>
                          <Input
                            id="cpf-check"
                            inputMode="numeric"
                            value={form.cpf}
                            onChange={(e) => set("cpf", formatCPF(e.target.value))}
                            placeholder="000.000.000-00"
                            autoComplete="off"
                            autoFocus
                          />
                        </div>
                      )}

                      <Button
                        onClick={validarDocumento}
                        loading={validandoCpf}
                        width="full"
                        className="h-12"
                      >
                        {validandoCpf ? "Verificando..." : "Verificar elegibilidade"}
                      </Button>

                      <div className="rounded-xl bg-sand-50 border border-sand-200 p-4 text-xs sm:text-sm text-forest-800 font-medium leading-relaxed">
                        <strong className="font-bold">Por que verificar?</strong> Pra contratar a
                        limpeza você precisa ter feito a consulta {isCNPJ ? "de CNPJ (R$ 24,99)" : "de CPF (R$ 19,99)"} e ter
                        pendências em aberto. Sem isso, não há nada pra limpar.
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Step 2: Bloqueado (CPF não elegível) */}
              {step === "bloqueado" && eleg && (
                <motion.div
                  key="bloqueado"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <Card>
                    <CardContent className="p-6 sm:p-8 space-y-5">
                      <div className="flex items-start gap-3">
                        <div className="size-10 rounded-xl bg-amber-100 grid place-items-center shrink-0">
                          <AlertCircle className="size-5 text-amber-700" />
                        </div>
                        <div>
                          <h2 className="font-display text-xl text-forest-800">
                            CPF não elegível
                          </h2>
                          <p className="text-sm text-gray-700 font-medium mt-1">
                            {eleg.mensagem || "Não foi possível validar."}
                          </p>
                        </div>
                      </div>

                      {eleg.motivo === "sem_consulta" && (
                        <>
                          <div className="rounded-xl bg-brand-50 border border-brand-200 p-4 sm:p-5">
                            <p className="font-bold text-forest-800 text-sm sm:text-base">
                              Faça a consulta primeiro · R$ 19,99
                            </p>
                            <p className="text-xs sm:text-sm text-gray-700 font-medium mt-1">
                              Em minutos você descobre se tem pendências, score, dívidas e
                              credores. Se tiver pendência, você libera a contratação da limpeza.
                            </p>
                          </div>
                          <Link
                            href="/consultar"
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white px-6 h-12 font-bold transition shadow-lg shadow-brand-500/30"
                          >
                            <FileSearch className="size-5" />
                            Consultar meu CPF
                          </Link>
                        </>
                      )}

                      {eleg.motivo === "sem_pendencia" && (
                        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 sm:p-5">
                          <p className="font-bold text-emerald-800 text-sm sm:text-base">
                            Boa notícia: seu nome já está limpo!
                          </p>
                          <p className="text-xs sm:text-sm text-emerald-700 font-medium mt-1">
                            Sem pendências, não há nada pra limpar. Continue mantendo suas contas
                            em dia.
                          </p>
                        </div>
                      )}

                      {(eleg.motivo === "ja_contratada" || eleg.motivo === "processo_ativo") && (
                        <Link
                          href="/conta"
                          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white px-6 h-12 font-bold transition"
                        >
                          Acessar minha área
                        </Link>
                      )}

                      <button
                        onClick={() => setStep("cpf")}
                        className="w-full text-xs sm:text-sm text-gray-700 font-semibold hover:text-brand-600 transition"
                      >
                        ← Tentar com outro CPF
                      </button>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Step 3: Form */}
              {step === "form" && (
                <motion.div
                  key="form"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <Card>
                    <CardContent className="p-6 sm:p-8 space-y-4">
                      <div>
                        <h2 className="font-display text-xl sm:text-2xl text-forest-800">
                          Dados pra contratação
                        </h2>
                        <p className="text-sm text-gray-700 font-medium mt-1">
                          Você vai criar sua conta na LNB e ir pra tela de pagamento seguro.
                        </p>
                      </div>

                      {eleg?.qtd_pendencias && (
                        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 sm:p-4 text-sm text-emerald-800 font-semibold">
                          ✓ Encontramos {eleg.qtd_pendencias} pendência
                          {eleg.qtd_pendencias > 1 ? "s" : ""} no {isCNPJ ? "responsável da empresa" : "seu CPF"}
                          {eleg.total_dividas ? ` (R$ ${Number(eleg.total_dividas).toLocaleString("pt-BR", { minimumFractionDigits: 2 })})` : ""}.
                          Vamos limpar tudo em até 20 dias úteis.
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {isCNPJ ? (
                          <>
                            <div className="sm:col-span-2">
                              <Label htmlFor="cnpj">CNPJ</Label>
                              <Input
                                id="cnpj"
                                inputMode="numeric"
                                value={form.cnpj}
                                onChange={(e) => set("cnpj", formatCNPJ(e.target.value))}
                                placeholder="00.000.000/0000-00"
                                maxLength={18}
                                autoComplete="off"
                                disabled={plano.requerConsulta}
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <Label htmlFor="razao_social">Razão social</Label>
                              <Input
                                id="razao_social"
                                value={form.razao_social}
                                onChange={(e) => set("razao_social", e.target.value)}
                                placeholder="Nome da empresa (Receita Federal)"
                              />
                            </div>
                            <div>
                              <Label htmlFor="nome_responsavel">Nome do responsável (sócio admin)</Label>
                              <Input
                                id="nome_responsavel"
                                value={form.nome_responsavel}
                                onChange={(e) => set("nome_responsavel", e.target.value)}
                                placeholder="Sócio administrador"
                              />
                            </div>
                            <div>
                              <Label htmlFor="cpf_responsavel">CPF do responsável</Label>
                              <Input
                                id="cpf_responsavel"
                                inputMode="numeric"
                                value={form.cpf_responsavel}
                                onChange={(e) => set("cpf_responsavel", formatCPF(e.target.value))}
                                placeholder="000.000.000-00"
                                autoComplete="off"
                              />
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="sm:col-span-2">
                              <Label htmlFor="cpf">CPF</Label>
                              <Input
                                id="cpf"
                                inputMode="numeric"
                                value={form.cpf}
                                onChange={(e) => set("cpf", formatCPF(e.target.value))}
                                placeholder="000.000.000-00"
                                autoComplete="off"
                                disabled={plano.requerConsulta}
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
                          </>
                        )}
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
                      </div>

                      <label
                        htmlFor="aceite-termos-limpeza"
                        className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          form.aceiteTermos
                            ? "bg-emerald-50 border-emerald-200"
                            : "bg-amber-50 border-amber-200"
                        }`}
                      >
                        <input
                          id="aceite-termos-limpeza"
                          type="checkbox"
                          checked={form.aceiteTermos}
                          onChange={(e) => set("aceiteTermos", e.target.checked)}
                          className="mt-0.5 size-5 rounded border-2 border-gray-300 text-brand-600 focus:ring-2 focus:ring-brand-500 cursor-pointer flex-shrink-0"
                        />
                        <span className="text-xs sm:text-sm text-forest-800 leading-relaxed">
                          Li e concordo com os{" "}
                          <Link
                            href={`/termos/${tipoTermos}`}
                            target="_blank"
                            className="font-bold text-brand-600 underline hover:text-brand-700"
                          >
                            Termos e Condições do{" "}
                            {tipoTermos === "limpeza"
                              ? "serviço de Limpeza de Nome + Monitoramento 12m"
                              : tipoTermos === "limpeza-cnpj"
                              ? "serviço de Limpeza CNPJ + Sócio"
                              : tipoTermos === "consulta-cnpj"
                              ? "serviço de Consulta CNPJ"
                              : "serviço de Consulta CPF"}
                          </Link>
                          , com a{" "}
                          <Link
                            href="/privacidade"
                            target="_blank"
                            className="font-bold text-brand-600 underline hover:text-brand-700"
                          >
                            Política de Privacidade (LGPD)
                          </Link>
                          , e autorizo a Limpa Nome Brazil a executar este serviço
                          conforme descrito.
                        </span>
                      </label>

                      <div className="rounded-xl border border-brand-100 bg-brand-50/40 p-4 text-xs text-forest-800 font-medium">
                        Total a pagar agora:{" "}
                        <strong className="font-display text-base text-brand-700">
                          {formatBRL(plano.preco)}
                        </strong>
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
                        Você vai pra tela segura de pagamento (Pix · cartão · boleto).
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
