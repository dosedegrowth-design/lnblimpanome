-- ============================================================
-- LNB CRM — UNIQUE constraint em telefone (BUGFIX)
-- ============================================================
--
-- Problema:
--   A RPC checkout_upsert_crm_lead faz INSERT ... ON CONFLICT (telefone)
--   mas a tabela "LNB - CRM" não tinha UNIQUE constraint em telefone.
--   Resultado: toda chamada ao /api/site/checkout falhava silenciosamente
--   ao inserir no CRM (catch do TypeScript engolia o erro).
--
-- Sintoma:
--   - lnb_cliente_auth gravava cliente corretamente
--   - "LNB - CRM" ficava sem o telefone
--   - Por isso o painel admin não via leads vindos pelo site
--
-- Fix: ALTER TABLE pra adicionar a constraint UNIQUE.
-- ============================================================

ALTER TABLE public."LNB - CRM"
  ADD CONSTRAINT lnb_crm_telefone_unique UNIQUE (telefone);
