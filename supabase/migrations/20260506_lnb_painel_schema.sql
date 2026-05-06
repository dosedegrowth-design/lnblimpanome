-- ============================================================
-- LNB Painel — Schema novo (06/mai/2026)
-- Projeto Supabase: hkjukobqpjezhpxzplpj (DDG)
-- ============================================================

-- Extensões
create extension if not exists pgcrypto;

-- ============================================================
-- 1) lnb_admin_users — usuários da equipe (extends auth.users)
-- ============================================================
create table if not exists public.lnb_admin_users (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null unique,
  nome          text not null,
  role          text not null check (role in ('owner','admin','consultor','viewer')) default 'viewer',
  ativo         boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  last_login_at timestamptz
);
create index if not exists idx_lnb_admin_email on public.lnb_admin_users(email);
create index if not exists idx_lnb_admin_role  on public.lnb_admin_users(role);

-- Trigger updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists trg_admin_updated on public.lnb_admin_users;
create trigger trg_admin_updated
before update on public.lnb_admin_users
for each row execute function public.set_updated_at();

-- ============================================================
-- 2) lnb_cliente_auth — credenciais cliente (CPF + senha bcrypt)
-- ============================================================
create table if not exists public.lnb_cliente_auth (
  cpf               text primary key check (cpf ~ '^[0-9]{11}$'),
  senha_hash        text not null,
  nome              text not null,
  email             text,
  telefone          text,
  email_verificado  boolean not null default false,
  failed_attempts   int not null default 0,
  locked_until      timestamptz,
  created_at        timestamptz not null default now(),
  last_login_at     timestamptz
);
create index if not exists idx_cliente_email on public.lnb_cliente_auth(email);

-- ============================================================
-- 3) lnb_audit_log — auditoria de ações sensíveis
-- ============================================================
create table if not exists public.lnb_audit_log (
  id            bigserial primary key,
  actor_id      text,
  actor_type    text not null check (actor_type in ('admin','cliente','system')),
  action        text not null,
  resource_type text,
  resource_id   text,
  metadata      jsonb,
  ip            inet,
  user_agent    text,
  created_at    timestamptz not null default now()
);
create index if not exists idx_audit_actor    on public.lnb_audit_log(actor_id);
create index if not exists idx_audit_action   on public.lnb_audit_log(action);
create index if not exists idx_audit_created  on public.lnb_audit_log(created_at desc);

-- ============================================================
-- 4) Row-Level Security
-- ============================================================
alter table public.lnb_admin_users  enable row level security;
alter table public.lnb_cliente_auth enable row level security;
alter table public.lnb_audit_log    enable row level security;

-- Admin: usuário só vê o próprio registro (escrita só via service role)
drop policy if exists "admin_self_select" on public.lnb_admin_users;
create policy "admin_self_select" on public.lnb_admin_users
  for select using (auth.uid() = id);

-- Cliente auth: SEM acesso via anon — só service role do servidor (auth custom)
-- Já está com RLS on e sem policy = ninguém acessa via anon.

-- Audit log: somente service role (insere e lê via servidor)
-- RLS on + sem policies = bloqueado pra anon.

-- ============================================================
-- 5) Buckets de Storage (rodar via SQL ou painel Supabase)
-- ============================================================
-- Bucket "lnb-relatorios" — PDFs gerados (público)
insert into storage.buckets (id, name, public)
  values ('lnb-relatorios', 'lnb-relatorios', true)
  on conflict (id) do nothing;

-- Bucket "lnb-assets" — logo, imagens marketing (público)
insert into storage.buckets (id, name, public)
  values ('lnb-assets', 'lnb-assets', true)
  on conflict (id) do nothing;

-- Storage policies — bucket lnb-relatorios
drop policy if exists "lnb-relatorios-public-read" on storage.objects;
create policy "lnb-relatorios-public-read" on storage.objects
  for select using (bucket_id = 'lnb-relatorios');

-- Upload via service role (n8n PDF Generator usa)
drop policy if exists "lnb-relatorios-service-write" on storage.objects;
create policy "lnb-relatorios-service-write" on storage.objects
  for all using (bucket_id = 'lnb-relatorios' and auth.role() = 'service_role');

-- Storage policies — bucket lnb-assets (público read, write só admin)
drop policy if exists "lnb-assets-public-read" on storage.objects;
create policy "lnb-assets-public-read" on storage.objects
  for select using (bucket_id = 'lnb-assets');

-- ============================================================
-- 6) Seed inicial — owner (você precisa criar o usuário no Auth primeiro)
-- ============================================================
-- Passo 1: cria o usuário no Supabase Auth (Painel → Authentication → Users → Add user)
-- Passo 2: roda o INSERT abaixo trocando UUID e email pelos seus
--
-- INSERT INTO public.lnb_admin_users (id, email, nome, role, ativo)
-- VALUES ('<UUID_DO_USER_AUTH>', 'lucas@dosedegrowth.com.br', 'Lucas Cassiano', 'owner', true);
