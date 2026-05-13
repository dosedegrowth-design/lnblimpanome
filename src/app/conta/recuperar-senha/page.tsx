"use client";
import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { formatCPF, cleanCPF } from "@/lib/utils";

export default function RecuperarSenhaPage() {
  const [cpf, setCpf] = useState("");

  // Mensagem pronta pra WhatsApp do atendimento
  function whatsappUrl() {
    const numero = "5511932095951"; // ajustar conforme o WhatsApp da LNB
    const cpfFmt = cpf || "[seu CPF]";
    const msg = encodeURIComponent(
      `Olá, esqueci a senha da minha conta na Limpa Nome Brazil.\n\nCPF: ${cpfFmt}\n\nPodem me ajudar a recuperar?`
    );
    return `https://wa.me/${numero}?text=${msg}`;
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
          Voltar pro login
        </Link>

        <div className="text-center mb-8">
          <Logo height={48} />
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-xl shadow-forest-800/5 p-8">
          <h1 className="font-display text-3xl text-forest-800 mb-1">Recuperar senha</h1>
          <p className="text-gray-500 text-sm mb-8">
            Pra sua segurança, a recuperação é feita por atendimento humano via WhatsApp.
          </p>

          <div className="space-y-5">
            <div>
              <Label htmlFor="cpf">Seu CPF</Label>
              <Input
                id="cpf"
                inputMode="numeric"
                value={cpf}
                onChange={(e) => setCpf(formatCPF(e.target.value))}
                placeholder="000.000.000-00"
              />
            </div>

            <a
              href={whatsappUrl()}
              target="_blank"
              rel="noopener"
              className="block w-full"
            >
              <Button type="button" width="full" size="lg" className="bg-green-600 hover:bg-green-700">
                <MessageCircle className="size-4 mr-2" />
                Falar com atendimento no WhatsApp
              </Button>
            </a>

            <p className="text-xs text-gray-500 leading-relaxed">
              Nossa equipe vai validar sua identidade e te ajudar a redefinir a senha rapidinho.
              Atendimento de seg a sex, das 9h às 19h.
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100 text-center text-sm">
            <Link href="/conta/login" className="text-brand-600 hover:text-brand-700 font-semibold">
              Lembrei minha senha →
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
