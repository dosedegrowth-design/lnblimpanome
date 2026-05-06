/**
 * Tipos das tabelas Supabase do projeto LNB.
 *
 * Tabelas existentes (criadas via n8n / fluxos):
 *   - "LNB - CRM"        — leads que chegam pelo Chatwoot
 *   - "LNB - Base"       — base pós-agendamento (legado SPV)
 *   - "LNB_Consultas"    — resultados das consultas API Full
 *   - "LNB_API_Control"  — controle de saldo/uso da API Full
 *   - "LNB_Blindagem"    — clientes com blindagem ativa
 *
 * Tabelas novas (do painel):
 *   - lnb_admin_users    — usuários da equipe LNB (linka com auth.users)
 *   - lnb_cliente_auth   — credenciais cliente (CPF + senha hash)
 *   - lnb_audit_log      — auditoria de ações sensíveis
 */

// ============= EXISTENTES =============

export type LeadStatus =
  | "lead"
  | "interessado"
  | "qualificado"
  | "consulta_paga"
  | "fechado"
  | "perdido";

export interface CRMRow {
  id: string;            // telefone (PK)
  nome: string | null;
  CPF: string | null;
  "e-mail": string | null;
  unidade: string | null;
  link_pagamento: string | null;
  "kanban_item-id": string | null;
  Lead: boolean | null;
  Interessado: boolean | null;
  Qualificado: boolean | null;
  Agendado: boolean | null;
  Fechado: boolean | null;
  consulta_paga: boolean | null;
  data_pagamento: string | null;
  cod_service: string | null;
  created_at: string | null;
}

export interface ConsultaRow {
  id?: number;
  cpf: string;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  score: number | null;
  total_pendencias: number | null;
  total_debitos: string | null;
  has_debt: boolean | null;
  pendencias: unknown;          // JSONB array
  resultado_raw: string | null; // JSON stringificado
  status: "pendente" | "realizada" | "erro" | null;
  data_consulta: string | null;
  pdf_enviado: boolean | null;
  pdf_url: string | null;
  data_envio_pdf: string | null;
  created_at: string | null;
}

export interface BlindagemRow {
  id?: number;
  cpf: string;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  status: "ativa" | "pausada" | "cancelada";
  data_ativacao: string | null;
  ultima_verificacao: string | null;
  proxima_verificacao: string | null;
  alertas_enviados: number | null;
  ultimo_resultado: string | null;
  created_at: string | null;
}

export interface APIControlRow {
  id?: number;
  data: string;
  consultas_realizadas: number;
  custo_total: number;
  saldo_atual: number;
  fornecedor: "apifull" | "soawebservices";
  created_at: string | null;
}

// ============= NOVAS (painel) =============

export type AdminRole = "owner" | "admin" | "consultor" | "viewer";

export interface AdminUserRow {
  id: string;            // UUID — referencia auth.users.id
  email: string;
  nome: string;
  role: AdminRole;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
}

export interface ClienteAuthRow {
  cpf: string;           // PK — CPF limpo, sem pontos
  senha_hash: string;    // bcrypt cost 12
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
  actor_id: string | null;        // auth.users.id (admin) ou cpf (cliente)
  actor_type: "admin" | "cliente" | "system";
  action: string;                 // ex: "login_success", "lead_status_changed"
  resource_type: string | null;   // ex: "crm", "consulta"
  resource_id: string | null;
  metadata: Record<string, unknown> | null;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
}
