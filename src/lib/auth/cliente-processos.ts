/**
 * Helper pra cliente buscar seus próprios processos.
 * Roda server-side com sessão validada.
 */
import { createClient } from "@/lib/supabase/server";

interface EventoCliente {
  id: string;
  tipo: "etapa" | "mensagem" | "arquivo" | "sistema";
  etapa_nova: string | null;
  mensagem: string | null;
  autor_nome: string | null;
  created_at: string;
}

interface ArquivoCliente {
  id: string;
  tipo: "comprovante" | "relatorio" | "outro";
  nome_arquivo: string;
  tamanho_bytes: number | null;
  mime_type: string | null;
  created_at: string;
}

export interface ProcessoCliente {
  id: string;
  tipo: "limpeza" | "blindagem" | "consulta";
  etapa: string;
  finalizado_em: string | null;
  created_at: string;
  updated_at: string;
  eventos: EventoCliente[];
  arquivos: ArquivoCliente[];
}

export async function getClienteProcessos(cpf: string): Promise<ProcessoCliente[]> {
  const supa = await createClient();
  const { data, error } = await supa.rpc("cliente_meus_processos", { p_cpf: cpf });
  if (error || !data) return [];
  const r = data as { processos?: ProcessoCliente[]; error?: string };
  return r.processos || [];
}
