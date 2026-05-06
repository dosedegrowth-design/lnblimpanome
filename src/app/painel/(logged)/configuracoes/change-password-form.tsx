"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Lock } from "lucide-react";

export function ChangePasswordForm() {
  const [senha, setSenha] = useState("");
  const [senha2, setSenha2] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (senha.length < 8) return toast.error("Senha precisa ter ao menos 8 caracteres");
    if (senha !== senha2) return toast.error("As senhas não conferem");

    setLoading(true);
    try {
      const r = await fetch("/api/admin/me/senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senha }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) {
        toast.error(d.error || "Erro");
        return;
      }
      toast.success("Senha atualizada com sucesso");
      setSenha("");
      setSenha2("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 max-w-md">
      <div>
        <Label htmlFor="senha">Nova senha (mín. 8 caracteres)</Label>
        <Input
          id="senha"
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          minLength={8}
          required
        />
      </div>
      <div>
        <Label htmlFor="senha2">Confirme a nova senha</Label>
        <Input
          id="senha2"
          type="password"
          value={senha2}
          onChange={(e) => setSenha2(e.target.value)}
          required
        />
      </div>
      <Button type="submit" loading={loading} className="gap-2">
        <Lock className="size-4" />
        Atualizar senha
      </Button>
    </form>
  );
}
