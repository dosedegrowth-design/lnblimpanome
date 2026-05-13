import Link from "next/link";
import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Building2, CheckCircle2, ArrowRight, Lock, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Consultar CPF ou CNPJ · LNB",
  description: "Descubra a situação do seu CPF ou CNPJ em minutos. Score, pendências, credores e relatório PDF.",
};

export default function ConsultarLanding() {
  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="text-center space-y-3">
        <p className="text-sm text-brand-600 font-semibold uppercase tracking-widest">
          Consulta oficial
        </p>
        <h1 className="font-display text-3xl sm:text-4xl text-forest-800">
          O que você quer consultar?
        </h1>
        <p className="text-gray-600 text-sm sm:text-base max-w-xl mx-auto">
          Resultado em minutos. Acesso aos órgãos oficiais (Serasa, SPC, Boa Vista, Receita Federal).
        </p>
      </div>

      {/* 2 cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        {/* CPF */}
        <Card className="hover:shadow-2xl hover:shadow-brand-500/10 hover:-translate-y-1 transition-all overflow-hidden">
          <CardContent className="p-6 sm:p-7">
            <div className="size-14 rounded-2xl bg-brand-100 grid place-items-center mb-4">
              <User className="size-7 text-brand-700" />
            </div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Pessoa Física
            </p>
            <h2 className="font-display text-2xl text-forest-800 mt-1">
              Consultar meu CPF
            </h2>
            <p className="text-sm text-gray-600 mt-1.5">
              Descubra se seu nome está sujo, score e dívidas
            </p>

            <div className="my-5">
              <span className="font-display text-4xl text-forest-800">R$ 29,99</span>
              <span className="text-xs text-gray-500 ml-1.5">à vista</span>
            </div>

            <ul className="space-y-2 text-sm text-gray-700 mb-6">
              <li className="flex gap-2"><CheckCircle2 className="size-4 text-brand-500 shrink-0 mt-0.5"/> Score Serasa Experian</li>
              <li className="flex gap-2"><CheckCircle2 className="size-4 text-brand-500 shrink-0 mt-0.5"/> Pendências SPC, Boa Vista</li>
              <li className="flex gap-2"><CheckCircle2 className="size-4 text-brand-500 shrink-0 mt-0.5"/> Credores e valores</li>
              <li className="flex gap-2"><CheckCircle2 className="size-4 text-brand-500 shrink-0 mt-0.5"/> Relatório PDF por email</li>
            </ul>

            <Link href="/consultar/cpf" className="block">
              <Button width="full" size="lg" className="gap-2">
                Consultar CPF <ArrowRight className="size-4"/>
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* CNPJ */}
        <Card className="hover:shadow-2xl hover:shadow-brand-500/10 hover:-translate-y-1 transition-all overflow-hidden border-2 border-brand-100">
          <CardContent className="p-6 sm:p-7">
            <div className="size-14 rounded-2xl bg-forest-100 grid place-items-center mb-4">
              <Building2 className="size-7 text-forest-700" />
            </div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Pessoa Jurídica
            </p>
            <h2 className="font-display text-2xl text-forest-800 mt-1">
              Consultar meu CNPJ
            </h2>
            <p className="text-sm text-gray-600 mt-1.5">
              Dados da empresa + score do sócio responsável
            </p>

            <div className="my-5">
              <span className="font-display text-4xl text-forest-800">R$ 39,99</span>
              <span className="text-xs text-gray-500 ml-1.5">à vista</span>
            </div>

            <ul className="space-y-2 text-sm text-gray-700 mb-6">
              <li className="flex gap-2"><CheckCircle2 className="size-4 text-brand-500 shrink-0 mt-0.5"/> Cadastro Receita Federal</li>
              <li className="flex gap-2"><CheckCircle2 className="size-4 text-brand-500 shrink-0 mt-0.5"/> Sócios + capital social</li>
              <li className="flex gap-2"><CheckCircle2 className="size-4 text-brand-500 shrink-0 mt-0.5"/> Score crédito do responsável</li>
              <li className="flex gap-2"><CheckCircle2 className="size-4 text-brand-500 shrink-0 mt-0.5"/> Pendências do sócio admin</li>
            </ul>

            <Link href="/consultar/cnpj" className="block">
              <Button width="full" size="lg" className="gap-2 bg-forest-800 hover:bg-forest-700">
                Consultar CNPJ <ArrowRight className="size-4"/>
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Confiança */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 pt-4">
        <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-700">
          <Lock className="size-4 text-emerald-600 shrink-0"/>
          <span>Pagamento seguro</span>
        </div>
        <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-700">
          <ShieldCheck className="size-4 text-emerald-600 shrink-0"/>
          <span>LGPD compatível</span>
        </div>
        <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-700 col-span-2 sm:col-span-1">
          <CheckCircle2 className="size-4 text-emerald-600 shrink-0"/>
          <span>Resultado em minutos</span>
        </div>
      </div>
    </div>
  );
}
