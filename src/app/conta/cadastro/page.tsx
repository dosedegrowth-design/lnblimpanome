"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { formatCPF, cleanCPF, formatPhone } from "@/lib/utils";

export default function CadastroPage() {
  const router = useRouter();
  const [form, setForm] = useState({ cpf: "", nome: "", email: "", telefone: "", senha: "", senha2: "" });
  const [loading, setLoading] = useState(false);

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (form.senha !== form.senha2) return toast.error("Senhas não conferem");
    if (form.senha.length < 8) return toast.error("Senha precisa ter ao menos 8 caracteres");

    setLoading(true);
    try {
      const r = await fetch("/api/cliente/cadastro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cpf: cleanCPF(form.cpf),
          nome: form.nome,
          email: form.email || null,
          telefone: form.telefone.replace(/\D/g, "") || null,
          senha: form.senha,
        }),
      });
      const data = await r.json();
      if (!r.ok || !data.ok) {
        toast.error(data.error || "Erro ao cadastrar");
        return;
      }
      toast.success("Cadastro feito! Faça login.");
      router.push("/conta/login");
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
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Crie sua conta</h1>
            <p className="text-gray-500 text-sm mb-6">
              Acompanhe o processo de limpeza do seu nome
            </p>

            <form onSubmit={submit} className="space-y-4">
              <div>
                <Label htmlFor="cpf">CPF *</Label>
                <Input
                  id="cpf"
                  inputMode="numeric"
                  value={form.cpf}
                  onChange={(e) => set("cpf", formatCPF(e.target.value))}
                  placeholder="000.000.000-00"
                  required
                />
              </div>
              <div>
                <Label htmlFor="nome">Nome completo *</Label>
                <Input
                  id="nome"
                  value={form.nome}
                  onChange={(e) => set("nome", e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="telefone">Telefone (WhatsApp)</Label>
                <Input
                  id="telefone"
                  inputMode="numeric"
                  value={form.telefone}
                  onChange={(e) => set("telefone", formatPhone(e.target.value))}
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div>
                <Label htmlFor="senha">Senha (mín. 8) *</Label>
                <Input
                  id="senha"
                  type="password"
                  value={form.senha}
                  onChange={(e) => set("senha", e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              <div>
                <Label htmlFor="senha2">Confirmar senha *</Label>
                <Input
                  id="senha2"
                  type="password"
                  value={form.senha2}
                  onChange={(e) => set("senha2", e.target.value)}
                  required
                />
              </div>
              <Button type="submit" loading={loading} width="full" size="lg">
                Criar conta
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <Link href="/conta/login" className="text-brand-600 hover:underline font-medium">
                Já tem conta? Entrar
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
