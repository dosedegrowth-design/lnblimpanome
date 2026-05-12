"use client";
import { Lock, ShieldCheck, BadgeCheck, Award } from "lucide-react";

const ITENS = [
  {
    icon: Lock,
    titulo: "LGPD",
    desc: "100% conforme Lei Geral de Proteção de Dados",
  },
  {
    icon: ShieldCheck,
    titulo: "SSL/HTTPS",
    desc: "Conexão criptografada de ponta a ponta",
  },
  {
    icon: BadgeCheck,
    titulo: "Pix · Cartão · Boleto",
    desc: "Pagamento processado com segurança bancária",
  },
  {
    icon: Award,
    titulo: "Garantia",
    desc: "Não funcionou? Devolvemos seu dinheiro",
  },
];

export function Confianca() {
  return (
    <section className="py-12 sm:py-16 bg-gradient-to-b from-white to-sand-50/40 border-y border-gray-200/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-center text-xs sm:text-sm font-bold uppercase tracking-widest text-gray-700 mb-6 sm:mb-8">
          Sua segurança em primeiro lugar
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {ITENS.map((it) => (
            <div
              key={it.titulo}
              className="rounded-xl bg-white border border-gray-200 p-4 sm:p-5 flex items-center gap-3 sm:gap-4 hover:border-brand-300 hover:shadow-md transition-all"
            >
              <div className="size-10 sm:size-11 rounded-xl bg-brand-50 grid place-items-center shrink-0">
                <it.icon className="size-4 sm:size-5 text-brand-600" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-forest-800 text-sm">{it.titulo}</p>
                <p className="text-xs text-gray-700 font-medium mt-0.5 leading-snug">{it.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
