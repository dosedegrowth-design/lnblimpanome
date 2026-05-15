-- ============================================================
-- LNB Painel - tornar gerenciavel via banco (15/mai/2026)
-- Projeto: hkjukobqpjezhpxzplpj
--
-- Cria:
--   - lnb_produtos        (precos dos 5 produtos LNB)
--   - lnb_kanban_etapas   (lista UNICA de etapas)
--   - lnb_tags_servico    (tags de servico por card)
--   - lnb_processos.tag_servico (FK opcional)
--   - Backfill tag_servico a partir de tipo (compat)
--   - Seed inicial com precos atuais
-- ============================================================

-- ----------------------------------------------------------------
-- 1) lnb_produtos
-- ----------------------------------------------------------------
create table if not exists public.lnb_produtos (
  codigo              text primary key,
  nome                text not null,
  preco_real          numeric(10,2) not null check (preco_real >= 0),
  preco_teste         numeric(10,2) not null default 5.00 check (preco_teste >= 0),
  desconto_consulta   numeric(10,2) default 0 check (desconto_consulta >= 0),
  custo_api           numeric(10,2) default 0 check (custo_api >= 0),
  ativo               boolean not null default true,
  ordem               int not null default 0,
  descricao           text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists idx_lnb_produtos_ativo on public.lnb_produtos(ativo);
create index if not exists idx_lnb_produtos_ordem on public.lnb_produtos(ordem);

drop trigger if exists trg_produtos_updated on public.lnb_produtos;
create trigger trg_produtos_updated
  before update on public.lnb_produtos
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------
-- 2) lnb_kanban_etapas (lista UNICA)
-- ----------------------------------------------------------------
create table if not exists public.lnb_kanban_etapas (
  codigo       text primary key,
  nome         text not null,
  emoji        text default '',
  cor          text not null default 'gray'
                check (cor in ('brand','amber','emerald','violet','red','gray','forest')),
  descricao    text,
  ordem        int not null default 0,
  ativo        boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_etapas_ordem on public.lnb_kanban_etapas(ordem) where ativo;

drop trigger if exists trg_etapas_updated on public.lnb_kanban_etapas;
create trigger trg_etapas_updated
  before update on public.lnb_kanban_etapas
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------
-- 3) lnb_tags_servico
-- ----------------------------------------------------------------
create table if not exists public.lnb_tags_servico (
  codigo          text primary key,
  nome            text not null,
  cor             text not null default 'gray'
                  check (cor in ('brand','amber','emerald','violet','red','gray','forest')),
  emoji           text default '',
  produto_codigo  text references public.lnb_produtos(codigo) on delete set null,
  ordem           int not null default 0,
  ativo           boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_tags_ordem on public.lnb_tags_servico(ordem) where ativo;

drop trigger if exists trg_tags_updated on public.lnb_tags_servico;
create trigger trg_tags_updated
  before update on public.lnb_tags_servico
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------
-- 4) Coluna nova em lnb_processos
-- ----------------------------------------------------------------
alter table public.lnb_processos
  add column if not exists tag_servico text references public.lnb_tags_servico(codigo);

create index if not exists idx_processos_tag on public.lnb_processos(tag_servico);

-- NOTA: a coluna `tipo` NAO sera dropada nesta migration. Mantemos por
-- compat com codigo existente. Dropar em migration futura quando todas
-- as RPCs e rotas tiverem migrado.

-- ----------------------------------------------------------------
-- 5) RLS (tabelas privadas - so service role e RPC SECURITY DEFINER)
-- ----------------------------------------------------------------
alter table public.lnb_produtos       enable row level security;
alter table public.lnb_kanban_etapas  enable row level security;
alter table public.lnb_tags_servico   enable row level security;

-- Nao criamos policies de select/insert/update/delete:
-- isso bloqueia anon e authenticated. Acesso so via RPC SECURITY DEFINER
-- ou service_role (server actions / Edge Functions).

-- ----------------------------------------------------------------
-- 6) Seed inicial (precos atuais)
-- ----------------------------------------------------------------
insert into public.lnb_produtos (codigo, nome, preco_real, preco_teste, desconto_consulta, custo_api, ordem, descricao) values
  ('consulta_cpf',   'Consulta CPF',          29.99,  5.00, 0.00,    2.49, 10, 'Consulta de CPF + relatorio PDF'),
  ('consulta_cnpj',  'Consulta CNPJ',         39.99,  5.00, 0.00,    2.49, 20, 'Consulta de CNPJ + relatorio PDF'),
  ('limpeza_cpf',    'Limpeza de Nome CPF',   500.00, 5.00, 29.99,   0.00, 30, 'Limpeza de nome PF (desconto se houver consulta paga <= 15d)'),
  ('limpeza_cnpj',   'Limpeza de Nome CNPJ',  580.01, 5.00, 39.99,   0.00, 40, 'Limpeza de nome PJ + socio'),
  ('blindagem',      'Blindagem mensal CPF',  29.90,  5.00, 0.00,    0.00, 50, 'Blindagem mensal com monitoramento')
on conflict (codigo) do nothing;

insert into public.lnb_kanban_etapas (codigo, nome, emoji, cor, descricao, ordem) values
  ('iniciado',     'Iniciado',      '🟦', 'brand',   'Pagamento confirmado',              10),
  ('pago',         'Pago',          '💳', 'brand',   'Pagamento confirmado',              20),
  ('documentacao', 'Documentacao',  '📄', 'amber',   'Coletando documentos',              30),
  ('analise',      'Em analise',    '🔍', 'violet',  'Equipe analisando o caso',          40),
  ('execucao',     'Em execucao',   '⚡', 'forest',  'Executando junto aos orgaos',       50),
  ('executada',    'Executada',     '🔍', 'amber',   'Consulta realizada na API',         60),
  ('entregue',     'Entregue',      '📨', 'emerald', 'Relatorio enviado pro cliente',     70),
  ('finalizado',   'Finalizado',    '✅', 'emerald', 'Processo concluido',                80),
  ('ativada',      'Ativada',       '🛡️', 'brand',   'Blindagem ativada',                 90),
  ('monitorando',  'Monitorando',   '👁️', 'emerald', 'Verificacoes automaticas ativas',  100),
  ('alerta',       'Alerta',        '⚠️', 'red',     'Pendencia detectada',              110),
  ('encerrada',    'Encerrada',     '🔚', 'gray',    'Cliente cancelou',                 120)
on conflict (codigo) do nothing;

insert into public.lnb_tags_servico (codigo, nome, cor, emoji, produto_codigo, ordem) values
  ('consulta_cpf',  'Consulta CPF',   'brand',   '🔍',  'consulta_cpf',  10),
  ('consulta_cnpj', 'Consulta CNPJ',  'violet',  '🏢',  'consulta_cnpj', 20),
  ('limpeza_cpf',   'Limpeza CPF',    'emerald', '✨',  'limpeza_cpf',   30),
  ('limpeza_cnpj',  'Limpeza CNPJ',   'forest',  '🏛️', 'limpeza_cnpj',  40),
  ('blindagem',     'Blindagem',      'amber',   '🛡️', 'blindagem',     50)
on conflict (codigo) do nothing;

-- ----------------------------------------------------------------
-- 7) Backfill tag_servico em lnb_processos a partir de tipo
-- ----------------------------------------------------------------
update public.lnb_processos
   set tag_servico = case tipo
     when 'limpeza'   then 'limpeza_cpf'
     when 'blindagem' then 'blindagem'
     when 'consulta'  then 'consulta_cpf'
   end
 where tag_servico is null and tipo is not null;
