"use client";
import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { Logo } from "@/components/brand/logo";

type CellValue = string | boolean;

interface Linha {
  feature: string;
  tradicional: CellValue;
  lnb: CellValue;
  destaque?: boolean;
}

const LINHAS: Linha[] = [
  { feature: "Tempo até nome limpo",      tradicional: "5 anos (decadência)", lnb: "20 dias úteis", destaque: true },
  { feature: "Precisa quitar a dívida?",   tradicional: "Sim",                  lnb: false },
  { feature: "Negociar com cada credor?",  tradicional: "Sim",                  lnb: false },
  { feature: "Custo médio",                tradicional: "Valor da dívida + juros", lnb: "R$ 480,01", destaque: true },
  { feature: "Atendimento 100% digital",   tradicional: false,                  lnb: true },
  { feature: "Acompanhamento pelo painel", tradicional: false,                  lnb: true },
  { feature: "Monitoramento 12m bônus",    tradicional: false,                  lnb: true },
  { feature: "Risco de re-negativação",    tradicional: "Alto",                 lnb: "Baixo (monitoramento ativo)" },
];

function CellTradicional({ value }: { value: CellValue }) {
  if (value === false) {
    return (
      <span className="inline-flex items-center gap-1.5 text-red-600 text-xs sm:text-sm font-bold">
        <X className="size-4 shrink-0" />
        Não
      </span>
    );
  }
  if (value === true) {
    return (
      <span className="inline-flex items-center gap-1.5 text-emerald-600 text-xs sm:text-sm font-bold">
        <Check className="size-4 shrink-0" />
        Sim
      </span>
    );
  }
  return (
    <span className="text-forest-800 text-xs sm:text-sm font-semibold">{value}</span>
  );
}

function CellLnb({ value }: { value: CellValue }) {
  if (value === true) {
    return (
      <span className="inline-flex items-center gap-1.5 text-emerald-600 text-xs sm:text-sm font-bold">
        <Check className="size-4 shrink-0" />
        Sim
      </span>
    );
  }
  if (value === false) {
    return (
      <span className="inline-flex items-center gap-1.5 text-red-600 text-xs sm:text-sm font-bold">
        <X className="size-4 shrink-0" />
        Não
      </span>
    );
  }
  return (
    <span className="text-brand-700 text-xs sm:text-sm font-bold">{value}</span>
  );
}

export function Comparativo() {
  return (
    <section className="py-16 sm:py-24 lg:py-28">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
          <span className="text-brand-600 font-bold text-xs sm:text-sm uppercase tracking-widest">
            Compare
          </span>
          <h2 className="mt-2 sm:mt-3 font-display text-3xl sm:text-4xl lg:text-5xl text-forest-800 text-balance">
            Por que <span className="text-brand-500">não esperar</span> 5 anos?
          </h2>
          <p className="mt-3 text-gray-700 font-medium text-base sm:text-lg">
            Caminho tradicional vs. solução LNB
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="rounded-2xl border border-gray-200 bg-white shadow-lg overflow-hidden"
        >
          {/* Header */}
          <div className="grid grid-cols-3 bg-gradient-to-r from-gray-50 via-sand-50 to-brand-50 border-b border-gray-200">
            <div className="p-4 sm:p-6">
              <p className="text-[10px] sm:text-xs uppercase tracking-wider text-gray-700 font-bold">Item</p>
            </div>
            <div className="p-4 sm:p-6 text-center border-x border-gray-200">
              <p className="text-[10px] sm:text-xs uppercase tracking-wider text-gray-700 font-bold">Caminho tradicional</p>
              <p className="mt-1 text-sm sm:text-base text-forest-800 font-bold">😴 Lento</p>
            </div>
            <div className="p-4 sm:p-6 text-center bg-brand-500/5">
              <p className="text-[10px] sm:text-xs uppercase tracking-wider text-brand-700 font-bold">Com LNB</p>
              <div className="mt-1 inline-flex items-center gap-1.5">
                <Logo height={20} />
              </div>
            </div>
          </div>

          {/* Linhas */}
          <div className="divide-y divide-gray-100">
            {LINHAS.map((linha) => (
              <div
                key={linha.feature}
                className={`grid grid-cols-3 ${linha.destaque ? "bg-brand-50/30" : ""}`}
              >
                <div className="p-3 sm:p-5 text-xs sm:text-sm font-bold text-forest-800">
                  {linha.feature}
                </div>
                <div className="p-3 sm:p-5 border-x border-gray-100 grid place-items-center text-center">
                  <CellTradicional value={linha.tradicional} />
                </div>
                <div className="p-3 sm:p-5 grid place-items-center text-center bg-brand-500/5">
                  <CellLnb value={linha.lnb} />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
