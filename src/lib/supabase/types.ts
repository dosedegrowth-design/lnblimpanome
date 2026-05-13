/**
 * Tipos das tabelas Supabase do projeto LNB.
 * Schema atualizado conforme Supabase real (06/mai/2026).
 */

// ============= "LNB - CRM" — pipeline de leads =============
export type LeadStatus = "lead" | "interessado" | "agendado" | "fechado" | "perdido";

export interface CRMRow {
  id: number;
  created_at: string;
  nome: string | null;
  Servico: string | null;
  telefone: string | null;
  funil_ID: string | null;
  Conversation_ID: string | null;
  etapa_name: string | null;
  "kanban_client_ID": string | null;
  Delivery: boolean | null;
  lembrete_enviado: boolean | null;
  value: string | null;
  notifica: boolean | null;
  cod_service: string | null;
  metodo_de_pagamento: string | null;
  asaas_ID: string | null;
  CPF: string | null;
  "e-mail": string | null;
  "data-nasci": string | null;
  id_pagamento: string | null;
  link_pagamento: string | null;
  data_venci: string | null;
  link_boleto: string | null;
  status: string | null;
  status_pagamento: string | null;
  external_ref: string | null;

  // Booleans de status (na "LNB - Base", não em CRM, mas alguns fluxos antigos colocam aqui)
  Lead?: boolean | null;
  Interessado?: boolean | null;
  Agendado?: boolean | null;
  Fechado?: boolean | null;
  perdido?: boolean | null;

  origem?: "site" | "whatsapp" | "admin" | null;
}

// ============= "LNB - Base" — pipeline visual + agendamento =============
export interface BaseRow {
  id: number;
  created_at: string;
  nome: string | null;
  Servico: string | null;
  telefone: string | null;
  unidade: string | null;
  hora_agenda: string | null;
  Lead: boolean | null;
  Interessado: boolean | null;
  Agendado: boolean | null;
  Fechado: boolean | null;
  perdido: boolean | null;
  delivery: boolean | null;
  value: string | null;
  cod_service: string | null;
  "kanban_item-id": string | null;
}

// ============= LNB_Consultas — resultados API =============
export interface ConsultaRow {
  id: string; // uuid
  cpf: string;
  nome: string | null;
  data_nascimento: string | null;
  telefone: string | null;
  email: string | null;
  provider: string | null; // 'apifull' | 'soawebservices'
  resultado_raw: unknown;
  tem_pendencia: boolean | null;
  resumo: string | null;
  total_dividas: number | null;
  qtd_pendencias: number | null;
  consulta_paga: boolean | null;
  fechou_limpeza: boolean | null;
  pdf_url: string | null;
  mp_preference_consulta: string | null;
  mp_preference_limpeza: string | null;
  origem: "site" | "whatsapp" | "admin" | null;
  provider_status: "ok" | "sem_saldo" | "erro_provedor" | "nao_processado" | null;
  provider_error: string | null;
  created_at: string;
}

// ============= LNB_Blindagem — clientes ativos =============
export interface BlindagemRow {
  id: string; // uuid
  cpf: string;
  nome: string | null;
  telefone: string | null;
  email: string | null;
  ativo: boolean;
  plano: string | null; // 'standalone' | 'incluso'
  valor: number | null;
  proxima_verificacao: string | null;
  ultima_verificacao: string | null;
  resultado_ultima: unknown;
  tem_pendencia_atual: boolean | null;
  created_at: string;
}

// ============= LNB_API_Control — saldo provedores =============
export interface APIControlRow {
  id: number;
  mes_ano: string; // "2026-05"
  bigdatacorp_count: number;
  bigdatacorp_limit: number;
  soawebservices_count: number;
  provider_ativo: string | null;
  updated_at: string;
}

// ============= NOVAS (painel) =============
export type AdminRole = "owner" | "admin" | "consultor" | "viewer";

export interface AdminUserRow {
  id: string;
  email: string;
  nome: string;
  role: AdminRole;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
}

export interface ClienteAuthRow {
  cpf: string;
  senha_hash: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  email_verificado: boolean;
  created_at: string;
  last_login_at: string | null;
  failed_attempts: number;
  locked_until: string | null;
}

export interface AuditLogRow {
  id?: number;
  actor_id: string | null;
  actor_type: "admin" | "cliente" | "system";
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  metadata: Record<string, unknown> | null;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
}
