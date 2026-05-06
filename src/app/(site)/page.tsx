import Link from "next/link";
import {
  ShieldCheck, FileSearch, Sparkles, CheckCircle2,
  Clock, Lock, MessageCircle, Zap, Award, Users, TrendingUp,
} from "lucide-react";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { Counter } from "@/components/motion/counter";
import { HeroVisual } from "@/components/site/hero-visual";

const WHATSAPP =
  "https://wa.me/5511999999999?text=" +
  encodeURIComponent("Olá! Quero limpar meu nome com a LNB.");

export default function HomePage() {
  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-mesh-brand pt-12 pb-20 lg:pt-20 lg:pb-32">
        <div className="absolute inset-0 bg-grid opacity-30 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
            <div className="lg:col-span-7">
              <Reveal>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/80 backdrop-blur border border-brand-200 px-3.5 py-1.5 text-xs font-semibold text-brand-700 shadow-sm">
                  <Sparkles className="size-3.5" />
                  100% digital · resultado em minutos
                </span>
              </Reveal>

              <Reveal delay={0.1}>
                <h1 className="mt-6 font-display text-5xl sm:text-6xl lg:text-7xl tracking-tight text-forest-800 leading-[1.05] text-balance">
                  Seu nome <span className="text-brand-500">limpo</span>,
                  <br className="hidden sm:block" />
                  sem sair de casa.
                </h1>
              </Reveal>

              <Reveal delay={0.2}>
                <p className="mt-6 text-lg lg:text-xl text-gray-600 max-w-xl leading-relaxed text-pretty">
                  Consulte seu CPF, limpe seu nome e ative blindagem de crédito —
                  tudo em poucos minutos. <strong className="text-forest-700">Você não precisa quitar a dívida</strong>{" "}
                  nem entrar em acordo com cada credor. A gente cuida de tudo.
                </p>
              </Reveal>

              <Reveal delay={0.3}>
                <div className="mt-10 flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/consultar"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 hover:bg-brand-600 px-7 h-14 text-base font-semibold text-white shadow-lg shadow-brand-500/30 hover:shadow-xl hover:shadow-brand-500/40 hover:-translate-y-0.5 transition-all animate-pulse-glow"
                  >
                    <Zap className="size-5" />
                    Consultar meu CPF agora
                  </Link>
                  <a
                    href={WHATSAPP}
                    target="_blank"
                    rel="noopener"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white/70 backdrop-blur hover:border-forest-500 hover:bg-white px-7 h-14 text-base font-semibold text-forest-800 transition"
                  >
                    <MessageCircle className="size-5" />
                    Falar com consultor
                  </a>
                </div>
              </Reveal>

              <Reveal delay={0.4}>
                <ul className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                  {[
                    "Sem precisar quitar dívida",
                    "Resultado em minutos",
                    "Blindagem de CPF inclusa",
                  ].map((t) => (
                    <li key={t} className="flex items-center gap-2 text-gray-700">
                      <span className="size-5 rounded-full bg-brand-100 grid place-items-center shrink-0">
                        <CheckCircle2 className="size-3.5 text-brand-600" />
                      </span>
                      {t}
                    </li>
                  ))}
                </ul>
              </Reveal>
            </div>

            <Reveal delay={0.3} className="lg:col-span-5">
              <HeroVisual />
            </Reveal>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="border-y border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { value: 10000, label: "Pessoas atendidas",  suffix: "+",  decimals: 0 },
              { value: 87.5,  label: "Taxa de sucesso",    suffix: "%",  decimals: 1 },
              { value: 20,    label: "Dias úteis",          suffix: "",   decimals: 0 },
              { value: 4.9,   label: "Avaliação clientes",  suffix: "/5", decimals: 1 },
            ].map((s) => (
              <Reveal key={s.label} className="text-center">
                <p className="font-display text-4xl lg:text-5xl text-forest-800">
                  <Counter to={s.value} suffix={s.suffix} decimals={s.decimals} />
                </p>
                <p className="mt-2 text-sm text-gray-500">{s.label}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* TRUST BAR */}
      <section className="bg-sand-50 py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Stagger className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm">
            {[
              { icon: Lock,        title: "Dados protegidos",  desc: "Sigilo bancário e LGPD" },
              { icon: Clock,       title: "Resultado rápido",  desc: "Limpeza em até 20 dias úteis" },
              { icon: ShieldCheck, title: "Blindagem inclusa", desc: "Monitoramento contínuo do CPF" },
            ].map((it) => (
              <StaggerItem key={it.title} className="flex items-center gap-4 p-5 rounded-xl bg-white border border-sand-300/40 shadow-sm hover:shadow-md transition">
                <div className="size-12 rounded-xl bg-brand-50 grid place-items-center shrink-0">
                  <it.icon className="size-5 text-brand-600" />
                </div>
                <div>
                  <p className="font-semibold text-forest-800">{it.title}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{it.desc}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section id="como-funciona" className="py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-brand-600 font-semibold text-sm uppercase tracking-widest">Como funciona</span>
            <h2 className="mt-3 font-display text-4xl sm:text-5xl text-forest-800 text-balance">
              Três passos pra <span className="text-brand-500">limpar seu nome</span>
            </h2>
            <p className="mt-4 text-gray-600 text-lg text-pretty">
              Sem burocracia, sem sair de casa, sem ter que negociar com credor.
            </p>
          </Reveal>

          <Stagger className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { n: "01", t: "Consulta de CPF",          d: "Por R$ 19,99 você descobre na hora se seu nome tem pendências, qual o score, quanto deve e pra quem.", icon: FileSearch },
              { n: "02", t: "Plano de limpeza",         d: "Mostramos como vamos limpar seu nome — sem você precisar quitar dívida ou negociar com credor.",       icon: Sparkles   },
              { n: "03", t: "Nome limpo + blindagem",   d: "Em até 20 dias úteis seu nome volta limpo. Blindagem ativa monitora seu CPF continuamente.",            icon: ShieldCheck },
            ].map((step) => (
              <StaggerItem key={step.n}>
                <div className="group relative rounded-2xl border border-gray-200 bg-white p-8 hover:border-brand-300 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                  <div className="flex items-center justify-between mb-6">
                    <span className="font-display text-5xl text-sand-300 group-hover:text-brand-200 transition-colors">{step.n}</span>
                    <div className="size-12 rounded-xl bg-gradient-to-br from-brand-50 to-brand-100 group-hover:from-brand-500 group-hover:to-brand-600 grid place-items-center transition-all">
                      <step.icon className="size-6 text-brand-600 group-hover:text-white transition-colors" />
                    </div>
                  </div>
                  <h3 className="font-display text-2xl text-forest-800 mb-3">{step.t}</h3>
                  <p className="text-gray-600 leading-relaxed text-pretty">{step.d}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* PREÇOS */}
      <section id="servicos" className="py-24 lg:py-32 bg-sand-50/60 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(2,152,217,0.08),transparent_50%)]" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-brand-600 font-semibold text-sm uppercase tracking-widest">Investimento</span>
            <h2 className="mt-3 font-display text-4xl sm:text-5xl text-forest-800 text-balance">
              Preços <span className="text-brand-500">transparentes</span>
            </h2>
            <p className="mt-4 text-gray-600 text-lg">Você sabe exatamente o que está pagando, antes de pagar.</p>
          </Reveal>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl mx-auto">
            <Reveal>
              <div className="h-full p-8 lg:p-10 rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow-md transition">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Primeiro passo</span>
                <h3 className="mt-2 font-display text-3xl text-forest-800">Consulta CPF</h3>
                <div className="mt-6 flex items-baseline gap-1.5">
                  <span className="font-display text-6xl text-forest-800">R$ 19</span>
                  <span className="font-display text-3xl text-forest-800">,99</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">Pix · cartão · resultado na hora</p>

                <ul className="mt-8 space-y-3 text-sm text-gray-700">
                  {[
                    "Score de crédito atualizado",
                    "Lista completa de pendências e credores",
                    "Valor total de débitos",
                    "Relatório PDF + WhatsApp + email",
                    "Resultado em minutos",
                  ].map((b) => (
                    <li key={b} className="flex gap-2.5">
                      <CheckCircle2 className="size-5 text-brand-500 shrink-0 mt-0.5" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>

                <Link href="/consultar" className="mt-8 block text-center rounded-xl border-2 border-brand-300 text-brand-700 hover:bg-brand-50 hover:border-brand-500 px-6 h-12 leading-[3rem] font-semibold transition-all">
                  Consultar agora
                </Link>
              </div>
            </Reveal>

            <Reveal delay={0.15}>
              <div className="relative h-full p-8 lg:p-10 rounded-2xl bg-gradient-to-br from-forest-800 to-forest-900 text-white border-2 border-brand-500/30 shadow-2xl shadow-forest-800/30">
                <span className="absolute -top-3.5 left-8 inline-flex items-center rounded-full bg-brand-500 text-white text-xs font-bold px-4 py-1 shadow-lg uppercase tracking-wider">
                  Mais escolhido
                </span>

                <span className="text-xs font-bold text-brand-300 uppercase tracking-widest">Solução completa</span>
                <h3 className="mt-2 font-display text-3xl text-white">Limpeza + Blindagem</h3>

                <div className="mt-6 flex items-baseline gap-1.5">
                  <span className="font-display text-6xl text-white">R$ 480</span>
                  <span className="font-display text-3xl text-white">,01</span>
                </div>
                <p className="text-sm text-sand-200/70 mt-1">com desconto · já abate os R$ 19,99 da consulta</p>

                <ul className="mt-8 space-y-3 text-sm text-sand-100">
                  {[
                    "Limpeza completa em até 20 dias úteis",
                    "Você não precisa quitar a dívida",
                    "Blindagem de CPF inclusa (monitoramento)",
                    "Painel online pra acompanhar o processo",
                    "Consultor dedicado",
                    "Atualizações por WhatsApp e email",
                  ].map((b) => (
                    <li key={b} className="flex gap-2.5">
                      <CheckCircle2 className="size-5 text-brand-400 shrink-0 mt-0.5" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>

                <a href={WHATSAPP} target="_blank" rel="noopener" className="mt-8 block text-center rounded-xl bg-brand-500 hover:bg-brand-400 text-white px-6 h-12 leading-[3rem] font-semibold shadow-lg shadow-brand-500/40 transition-all">
                  Quero limpar meu nome
                </a>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* BLINDAGEM */}
      <section id="blindagem" className="py-24 lg:py-32">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="rounded-3xl overflow-hidden shadow-2xl shadow-forest-800/15 border border-gray-200/70">
              <div className="grid grid-cols-1 md:grid-cols-2">
                <div className="relative bg-gradient-to-br from-forest-700 via-forest-800 to-forest-900 p-10 lg:p-14 text-white flex flex-col justify-center overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                  <ShieldCheck className="size-14 mb-5 text-brand-300 relative" />
                  <h2 className="relative font-display text-4xl mb-4">Blindagem de CPF</h2>
                  <p className="relative text-sand-100/90 leading-relaxed text-lg">
                    Inclusa em todo plano de limpeza. Monitoramos seu CPF
                    diariamente e te avisamos no WhatsApp se aparecer
                    qualquer nova pendência.
                  </p>
                </div>

                <div className="p-10 lg:p-14 bg-white space-y-5">
                  {[
                    { icon: Zap,           t: "Verificação automática diária",  d: "Cron 24/7 monitora seu CPF" },
                    { icon: MessageCircle, t: "Alerta imediato no WhatsApp",     d: "Saiba antes de qualquer credor" },
                    { icon: Users,         t: "Análise de novas pendências",     d: "Consultor dedicado avalia e age" },
                    { icon: Award,         t: "Histórico mensal por email",      d: "Relatório completo todo mês" },
                  ].map((b) => (
                    <div key={b.t} className="flex items-start gap-4">
                      <div className="size-11 rounded-xl bg-brand-50 grid place-items-center shrink-0">
                        <b.icon className="size-5 text-brand-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-forest-800">{b.t}</p>
                        <p className="text-sm text-gray-500 mt-0.5">{b.d}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 lg:py-32 bg-sand-50">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center mb-14">
            <span className="text-brand-600 font-semibold text-sm uppercase tracking-widest">Dúvidas</span>
            <h2 className="mt-3 font-display text-4xl sm:text-5xl text-forest-800">Perguntas frequentes</h2>
          </Reveal>

          <Stagger className="space-y-3">
            {[
              { q: "Eu preciso quitar a dívida pra ter o nome limpo?",
                a: "Não. Nosso processo limpa seu nome SEM você precisar negociar com cada credor ou quitar débito antigo. Sua situação fica regularizada e você volta a ter crédito." },
              { q: "Quanto tempo demora pra limpar?",
                a: "Em média 20 dias úteis após a contratação. Você acompanha cada etapa pelo painel online e via WhatsApp." },
              { q: "É legal? É seguro?",
                a: "Sim. Operamos dentro da lei brasileira (Lei do Cadastro Positivo, LGPD). Seus dados ficam protegidos com criptografia." },
              { q: "E se aparecer outra dívida depois?",
                a: "Por isso a Blindagem está inclusa: monitoramos seu CPF continuamente. Se algo novo aparecer, te alertamos imediatamente." },
              { q: "Atende o Brasil todo?",
                a: "Sim. O serviço é 100% digital, atendemos qualquer estado." },
              { q: "Posso fazer tudo sozinho sem consultor?",
                a: "Pode! A consulta de CPF é totalmente self-service direto no site. Para a limpeza completa, recomendamos falar com um consultor pra entender seu caso específico." },
            ].map((item, i) => (
              <StaggerItem key={i}>
                <details className="group rounded-xl border border-sand-300/60 bg-white p-5 lg:p-6 open:shadow-lg open:border-brand-300 transition-all">
                  <summary className="flex justify-between items-center cursor-pointer font-semibold text-forest-800 list-none gap-4">
                    {item.q}
                    <span className="ml-4 size-7 rounded-full bg-brand-50 grid place-items-center text-brand-600 group-open:bg-brand-500 group-open:text-white group-open:rotate-45 transition-all shrink-0">+</span>
                  </summary>
                  <p className="mt-4 text-gray-600 leading-relaxed text-pretty">{item.a}</p>
                </details>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-24 lg:py-32">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="relative rounded-3xl bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700 p-10 lg:p-20 text-center shadow-2xl shadow-brand-500/30 overflow-hidden">
              <div className="absolute -top-32 -right-32 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
              <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-forest-700/30 rounded-full blur-3xl" />

              <div className="relative">
                <TrendingUp className="size-12 text-white mx-auto mb-6 opacity-80" />
                <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl text-white mb-5 text-balance">
                  Pronto pra recomeçar?
                </h2>
                <p className="text-brand-50 text-lg lg:text-xl mb-10 max-w-2xl mx-auto text-pretty">
                  Mais de 10 mil pessoas já voltaram a ter crédito com a LNB. Sua vez.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link href="/consultar" className="inline-flex items-center justify-center gap-2 rounded-xl bg-white text-brand-700 hover:bg-sand-50 px-8 h-14 font-semibold text-base shadow-lg transition-all hover:-translate-y-0.5">
                    <Zap className="size-5" />
                    Consultar meu CPF
                  </Link>
                  <a href={WHATSAPP} target="_blank" rel="noopener" className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 backdrop-blur border border-white/30 text-white hover:bg-white/20 px-8 h-14 font-semibold text-base transition">
                    <MessageCircle className="size-5" />
                    Falar no WhatsApp
                  </a>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
