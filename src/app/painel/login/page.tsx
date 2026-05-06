"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

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
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-gray-50">
      <div className="hidden lg:flex bg-gradient-to-br from-brand-500 to-brand-800 p-12 flex-col justify-between">
        <Logo height={48} className="brightness-0 invert" />
        <div className="text-white">
          <h2 className="text-3xl font-bold mb-3">Painel Admin LNB</h2>
          <p className="text-brand-50 max-w-sm">
            Acompanhe leads, consultas, conversões e finanças.
            Painel exclusivo da equipe.
          </p>
        </div>
        <p className="text-xs text-brand-100">© Limpa Nome Brazil — Acesso restrito</p>
      </div>

      <div className="flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 text-center">
            <Logo height={40} />
          </div>

          <Card>
            <CardContent className="p-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Entrar</h1>
              <p className="text-gray-500 text-sm mb-6">
                Acesse o painel administrativo da LNB
              </p>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@dosedegrowth.com.br"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="senha">Senha</Label>
                  <Input
                    id="senha"
                    type="password"
                    autoComplete="current-password"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" loading={loading} width="full" size="lg">
                  Entrar
                </Button>
              </form>

              <p className="mt-6 text-xs text-gray-500 text-center">
                Não tem acesso? Solicite ao administrador da equipe.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
