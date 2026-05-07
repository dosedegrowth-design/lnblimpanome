"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Upload, Download, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDateTimeBR } from "@/lib/utils";
import type { ArquivoRow } from "@/lib/processos";

interface Props {
  processoId: string;
  arquivos: ArquivoRow[];
}

const TIPOS_LABEL: Record<string, string> = {
  comprovante: "Comprovante",
  relatorio: "Relatório",
  outro: "Outro",
};

function formatBytes(b: number | null): string {
  if (!b) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

export function ProcessoArquivos({ processoId, arquivos }: Props) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [tipo, setTipo] = useState<"comprovante" | "relatorio" | "outro">("comprovante");
  const [visivelCliente, setVisivelCliente] = useState(true);
  const [uploading, setUploading] = useState(false);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Arquivo muito grande (máx 10 MB)");
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("processo_id", processoId);
      fd.append("tipo", tipo);
      fd.append("visivel_cliente", String(visivelCliente));

      const r = await fetch("/api/admin/processos/upload", {
        method: "POST",
        body: fd,
      });
      const d = await r.json();
      if (!r.ok || !d.ok) {
        toast.error(d.error || "Falha no upload");
        return;
      }
      toast.success("Arquivo enviado");
      if (fileInput.current) fileInput.current.value = "";
      router.refresh();
    } finally {
      setUploading(false);
    }
  }

  async function abrirArquivo(arquivoId: string) {
    try {
      const r = await fetch(`/api/admin/processos/arquivo-url?arquivo_id=${arquivoId}`);
      const d = await r.json();
      if (!r.ok || !d.ok) {
        toast.error(d.error || "Falha ao abrir arquivo");
        return;
      }
      window.open(d.url, "_blank");
    } catch {
      toast.error("Erro ao abrir arquivo");
    }
  }

  return (
    <div className="space-y-4">
      {/* Form upload */}
      <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4">
        <p className="font-semibold text-forest-800 text-sm mb-3">Enviar arquivo</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as "comprovante" | "relatorio" | "outro")}
            className="h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm"
          >
            <option value="comprovante">📋 Comprovante</option>
            <option value="relatorio">📄 Relatório</option>
            <option value="outro">📎 Outro</option>
          </select>
          <label className="flex items-center gap-2 text-sm text-gray-700 px-1">
            <input
              type="checkbox"
              checked={visivelCliente}
              onChange={(e) => setVisivelCliente(e.target.checked)}
              className="rounded text-brand-500 focus:ring-brand-500"
            />
            Visível pro cliente
          </label>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,image/*,application/pdf"
          onChange={handleUpload}
          disabled={uploading}
          className="hidden"
        />
        <Button
          onClick={() => fileInput.current?.click()}
          loading={uploading}
          variant="outline"
          width="full"
          className="gap-2"
        >
          {!uploading && <Upload className="size-4" />}
          {uploading ? "Enviando..." : "Selecionar arquivo (PDF, imagem, máx 10MB)"}
        </Button>
      </div>

      {/* Lista */}
      {arquivos.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">Nenhum arquivo enviado ainda</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {arquivos.map((a) => (
            <li key={a.id} className="py-3 flex items-center gap-3 flex-wrap">
              <div className="size-10 rounded-lg bg-brand-50 grid place-items-center shrink-0">
                <FileText className="size-5 text-brand-600" />
              </div>
              <div className="flex-1 min-w-[200px]">
                <p className="font-semibold text-forest-800 text-sm truncate">{a.nome_arquivo}</p>
                <div className="flex flex-wrap items-center gap-2 mt-0.5">
                  <Badge variant="default">{TIPOS_LABEL[a.tipo]}</Badge>
                  {!a.visivel_cliente && <Badge variant="warning">Interno</Badge>}
                  <span className="text-xs text-gray-400">{formatBytes(a.tamanho_bytes)}</span>
                  <span className="text-xs text-gray-400">· {formatDateTimeBR(a.created_at)}</span>
                </div>
              </div>
              <button
                onClick={() => abrirArquivo(a.id)}
                className="inline-flex items-center gap-1.5 px-3 h-9 rounded-md bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-semibold transition"
              >
                <Download className="size-3.5" /> Abrir
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
