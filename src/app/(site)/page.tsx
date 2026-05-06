import Link from "next/link";
import {
  ShieldCheck, FileSearch, Sparkles, ArrowRight, CheckCircle2, Clock, Lock, MessageCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const WHATSAPP =
  "https://wa.me/5511999999999?text=" +
  encodeURIComponent("Olá! Quero limpar meu nome com a LNB.");

export default function HomePage() {
  return (
    <>
      {/* ===================== HERO ===================== */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-50 via-white to-white -z-10" />
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-brand-100 blur-3xl opacity-60 -z-10" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-16 pb-20 lg:pt-24 lg:pb-28">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 border border-brand-200 px-3 py-1 text-xs font-medium text-brand-700 mb-6">
                <Sparkles className="size-3.5" />
                100% digital · resultado em minutos
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 leading-[1.1]">
                Seu nome <span className="text-brand-500">limpo</span>,
                <br className="hidden sm:block" />
                sem sair de casa.
              </h1>

              <p className="mt-6 text-lg text-gray-600 max-w-xl leading-relaxed">
                Consulta de CPF, limpeza de nome e blindagem de crédito —
                tudo via WhatsApp. Você não precisa quitar a dívida nem entrar em
                acordo com cada credor. A gente cuida de tudo.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <a
                  href={WHATSAPP}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-brand-500 hover:bg-brand-600 px-6 h-12 text-base font-semibold text-white shadow-lg shadow-brand-500/25 transition"
                >
                  <MessageCircle className="size-5" />
                  Consultar meu CPF agora
                </a>
                <Link
                  href="#como-funciona"
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-6 h-12 text-base font-medium text-gray-800 hover:bg-gray-50 transition"
                >
                  Como funciona
                  <ArrowRight className="size-4" />
                </Link>
              </div>

              <ul className="mt-8 space-y-2 text-sm text-gray-600">
                {[
                  "Sem precisar quitar a dívida",
                  "Atendimento 100% via WhatsApp",
                  "Acompanhamento online do processo",
                ].map((t) => (
                  <li key={t} className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-brand-500" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative">
              <div className="aspect-[4/3] rounded-2xl bg-white shadow-2xl shadow-brand-500/10 border border-gray-200 p-8 flex flex-col justify-center">
                <div className="space-y-5">
                  <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                    <div className="size-12 rounded-full bg-brand-100 grid place-items-center">
                      <FileSearch className="size-6 text-brand-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Relatório</p>
                      <p className="font-semibold text-gray-900">Consulta CPF</p>
                    </div>
                    <span className="ml-auto inline-flex items-center rounded-full bg-red-50 text-red-700 text-xs font-semibold px-2.5 py-1">Com pendências</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Score de crédito</p>
                    <p className="text-5xl font-bold text-brand-500 mt-1">412</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-2 text-sm">
                    <div>
                      <p className="text-gray-500 text-xs">Pendências</p>
                      <p className="font-semibold text-gray-900">3 credores</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Total débitos</p>
                      <p className="font-semibold text-gray-900">R$ 4.872,00</p>
                    </div>
                  </div>
                  <div className="bg-brand-50 rounded-lg p-4 mt-2">
                    <p className="text-xs font-medium text-brand-800">
                      ✨ A LNB pode resolver isso em até 20 dias úteis
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== TRUST BAR ===================== */}
      <section className="border-y border-gray-200 bg-gray-50/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm">
          {[
            { icon: Lock, title: "Dados protegidos", desc: "Sigilo bancário e LGPD" },
            { icon: Clock, title: "Resultado rápido", desc: "Limpeza em até 20 dias úteis" },
            { icon: ShieldCheck, title: "Blindagem inclusa", desc: "Monitoramento contínuo do CPF" },
          ].map((it, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-white shadow-sm border border-gray-200 grid place-items-center">
                <it.icon className="size-5 text-brand-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{it.title}</p>
                <p className="text-gray-500 text-xs">{it.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===================== COMO FUNCIONA ===================== */}
      <section id="como-funciona" className="py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-brand-600 font-semibold text-sm uppercase tracking-wide">Como funciona</span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-bold text-gray-900">
              Três passos pra limpar seu nome
            </h2>
            <p className="mt-4 text-gray-600">
              Sem burocracia, sem sair de casa, sem ter que negociar com credor.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                n: "01",
                t: "Consulta de CPF",
                d: "Por R$ 19,99 você descobre na hora se seu nome tem pendências, qual o score, quanto deve e pra quem.",
                icon: FileSearch,
              },
              {
                n: "02",
                t: "Plano de limpeza",
                d: "Mostramos como vamos limpar seu nome — sem você precisar quitar dívida ou negociar com credor.",
                icon: Sparkles,
              },
              {
                n: "03",
                t: "Nome limpo + blindagem",
                d: "Em até 20 dias úteis seu nome volta limpo. Blindagem ativa monitora seu CPF continuamente.",
                icon: ShieldCheck,
              },
            ].map((step) => (
              <Card key={step.n} className="p-8 hover:border-brand-300 transition group">
                <CardContent className="p-0 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-4xl font-bold text-brand-200 group-hover:text-brand-300 transition">{step.n}</span>
                    <div className="size-12 rounded-xl bg-brand-50 grid place-items-center">
                      <step.icon className="size-6 text-brand-600" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">{step.t}</h3>
                  <p className="text-gray-600 leading-relaxed">{step.d}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== SERVIÇOS / PREÇOS ===================== */}
      <section id="servicos" className="py-20 lg:py-28 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-brand-600 font-semibold text-sm uppercase tracking-wide">Serviços</span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-bold text-gray-900">Preços transparentes</h2>
            <p className="mt-4 text-gray-600">Você sabe exatamente o que está pagando, antes de pagar.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl mx-auto">
            <Card className="p-8">
              <CardContent className="p-0 space-y-5">
                <div>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Primeiro passo</span>
                  <h3 className="text-2xl font-bold text-gray-900 mt-1">Consulta CPF</h3>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-bold text-gray-900">R$ 19</span>
                  <span className="text-2xl font-bold text-gray-900">,99</span>
                  <span className="text-gray-500 ml-1">à vista</span>
                </div>
                <ul className="space-y-2.5 text-sm text-gray-700">
                  {[
                    "Score de crédito atualizado",
                    "Lista completa de pendências e credores",
                    "Valor total de débitos",
                    "Relatório PDF enviado no WhatsApp",
                    "Resultado em minutos",
                  ].map((b) => (
                    <li key={b} className="flex gap-2">
                      <CheckCircle2 className="size-5 text-brand-500 shrink-0 mt-0.5" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href={WHATSAPP}
                  target="_blank"
                  rel="noopener"
                  className="block text-center rounded-md border border-brand-300 text-brand-700 hover:bg-brand-50 px-6 h-12 leading-[3rem] font-semibold transition"
                >
                  Quero consultar meu CPF
                </a>
              </CardContent>
            </Card>

            <Card className="p-8 border-2 border-brand-500 relative">
              <span className="absolute -top-3 left-8 inline-flex items-center rounded-full bg-brand-500 text-white text-xs font-bold px-3 py-1 shadow-md">
                MAIS ESCOLHIDO
              </span>
              <CardContent className="p-0 space-y-5">
                <div>
                  <span className="text-xs font-semibold text-brand-700 uppercase tracking-wide">Solução completa</span>
                  <h3 className="text-2xl font-bold text-gray-900 mt-1">Limpeza + Blindagem</h3>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-bold text-gray-900">R$ 480</span>
                  <span className="text-2xl font-bold text-gray-900">,01</span>
                  <span className="text-gray-500 ml-1">com desconto</span>
                </div>
                <p className="text-xs text-gray-500 -mt-3">
                  Já desconta os R$ 19,99 da consulta
                </p>
                <ul className="space-y-2.5 text-sm text-gray-700">
                  {[
                    "Limpeza completa do nome em até 20 dias úteis",
                    "Você não precisa quitar a dívida",
                    "Blindagem de CPF inclusa (monitoramento)",
                    "Painel online pra acompanhar o processo",
                    "Consultor dedicado",
                    "Atualizações por WhatsApp e email",
                  ].map((b) => (
                    <li key={b} className="flex gap-2">
                      <CheckCircle2 className="size-5 text-brand-500 shrink-0 mt-0.5" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href={WHATSAPP}
                  target="_blank"
                  rel="noopener"
                  className="block text-center rounded-md bg-brand-500 hover:bg-brand-600 text-white px-6 h-12 leading-[3rem] font-semibold shadow-lg shadow-brand-500/25 transition"
                >
                  Quero limpar meu nome
                </a>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ===================== BLINDAGEM ===================== */}
      <section id="blindagem" className="py-20 lg:py-28">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <Card className="overflow-hidden border-0 shadow-xl">
            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="bg-gradient-to-br from-brand-600 to-brand-800 p-10 text-white flex flex-col justify-center">
                <ShieldCheck className="size-12 mb-4 opacity-90" />
                <h2 className="text-3xl font-bold mb-3">Blindagem de CPF</h2>
                <p className="text-brand-50 leading-relaxed">
                  Inclusa em todo plano de limpeza. Monitoramos seu CPF
                  diariamente e te avisamos no WhatsApp se aparecer
                  qualquer nova pendência.
                </p>
              </div>
              <div className="p-10 space-y-4">
                {[
                  "Verificação automática diária",
                  "Alerta imediato no WhatsApp",
                  "Análise de novas pendências por consultor",
                  "Histórico mensal por email",
                ].map((b) => (
                  <div key={b} className="flex items-start gap-3">
                    <CheckCircle2 className="size-5 text-brand-500 shrink-0 mt-0.5" />
                    <span className="text-gray-700">{b}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* ===================== FAQ ===================== */}
      <section id="faq" className="py-20 lg:py-28 bg-gray-50">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-brand-600 font-semibold text-sm uppercase tracking-wide">Dúvidas frequentes</span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-bold text-gray-900">Perguntas comuns</h2>
          </div>
          <div className="space-y-3">
            {[
              {
                q: "Eu preciso quitar a dívida pra ter o nome limpo?",
                a: "Não. Nosso processo limpa seu nome SEM você precisar negociar com cada credor ou quitar débito antigo. Sua situação fica regularizada e você volta a ter crédito.",
              },
              {
                q: "Quanto tempo demora pra limpar?",
                a: "Em média 20 dias úteis após a contratação. Você acompanha cada etapa pelo painel online e via WhatsApp.",
              },
              {
                q: "É legal? É seguro?",
                a: "Sim. Operamos dentro da lei brasileira (Lei do Cadastro Positivo, LGPD). Seus dados ficam protegidos com criptografia.",
              },
              {
                q: "E se aparecer outra dívida depois?",
                a: "Por isso a Blindagem está inclusa: monitoramos seu CPF continuamente. Se algo novo aparecer, te alertamos imediatamente.",
              },
              {
                q: "Atende o Brasil todo?",
                a: "Sim. O serviço é 100% digital, atendemos qualquer estado. Tudo via WhatsApp.",
              },
            ].map((item, i) => (
              <details
                key={i}
                className="group rounded-lg border border-gray-200 bg-white p-5 open:shadow-md transition"
              >
                <summary className="flex justify-between items-center cursor-pointer font-semibold text-gray-900 list-none">
                  {item.q}
                  <span className="ml-4 size-6 rounded-full bg-brand-50 grid place-items-center text-brand-600 group-open:rotate-45 transition">+</span>
                </summary>
                <p className="mt-3 text-gray-600 leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== CTA FINAL ===================== */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 p-10 lg:p-16 text-center shadow-2xl shadow-brand-500/20">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Pronto pra limpar seu nome?
            </h2>
            <p className="text-brand-50 text-lg mb-8 max-w-xl mx-auto">
              Mais de 10 mil pessoas já voltaram a ter crédito com a LNB. Sua vez.
            </p>
            <a
              href={WHATSAPP}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-2 rounded-md bg-white text-brand-700 hover:bg-brand-50 px-8 h-14 font-semibold text-lg shadow-lg transition"
            >
              <MessageCircle className="size-6" />
              Falar no WhatsApp
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
