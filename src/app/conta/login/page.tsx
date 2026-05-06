"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
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
    <div className="min-h-screen bg-mesh-brand flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-20 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md"
      >
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-forest-700 mb-6">
          <ArrowLeft className="size-4" />
          Voltar pro site
        </Link>

        <div className="text-center mb-8">
          <Logo height={48} />
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-xl shadow-forest-800/5 p-8">
          <h1 className="font-display text-3xl text-forest-800 mb-1">Área do Cliente</h1>
          <p className="text-gray-500 text-sm mb-8">Acompanhe o processo de limpeza do seu nome</p>

          <form onSubmit={submit} className="space-y-5">
            <div>
              <Label htmlFor="cpf">CPF</Label>
              <Input id="cpf" inputMode="numeric" autoComplete="username" required
                value={cpf} onChange={(e) => setCpf(formatCPF(e.target.value))}
                placeholder="000.000.000-00" />
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

          <div className="mt-6 text-center text-sm">
            <Link href="/conta/cadastro" className="text-brand-600 hover:text-brand-700 font-semibold">
              Primeiro acesso? Cadastre-se →
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
