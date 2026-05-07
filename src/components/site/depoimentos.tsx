"use client";
import { motion } from "framer-motion";
import { Quote, Star, TrendingUp } from "lucide-react";

interface Depoimento {
  nome: string;
  iniciais: string;
  cidade: string;
  scoreAntes: number;
  scoreDepois: number;
  texto: string;
}

const DEPOIMENTOS: Depoimento[] = [
  {
    nome: "Marcelo R.",
    iniciais: "MR",
    cidade: "Curitiba, PR",
    scoreAntes: 312,
    scoreDepois: 745,
    texto:
      "Tava negativado há 4 anos, achei que nunca ia sair do Serasa. Em 18 dias meu nome estava limpo e aprovaram meu cartão de crédito.",
  },
  {
    nome: "Juliana S.",
    iniciais: "JS",
    cidade: "São Paulo, SP",
    scoreAntes: 285,
    scoreDepois: 698,
    texto:
      "Tinha vergonha de pedir empréstimo. Depois da LNB consegui financiar meu carro com taxa boa. Mudou minha vida.",
  },
  {
    nome: "Roberto F.",
    iniciais: "RF",
    cidade: "Belo Horizonte, MG",
    scoreAntes: 401,
    scoreDepois: 812,
    texto:
      "Não acreditei quando vi o resultado. Sem precisar negociar com banco, sem advogado, sem dor de cabeça. Recomendo demais.",
  },
];

export function Depoimentos() {
  return (
    <section className="py-16 sm:py-24 lg:py-32 bg-white relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(2,152,217,0.06),transparent_60%)]" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
          <span className="text-brand-600 font-bold text-xs sm:text-sm uppercase tracking-widest">
            Histórias reais
          </span>
          <h2 className="mt-2 sm:mt-3 font-display text-3xl sm:text-4xl lg:text-5xl text-forest-800 text-balance">
            Mais de <span className="text-brand-500">10 mil pessoas</span> já voltaram a ter crédito
          </h2>
          <div className="mt-4 flex items-center justify-center gap-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star key={i} className="size-4 sm:size-5 fill-amber-400 text-amber-400" />
            ))}
            <span className="ml-2 text-sm font-bold text-forest-800">4,9/5</span>
            <span className="text-sm text-gray-700 font-medium">· baseado em mais de 1.200 avaliações</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {DEPOIMENTOS.map((d, i) => (
            <motion.div
              key={d.nome}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all p-6 sm:p-7 flex flex-col"
            >
              <Quote className="size-7 text-brand-200 mb-3" />
              <p className="text-sm sm:text-base text-forest-800 font-medium leading-relaxed flex-1 italic">
                &ldquo;{d.texto}&rdquo;
              </p>

              {/* Antes/Depois score */}
              <div className="mt-5 grid grid-cols-2 gap-3 p-3 rounded-xl bg-gradient-to-r from-red-50 via-amber-50 to-emerald-50 border border-gray-100">
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-wider text-gray-700 font-bold">Antes</p>
                  <p className="font-display text-2xl text-red-500 leading-none mt-1">{d.scoreAntes}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-wider text-gray-700 font-bold flex items-center justify-center gap-1">
                    <TrendingUp className="size-3 text-emerald-600" />
                    Depois
                  </p>
                  <p className="font-display text-2xl text-emerald-600 leading-none mt-1">{d.scoreDepois}</p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-3">
                <div className="size-10 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 grid place-items-center text-white font-bold text-sm">
                  {d.iniciais}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-forest-800 text-sm">{d.nome}</p>
                  <p className="text-xs text-gray-700 font-medium">{d.cidade}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
