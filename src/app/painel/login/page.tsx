"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ArrowLeft, ShieldCheck, BarChart3, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export default function AdminLoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get("redirect") || "/painel/dashboard";

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supa = createClient();
    const { error } = await supa.auth.signInWithPassword({ email, password: senha });
    setLoading(false);
    if (error) return toast.error("Email ou senha inválidos");
    toast.success("Bem-vindo!");
    router.push(redirect);
    router.refresh();
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      <div className="hidden lg:flex relative bg-gradient-to-br from-forest-700 via-forest-800 to-forest-900 p-12 flex-col justify-between overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-brand-600/15 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        <div className="relative">
          <Logo height={48} variant="mono" className="text-white" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative text-white space-y-8"
        >
          <div>
            <h2 className="font-display text-4xl mb-3">Painel da Equipe</h2>
            <p className="text-sand-100/80 max-w-sm leading-relaxed">
              Acompanhe leads, consultas, blindagens e o desempenho financeiro da operação LNB.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {[
              { icon: BarChart3,    t: "Métricas em tempo real" },
              { icon: Users,        t: "Pipeline de clientes" },
              { icon: ShieldCheck,  t: "Controle de blindagens ativas" },
            ].map((it) => (
              <div key={it.t} className="flex items-center gap-3 text-sm text-sand-100/90">
                <div className="size-9 rounded-lg bg-white/10 backdrop-blur grid place-items-center">
                  <it.icon className="size-4 text-brand-300" />
                </div>
                {it.t}
              </div>
            ))}
          </div>
        </motion.div>

        <p className="relative text-xs text-sand-200/50">© Limpa Nome Brazil — Acesso restrito</p>
      </div>

      <div className="flex items-center justify-center p-6 lg:p-12 bg-sand-50/50">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md"
        >
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-forest-700 mb-8">
            <ArrowLeft className="size-4" />
            Voltar pro site
          </Link>

          <div className="lg:hidden mb-8 text-center">
            <Logo height={40} />
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-xl shadow-forest-800/5 p-8 lg:p-10">
            <h1 className="font-display text-3xl text-forest-800 mb-1">Entrar</h1>
            <p className="text-gray-500 text-sm mb-8">Acesse o painel administrativo da LNB</p>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" autoComplete="email" required
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@dosedegrowth.com.br" />
              </div>
              <div>
                <Label htmlFor="senha">Senha</Label>
                <Input id="senha" type="password" autoComplete="current-password" required
                  value={senha} onChange={(e) => setSenha(e.target.value)} />
              </div>
              <Button type="submit" loading={loading} width="full" size="lg">
                Entrar
              </Button>
            </form>

            <p className="mt-8 text-xs text-gray-500 text-center">
              Não tem acesso? Solicite ao administrador da equipe.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
