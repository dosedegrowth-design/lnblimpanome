"use client";
import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, ArrowRight, Sparkles, ShieldCheck } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { CpfIcon } from "@/components/icons/cpf-icon";
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
import { whatsappLink } from "@/lib/contato";

type Tipo = "cpf" | "cnpj";

const PRECOS = {
  cpf: {
    label: "CPF",
    consulta: { valor: "R$ 29", cents: ",99" },
    limpeza: { valor: "R$ 500", cents: ",00", planoQuery: "limpeza" },
    blindagem: { valor: "R$ 29", cents: ",90/mês" },
    chamadaLimpeza: "Tira seu nome do Serasa em até 20 dias",
  },
  cnpj: {
    label: "CNPJ",
    consulta: { valor: "R$ 39", cents: ",99" },
    limpeza: { valor: "R$ 580", cents: ",01", planoQuery: "limpeza_cnpj" },
    blindagem: { valor: "R$ 29", cents: ",90/mês" },
    chamadaLimpeza: "Tira o CNPJ da empresa do Serasa em até 20 dias",
  },
} as const;

const WHATSAPP = whatsappLink("Olá! Quero limpar meu nome com a LNB.");

export function PrecosTabs() {
  const [tipo, setTipo] = useState<Tipo>("cpf");
  const p = PRECOS[tipo];
  const consultarHref = `/consultar${tipo === "cnpj" ? "?tipo=cnpj" : ""}`;
  const limparHref = `/contratar?plano=${p.limpeza.planoQuery}`;

  return (
    <>
      {/* Toggle CPF / CNPJ */}
      <Reveal className="flex justify-center mb-8 sm:mb-10">
        <div className="inline-flex rounded-full bg-white border border-gray-300 p-1 shadow-sm">
          {(["cpf", "cnpj"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTipo(t)}
              className={`px-5 sm:px-8 h-10 sm:h-11 rounded-full text-sm sm:text-base font-bold transition-all ${
                tipo === t
                  ? "bg-brand-500 text-white shadow-md"
                  : "text-forest-800 hover:bg-sand-50"
              }`}
            >
              Pessoa {t === "cpf" ? "Física" : "Jurídica"} ({t.toUpperCase()})
            </button>
          ))}
        </div>
      </Reveal>

      {/* Fluxo: Consulta → Limpeza */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1.3fr] gap-4 sm:gap-6 max-w-5xl mx-auto items-stretch">
        {/* Card Consulta */}
        <Reveal key={`consulta-${tipo}`}>
          <div className="h-full p-6 sm:p-8 rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow-md transition flex flex-col">
            <div className="flex items-center gap-2">
              <span className="size-7 rounded-full bg-brand-500 text-white grid place-items-center font-display text-sm">1</span>
              <span className="text-[10px] sm:text-xs font-bold text-gray-700 uppercase tracking-widest">Diagnóstico</span>
            </div>
            <h3 className="mt-3 font-display text-2xl sm:text-3xl text-forest-800">Consulta {p.label}</h3>
            <p className="text-sm text-gray-700 font-medium mt-1">Descubra se há pendências</p>

            <div className="mt-5 flex items-baseline gap-1">
              <span className="font-display text-4xl sm:text-5xl text-forest-800">{p.consulta.valor}</span>
              <span className="font-display text-2xl text-forest-800">{p.consulta.cents}</span>
            </div>
            <p className="text-xs text-gray-700 font-semibold mt-1">Pagamento único · resultado em minutos</p>

            <ul className="mt-5 space-y-2 text-sm text-gray-800 font-semibold flex-1">
              {[
                tipo === "cpf" ? "Score de crédito atualizado" : "Situação cadastral da empresa",
                "Lista de pendências e credores",
                "Valor total de débitos",
                "Relatório PDF + email",
              ].map((b) => (
                <li key={b} className="flex gap-2">
                  <CheckCircle2 className="size-4 text-brand-500 shrink-0 mt-0.5" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>

            <Link
              href={consultarHref}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white px-4 h-11 sm:h-12 font-bold transition-all text-sm sm:text-base shadow-md shadow-brand-500/25 whitespace-nowrap"
            >
              <CpfIcon size={18} className="size-4 sm:size-5 shrink-0" />
              Consultar {p.label}
            </Link>
          </div>
        </Reveal>

        {/* Conector visual */}
        <div className="hidden lg:flex items-center justify-center">
          <div className="flex flex-col items-center text-brand-500">
            <ArrowRight className="size-8" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mt-1">depois</span>
          </div>
        </div>

        {/* Card Limpeza (destaque) */}
        <Reveal key={`limpeza-${tipo}`} delay={0.1}>
          <div className="relative h-full p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-forest-800 to-forest-900 text-white border-2 border-brand-500/30 shadow-2xl shadow-forest-800/30 flex flex-col">
            <span className="absolute -top-3 left-6 sm:left-8 inline-flex items-center rounded-full bg-brand-500 text-white text-[10px] sm:text-xs font-bold px-3 sm:px-4 py-1 shadow-lg uppercase tracking-wider">
              Mais escolhido
            </span>

            <div className="flex items-center gap-2">
              <span className="size-7 rounded-full bg-white/15 text-white grid place-items-center font-display text-sm">2</span>
              <span className="text-[10px] sm:text-xs font-bold text-brand-300 uppercase tracking-widest">Solução completa</span>
            </div>
            <h3 className="mt-3 font-display text-2xl sm:text-3xl text-white">Limpeza de Nome {p.label}</h3>
            <p className="text-sm text-sand-200 font-medium mt-1">{p.chamadaLimpeza}</p>

            <div className="mt-5 flex items-baseline gap-1">
              <span className="font-display text-4xl sm:text-5xl text-white">{p.limpeza.valor}</span>
              <span className="font-display text-2xl text-white">{p.limpeza.cents}</span>
            </div>
            <p className="text-xs text-sand-200 font-semibold mt-1">
              à vista · {tipo === "cpf" ? "abatemos os R$ 29,99 da consulta" : "abatemos os R$ 39,99 da consulta"} se já tiver feito
            </p>

            <ul className="mt-5 space-y-2 text-sm text-sand-100 font-semibold flex-1">
              {[
                "Limpeza completa em até 20 dias úteis",
                "Você não precisa quitar a dívida",
                "Painel online pra acompanhar",
                "Consultor dedicado",
                "Atualizações por WhatsApp e email",
                "Garantia: não funcionou? Devolvemos integral",
              ].map((b) => (
                <li key={b} className="flex gap-2">
                  <CheckCircle2 className="size-4 text-brand-400 shrink-0 mt-0.5" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>

            <Link
              href={limparHref}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-white px-4 h-11 sm:h-12 font-bold shadow-lg shadow-brand-500/40 transition-all text-sm sm:text-base whitespace-nowrap"
            >
              <Sparkles className="size-4 sm:size-5 shrink-0" />
              Limpar {p.label} agora
            </Link>
            <p className="mt-2 text-center text-[11px] text-sand-200 font-medium">
              ✨ Consulta inclusa · se não tiver pendência, reembolso 100%
            </p>
            <a
              href={WHATSAPP}
              target="_blank"
              rel="noopener"
              className="mt-2 inline-flex w-full items-center justify-center gap-1.5 text-xs text-sand-200 hover:text-white transition font-semibold"
            >
              <WhatsAppIcon size={14} className="size-3.5 text-[#25D366]" />
              Tirar dúvidas no WhatsApp
            </a>
          </div>
        </Reveal>
      </div>

      {/* Card opcional Blindagem */}
      <Reveal delay={0.2} className="max-w-5xl mx-auto mt-6 sm:mt-8">
        <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5 sm:p-7 flex flex-col md:flex-row gap-4 md:gap-6 md:items-center">
          <div className="flex items-center gap-3 md:gap-4 md:flex-1 min-w-0">
            <div className="size-12 sm:size-14 rounded-xl bg-forest-50 grid place-items-center shrink-0">
              <ShieldCheck className="size-6 sm:size-7 text-forest-700" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-display text-xl sm:text-2xl text-forest-800">Blindagem mensal</h3>
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full">Opcional</span>
              </div>
              <p className="text-sm text-gray-700 font-medium mt-0.5">
                Monitoramento contínuo do seu {p.label} · alerta no WhatsApp se aparecer nova pendência
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 sm:gap-6 md:shrink-0">
            <div>
              <div className="flex items-baseline gap-1">
                <span className="font-display text-2xl sm:text-3xl text-forest-800">{p.blindagem.valor}</span>
                <span className="font-display text-base text-forest-800">{p.blindagem.cents}</span>
              </div>
              <p className="text-[11px] text-gray-700 font-semibold">Cancela quando quiser</p>
            </div>
            <a
              href={WHATSAPP}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-forest-700 text-forest-800 hover:bg-forest-50 px-4 h-10 sm:h-11 font-bold text-sm whitespace-nowrap transition"
            >
              <WhatsAppIcon size={16} className="size-4 text-[#25D366]" />
              Contratar
            </a>
          </div>
        </div>
      </Reveal>
    </>
  );
}
