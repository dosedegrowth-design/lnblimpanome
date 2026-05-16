import Link from "next/link";
import {
  ShieldCheck, FileSearch, Sparkles, CheckCircle2,
  Clock, Users, TrendingUp, BellRing, AlertCircle,
} from "lucide-react";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { Counter } from "@/components/motion/counter";
import { HeroVisual } from "@/components/site/hero-visual";
import { CpfIcon } from "@/components/icons/cpf-icon";
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
import { whatsappLink } from "@/lib/contato";
import { Depoimentos } from "@/components/site/depoimentos";
import { Comparativo } from "@/components/site/comparativo";
import { Confianca } from "@/components/site/confianca";
import { PrecosTabs } from "@/components/site/precos-tabs";

const WHATSAPP = whatsappLink("Olá! Quero limpar meu nome com a LNB.");

export default function HomePage() {
  return (
    <>
      {/* HERO — mobile-first */}
      <section className="relative overflow-hidden bg-mesh-brand pt-8 pb-12 sm:pt-12 sm:pb-20 lg:pt-20 lg:pb-32">
        <div className="absolute inset-0 bg-grid opacity-30 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center">
            <div className="lg:col-span-7 text-center lg:text-left">
              <Reveal>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 backdrop-blur border border-brand-200 px-3 py-1 text-[11px] sm:text-xs font-bold text-brand-700 shadow-sm">
                  <Sparkles className="size-3 sm:size-3.5" />
                  100% digital · resultado em minutos
                </span>
              </Reveal>

              <Reveal delay={0.1}>
                <h1 className="mt-4 sm:mt-6 font-display text-[2.5rem] leading-[1.05] sm:text-5xl md:text-6xl lg:text-7xl tracking-tight text-forest-800 text-balance">
                  Seu nome <span className="text-brand-500">limpo</span>,
                  <br className="hidden sm:block" />
                  sem sair de casa.
                </h1>
              </Reveal>

              <Reveal delay={0.2}>
                <p className="mt-4 sm:mt-6 text-base sm:text-lg lg:text-xl text-gray-700 font-medium max-w-xl mx-auto lg:mx-0 leading-relaxed text-pretty">
                  Consulte CPF ou CNPJ e limpe seu nome em até 20 dias úteis.
                  <strong className="text-forest-700 font-bold"> Sem precisar quitar a dívida.</strong>
                </p>
              </Reveal>

              <Reveal delay={0.3}>
                <div className="mt-6 sm:mt-10 flex flex-col sm:flex-row gap-3 mx-auto lg:mx-0 w-full max-w-md sm:max-w-none">
                  <Link
                    href="/contratar?plano=limpeza_desconto"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 hover:bg-brand-600 px-5 sm:px-7 h-12 sm:h-14 text-[15px] sm:text-base font-bold text-white shadow-lg shadow-brand-500/30 hover:shadow-xl hover:-translate-y-0.5 transition-all animate-pulse-glow whitespace-nowrap"
                  >
                    <Sparkles className="size-4 sm:size-5 shrink-0" />
                    Limpar nome agora
                  </Link>
                  <Link
                    href="/consultar"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white/70 backdrop-blur hover:border-brand-500 hover:bg-white px-5 sm:px-7 h-12 sm:h-14 text-[15px] sm:text-base font-bold text-forest-800 transition whitespace-nowrap"
                  >
                    <CpfIcon size={20} className="size-4 sm:size-5 shrink-0" />
                    Consultar antes (R$ 19,99)
                  </Link>
                </div>
                <p className="mt-3 text-xs sm:text-sm text-gray-700 font-medium max-w-md mx-auto lg:mx-0 text-center lg:text-left">
                  Pode contratar a limpeza direto — a consulta vem inclusa.
                  Se não tiver pendência, reembolsamos 100% do valor pago.
                </p>
              </Reveal>

              <Reveal delay={0.4}>
                <ul className="mt-6 sm:mt-10 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 text-xs sm:text-sm max-w-md mx-auto lg:mx-0">
                  {[
                    "Sem precisar quitar dívida",
                    "100% digital · WhatsApp",
                    "Atende CPF e CNPJ",
                  ].map((t) => (
                    <li key={t} className="flex items-center gap-2 text-forest-800 font-semibold justify-center lg:justify-start">
                      <span className="size-5 rounded-full bg-brand-100 grid place-items-center shrink-0">
                        <CheckCircle2 className="size-3 text-brand-600" />
                      </span>
                      {t}
                    </li>
                  ))}
                </ul>
              </Reveal>
            </div>

            <Reveal delay={0.3} className="lg:col-span-5 max-w-sm mx-auto w-full lg:max-w-none">
              <HeroVisual />
            </Reveal>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="border-y border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {[
              { value: 10000, label: "Pessoas atendidas",  suffix: "+",  decimals: 0 },
              { value: 87.5,  label: "Taxa de sucesso",    suffix: "%",  decimals: 1 },
              { value: 20,    label: "Dias úteis",          suffix: "",   decimals: 0 },
              { value: 4.9,   label: "Avaliação",           suffix: "/5", decimals: 1 },
            ].map((s) => (
              <Reveal key={s.label} className="text-center">
                <p className="font-display text-3xl sm:text-4xl lg:text-5xl text-forest-800">
                  <Counter to={s.value} suffix={s.suffix} decimals={s.decimals} />
                </p>
                <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-gray-700 font-semibold">{s.label}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CONFIANÇA — selos LGPD, SSL, Pagamento, Garantia */}
      <Confianca />

      {/* COMO FUNCIONA */}
      <section id="como-funciona" className="py-16 sm:py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center max-w-2xl mx-auto mb-10 sm:mb-16">
            <span className="text-brand-600 font-bold text-xs sm:text-sm uppercase tracking-widest">Como funciona</span>
            <h2 className="mt-2 sm:mt-3 font-display text-3xl sm:text-4xl lg:text-5xl text-forest-800 text-balance">
              Três passos pra <span className="text-brand-500">limpar seu nome</span>
            </h2>
            <p className="mt-3 sm:mt-4 text-gray-700 font-medium text-base sm:text-lg text-pretty px-2">
              Sem burocracia, sem sair de casa, sem ter que negociar com credor.
            </p>
          </Reveal>

          <Stagger className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {[
              { n: "01", t: "Consulta CPF ou CNPJ",      d: "A partir de R$ 29,99 você descobre se há pendências, o score e quem são os credores. Relatório completo em PDF.", icon: FileSearch },
              { n: "02", t: "Plano de limpeza",          d: "Mostramos como vamos limpar seu nome — sem você precisar quitar dívida ou negociar com credor.", icon: Sparkles   },
              { n: "03", t: "Nome limpo em 20 dias",     d: "Em até 20 dias úteis o nome volta limpo. Acompanha tudo pelo painel online e WhatsApp.", icon: ShieldCheck },
            ].map((step) => (
              <StaggerItem key={step.n}>
                <div className="group relative rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 hover:border-brand-300 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                  <div className="flex items-center justify-between mb-4 sm:mb-6">
                    <span className="font-display text-4xl sm:text-5xl text-sand-300 group-hover:text-brand-200 transition-colors">{step.n}</span>
                    <div className="size-11 sm:size-12 rounded-xl bg-gradient-to-br from-brand-50 to-brand-100 group-hover:from-brand-500 group-hover:to-brand-600 grid place-items-center transition-all">
                      <step.icon className="size-5 sm:size-6 text-brand-600 group-hover:text-white transition-colors" />
                    </div>
                  </div>
                  <h3 className="font-display text-xl sm:text-2xl text-forest-800 mb-2 sm:mb-3">{step.t}</h3>
                  <p className="text-gray-700 font-medium leading-relaxed text-pretty text-sm sm:text-base">{step.d}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* COMPARATIVO — Tradicional vs LNB */}
      <Comparativo />

      {/* PREÇOS */}
      <section id="servicos" className="py-16 sm:py-24 lg:py-32 bg-sand-50/60 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(2,152,217,0.08),transparent_50%)]" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center max-w-2xl mx-auto mb-6 sm:mb-10">
            <span className="text-brand-600 font-bold text-xs sm:text-sm uppercase tracking-widest">Investimento</span>
            <h2 className="mt-2 sm:mt-3 font-display text-3xl sm:text-4xl lg:text-5xl text-forest-800 text-balance">
              Preços <span className="text-brand-500">transparentes</span>
            </h2>
            <p className="mt-3 sm:mt-4 text-gray-700 font-medium text-base sm:text-lg px-2">
              Atendemos pessoa física (CPF) e jurídica (CNPJ). Escolha abaixo.
            </p>
          </Reveal>

          <PrecosTabs />

          <p className="text-center text-xs sm:text-sm text-gray-700 font-medium mt-6 sm:mt-8">
            Pagamento seguro · Pix, cartão ou boleto · Garantia de devolução integral
          </p>
        </div>
      </section>

      {/* BLINDAGEM — produto opcional pago */}
      <section id="blindagem" className="py-16 sm:py-24 lg:py-32">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="rounded-3xl overflow-hidden shadow-2xl shadow-forest-800/15 border border-gray-200/70">
              <div className="grid grid-cols-1 md:grid-cols-2">
                <div className="relative bg-gradient-to-br from-forest-700 via-forest-800 to-forest-900 p-8 sm:p-10 lg:p-14 text-white flex flex-col justify-center overflow-hidden">
                  <div className="absolute top-0 right-0 w-48 sm:w-64 h-48 sm:h-64 bg-brand-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                  <span className="relative inline-flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur border border-white/20 px-3 py-1 text-[11px] font-bold text-brand-200 uppercase tracking-widest w-fit mb-3 sm:mb-4">
                    <Sparkles className="size-3" /> Serviço opcional
                  </span>
                  <ShieldCheck className="size-12 sm:size-14 mb-4 sm:mb-5 text-brand-300 relative" />
                  <h2 className="relative font-display text-3xl sm:text-4xl mb-3 sm:mb-4">
                    Blindagem mensal
                  </h2>
                  <p className="relative text-sand-100 font-medium leading-relaxed text-base sm:text-lg">
                    Já tem o nome limpo e quer manter assim? Monitoramos seu CPF ou CNPJ
                    todos os dias e te alertamos no WhatsApp se aparecer qualquer
                    nova pendência — antes do credor.
                  </p>
                  <div className="relative mt-6 flex items-baseline gap-1.5">
                    <span className="font-display text-4xl sm:text-5xl text-white">R$ 29</span>
                    <span className="font-display text-2xl text-white">,90</span>
                    <span className="text-sand-200 font-semibold text-sm ml-1">/mês</span>
                  </div>
                  <p className="relative text-xs sm:text-sm text-sand-200 font-medium mt-1">
                    Sem fidelidade · cancela quando quiser
                  </p>
                  <a
                    href={WHATSAPP}
                    target="_blank"
                    rel="noopener"
                    className="relative mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-white px-5 h-11 sm:h-12 font-bold transition-all text-sm sm:text-base shadow-lg shadow-brand-500/40 w-fit"
                  >
                    <WhatsAppIcon size={18} className="size-4 sm:size-5" />
                    Contratar pelo WhatsApp
                  </a>
                </div>

                <div className="p-8 sm:p-10 lg:p-14 bg-white space-y-4 sm:space-y-5">
                  <p className="text-xs font-bold uppercase tracking-widest text-brand-600 mb-1">
                    O que está incluso
                  </p>
                  {[
                    { icon: Clock,                                                                t: "Verificação automática diária",  d: "Monitoramos seu CPF/CNPJ todo dia, 24/7" },
                    { icon: BellRing,                                                             t: "Alerta imediato no WhatsApp",    d: "Você fica sabendo antes de qualquer credor" },
                    { icon: AlertCircle,                                                          t: "Análise de novas pendências",    d: "Consultor avalia e te orienta como agir" },
                    { icon: WhatsAppIcon as React.ComponentType<{ className?: string }>,          t: "Suporte direto pelo WhatsApp",   d: "Tire dúvidas a qualquer momento" },
                  ].map((b) => (
                    <div key={b.t} className="flex items-start gap-3 sm:gap-4">
                      <div className="size-10 sm:size-11 rounded-xl bg-brand-50 grid place-items-center shrink-0">
                        <b.icon className="size-4 sm:size-5 text-brand-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-forest-800 text-sm sm:text-base">{b.t}</p>
                        <p className="text-xs sm:text-sm text-gray-700 font-medium mt-0.5">{b.d}</p>
                      </div>
                    </div>
                  ))}
                  <p className="text-xs text-gray-600 italic font-medium pt-2 border-t border-gray-100">
                    💡 Recomendado pra quem acabou de limpar o nome ou tem histórico de
                    inadimplência. Não é obrigatório.
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* DEPOIMENTOS */}
      <Depoimentos />

      {/* FAQ */}
      <section id="faq" className="py-16 sm:py-24 lg:py-32 bg-sand-50">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center mb-8 sm:mb-14">
            <span className="text-brand-600 font-bold text-xs sm:text-sm uppercase tracking-widest">Dúvidas</span>
            <h2 className="mt-2 sm:mt-3 font-display text-3xl sm:text-4xl lg:text-5xl text-forest-800">Perguntas frequentes</h2>
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
                a: "Recomendamos contratar a Blindagem mensal (R$ 29,90/mês). Monitoramos seu CPF ou CNPJ todos os dias e te alertamos no WhatsApp se aparecer qualquer nova pendência — antes de qualquer credor cobrar você. É opcional e cancela quando quiser." },
              { q: "Atende o Brasil todo? CNPJ também?",
                a: "Sim. O serviço é 100% digital, atende qualquer estado e funciona tanto pra CPF (pessoa física) quanto CNPJ (empresa). Os valores e tempo de limpeza são similares." },
              { q: "Posso fazer tudo sozinho sem consultor?",
                a: "Pode! A Consulta de CPF/CNPJ é totalmente self-service pelo site. Pra Limpeza completa você também consegue contratar direto, e nossa equipe acompanha o processo pelo painel e WhatsApp." },
              { q: "Preciso fazer a consulta antes da limpeza?",
                a: "Não. Você pode contratar a Limpeza direto — a consulta já vem inclusa no pacote, sem custo extra. Se descobrirmos que seu CPF/CNPJ está limpo (sem pendências), devolvemos 100% do valor pago." },
              { q: "E se eu pagar a limpeza e meu nome já estiver limpo?",
                a: "Sem problema. Após o pagamento rodamos a consulta automaticamente. Se não tiver pendência, nossa equipe entra em contato em até 24h e reembolsa o valor integral. Sem letra miúda." },
            ].map((item, i) => (
              <StaggerItem key={i}>
                <details className="group rounded-xl border border-sand-300/60 bg-white p-4 sm:p-5 lg:p-6 open:shadow-lg open:border-brand-300 transition-all">
                  <summary className="flex justify-between items-center cursor-pointer font-bold text-forest-800 list-none gap-3 text-sm sm:text-base">
                    <span className="flex-1">{item.q}</span>
                    <span className="size-7 rounded-full bg-brand-50 grid place-items-center text-brand-600 group-open:bg-brand-500 group-open:text-white group-open:rotate-45 transition-all shrink-0 text-lg">+</span>
                  </summary>
                  <p className="mt-3 sm:mt-4 text-sm sm:text-base text-gray-700 font-medium leading-relaxed text-pretty">{item.a}</p>
                </details>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-16 sm:py-24 lg:py-32">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="relative rounded-3xl bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700 p-8 sm:p-12 lg:p-20 text-center shadow-2xl shadow-brand-500/30 overflow-hidden">
              <div className="absolute -top-32 -right-32 w-72 sm:w-96 h-72 sm:h-96 bg-white/10 rounded-full blur-3xl" />
              <div className="absolute -bottom-32 -left-32 w-72 sm:w-96 h-72 sm:h-96 bg-forest-700/30 rounded-full blur-3xl" />

              <div className="relative">
                <TrendingUp className="size-10 sm:size-12 text-white mx-auto mb-4 sm:mb-6 opacity-80" />
                <h2 className="font-display text-3xl sm:text-4xl lg:text-6xl text-white mb-3 sm:mb-5 text-balance">
                  Pronto pra recomeçar?
                </h2>
                <p className="text-brand-50 font-semibold text-base sm:text-lg lg:text-xl mb-6 sm:mb-10 max-w-2xl mx-auto text-pretty">
                  Mais de 10 mil pessoas já voltaram a ter crédito com a LNB. Sua vez.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center w-full max-w-md sm:max-w-none mx-auto">
                  <Link href="/consultar" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-white text-brand-700 hover:bg-sand-50 px-6 sm:px-8 h-12 sm:h-14 font-bold text-[15px] sm:text-base shadow-lg transition-all hover:-translate-y-0.5 whitespace-nowrap">
                    <CpfIcon size={20} className="size-4 sm:size-5 shrink-0" />
                    Consultar CPF ou CNPJ
                  </Link>
                  <a href={WHATSAPP} target="_blank" rel="noopener" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 backdrop-blur border border-white/30 text-white hover:bg-white/20 px-6 sm:px-8 h-12 sm:h-14 font-bold text-[15px] sm:text-base transition whitespace-nowrap">
                    <WhatsAppIcon size={20} className="size-4 sm:size-5 shrink-0" />
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
