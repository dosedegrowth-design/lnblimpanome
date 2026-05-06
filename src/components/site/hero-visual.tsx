"use client";
import { motion } from "framer-motion";
import { FileSearch, ShieldCheck, TrendingUp } from "lucide-react";

export function HeroVisual() {
  return (
    <div className="relative">
      <div className="absolute -inset-4 bg-gradient-to-br from-brand-200/40 via-sand-300/30 to-forest-200/40 rounded-3xl blur-2xl -z-10" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, rotate: -2 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative aspect-[4/4.5] rounded-3xl bg-white shadow-2xl shadow-forest-800/15 border border-gray-200 p-8 backdrop-blur"
      >
        <div className="flex items-center gap-3 pb-5 border-b border-gray-100">
          <motion.div
            initial={{ rotate: -180, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="size-12 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 grid place-items-center shadow-md shadow-brand-500/30"
          >
            <FileSearch className="size-6 text-white" />
          </motion.div>
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Relatório</p>
            <p className="font-display text-lg text-forest-800">Consulta CPF</p>
          </div>
          <motion.span
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 }}
            className="ml-auto inline-flex items-center rounded-full bg-red-50 text-red-700 text-[11px] font-bold px-3 py-1.5"
          >
            Com pendências
          </motion.span>
        </div>

        <div className="mt-6">
          <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider">Score de crédito</p>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="font-display text-7xl text-brand-500 mt-2 leading-none"
          >
            412
          </motion.p>
          <div className="mt-3 h-2 rounded-full bg-gray-100 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "41%" }}
              transition={{ delay: 0.8, duration: 1.2, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-red-400 via-amber-400 to-brand-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-6 mt-6 border-t border-gray-100 text-sm">
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-wider">Pendências</p>
            <p className="font-bold text-forest-800 text-lg mt-1">3 credores</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-wider">Total débitos</p>
            <p className="font-bold text-forest-800 text-lg mt-1">R$ 4.872,00</p>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.6 }}
          className="mt-6 p-4 rounded-xl bg-gradient-to-br from-brand-50 via-sand-50 to-brand-50 border border-brand-100"
        >
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="size-4 text-brand-600" />
            <p className="text-xs font-bold text-brand-800 uppercase tracking-wide">Solução LNB</p>
          </div>
          <p className="text-sm text-forest-800 font-medium leading-relaxed">
            Limpamos seu nome em até <strong>20 dias úteis</strong>
          </p>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0, x: 30, y: -30 }}
        animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
        transition={{ delay: 1.2, duration: 0.6, type: "spring" }}
        className="animate-float absolute -top-6 -right-6 size-24 rounded-2xl bg-forest-800 grid place-items-center shadow-2xl shadow-forest-800/40 border-4 border-white"
      >
        <ShieldCheck className="size-10 text-brand-400" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="absolute -bottom-4 -left-4 size-16 rounded-full bg-brand-200/60 blur-xl"
      />
    </div>
  );
}
