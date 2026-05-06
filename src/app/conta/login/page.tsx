"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { formatCPF, cleanCPF } from "@/lib/utils";

export default function ClienteLoginPage() {
  const router = useRouter();
  const [cpf, setCpf] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await fetch("/api/cliente/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cpf: cleanCPF(cpf), senha }),
      });
      const data = await r.json();
      if (!r.ok || !data.ok) {
        toast.error(data.error || "Erro ao entrar");
        return;
      }
      toast.success("Bem-vindo!");
      router.push("/conta/dashboard");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-white flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Logo height={48} />
        </div>

        <Card>
          <CardContent className="p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Área do Cliente</h1>
            <p className="text-gray-500 text-sm mb-6">
              Acompanhe o processo de limpeza do seu nome
            </p>

            <form onSubmit={submit} className="space-y-4">
              <div>
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  inputMode="numeric"
                  autoComplete="username"
                  value={cpf}
                  onChange={(e) => setCpf(formatCPF(e.target.value))}
                  placeholder="000.000.000-00"
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

            <div className="mt-6 text-center text-sm">
              <Link href="/conta/cadastro" className="text-brand-600 hover:underline font-medium">
                Primeiro acesso? Cadastre-se
              </Link>
            </div>
          </CardContent>
        </Card>

        <p className="mt-6 text-xs text-gray-500 text-center">
          <Link href="/" className="hover:text-brand-600">← Voltar pro site</Link>
        </p>
      </div>
    </div>
  );
}
