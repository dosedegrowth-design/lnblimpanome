"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
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
        const msg = (data.error || "").toLowerCase();
        // CPF/email já cadastrado → manda pro login com aviso
        if (msg.includes("já cadastrado") || msg.includes("ja cadastrado")) {
          toast.info("Este CPF já tem cadastro. Faça login ou use 'esqueci senha'.");
          setTimeout(() => router.push("/conta/login"), 1500);
          return;
        }
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
    <div className="min-h-screen bg-mesh-brand flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-20 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md"
      >
        <Link href="/conta/login" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-forest-700 mb-6">
          <ArrowLeft className="size-4" />
          Já tenho conta
        </Link>

        <div className="text-center mb-8">
          <Logo height={48} />
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-xl shadow-forest-800/5 p-8">
          <h1 className="font-display text-3xl text-forest-800 mb-1">Crie sua conta</h1>
          <p className="text-gray-500 text-sm mb-8">Acompanhe o processo de limpeza do seu nome</p>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label htmlFor="cpf">CPF *</Label>
              <Input id="cpf" inputMode="numeric" required
                value={form.cpf} onChange={(e) => set("cpf", formatCPF(e.target.value))}
                placeholder="000.000.000-00" />
            </div>
            <div>
              <Label htmlFor="nome">Nome completo *</Label>
              <Input id="nome" required value={form.nome} onChange={(e) => set("nome", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="telefone">Telefone (WhatsApp)</Label>
              <Input id="telefone" inputMode="numeric"
                value={form.telefone} onChange={(e) => set("telefone", formatPhone(e.target.value))}
                placeholder="(11) 99999-9999" />
            </div>
            <div>
              <Label htmlFor="senha">Senha (mín. 8 caracteres) *</Label>
              <Input id="senha" type="password" required minLength={8}
                value={form.senha} onChange={(e) => set("senha", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="senha2">Confirmar senha *</Label>
              <Input id="senha2" type="password" required
                value={form.senha2} onChange={(e) => set("senha2", e.target.value)} />
            </div>
            <Button type="submit" loading={loading} width="full" size="lg">
              Criar conta
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
