# LNB Painel — Limpa Nome Brazil

Sistema completo da Limpa Nome Brazil: site institucional, painel admin (equipe) e área do cliente. Substitui o WordPress atual de `limpanomebrazil.com.br`.

## 🎯 O que tem aqui

| Área | Rota | Descrição |
|---|---|---|
| **Site público** | `/` | Landing page focada em conversão pra WhatsApp + páginas institucionais |
| **Painel admin** | `/painel/*` | Dashboard + leads + consultas + blindagem + financeiro + equipe (Supabase Auth) |
| **Área do cliente** | `/conta/*` | Status do processo + relatório PDF + blindagem + pagamentos (CPF + senha) |

## 🛠️ Stack

- **Next.js 16** (App Router) + **React 19**
- **Tailwind CSS v4** (CSS-first, via `@theme inline`)
- **Supabase** (Postgres + Auth + Storage) — projeto `hkjukobqpjezhpxzplpj` (DDG)
- **shadcn/ui** patterns (Button, Input, Card, Badge — escritos à mão)
- **Inter** font + ícones **Lucide**
- **Sonner** (toasts), **Recharts** (gráficos), **bcrypt** (senhas), **date-fns**

## 🎨 Identidade visual

- **Azul LNB**: `#2EB1E2` (primária)
- **Cinza chumbo**: `#3A3A3A` (secundária)
- Tema claro padrão (light mode)
- Logo em `public/brand/lnb-logo.svg`

## 🚀 Setup local

```bash
# 1) Instalar deps
npm install

# 2) Configurar env
cp .env.example .env.local
# preencher NEXT_PUBLIC_SUPABASE_URL, anon key, service role, CLIENTE_SESSION_SECRET

# 3) Rodar migrations no Supabase
# Painel Supabase → SQL Editor → cole supabase/migrations/20260506_lnb_painel_schema.sql

# 4) Criar primeiro usuário admin
# 4a) Painel Supabase → Authentication → Users → Add user (email + senha)
# 4b) Pega o UUID gerado e roda no SQL Editor:
#     INSERT INTO public.lnb_admin_users (id, email, nome, role, ativo)
#     VALUES ('<UUID>', 'voce@dosedegrowth.com.br', 'Seu Nome', 'owner', true);

# 5) Rodar dev
npm run dev
# abre http://localhost:3000
```

Ver **DEPLOY_GUIDE.md** pra deploy completo na Vercel.
Ver **REGRAS_E_LOGICA.md** pra regras de negócio.

## 📁 Estrutura

```
src/
  app/
    (site)/              # Site público (landing, sobre)
    painel/              # Painel admin (Supabase Auth)
    conta/               # Área do cliente (CPF + senha)
    api/cliente/         # auth custom (login, cadastro, logout)
    layout.tsx           # root (Inter font, Toaster)
    globals.css          # design system (Tailwind v4 + cores LNB)
  components/
    brand/logo.tsx
    site/                # header + footer público
    admin/sidebar.tsx
    cliente/header.tsx
    ui/                  # button, input, card, badge
  lib/
    supabase/            # client, server, middleware, types
    auth/                # admin (Supabase) + cliente (CPF+senha)
    utils.ts
  middleware.ts          # protege /painel/*
supabase/migrations/     # SQL pra rodar no Supabase
public/brand/            # logo + assets
```

## 🔐 Autenticação

### Admin — Supabase Auth (email + senha)
Padrão `@supabase/ssr` (cookie-based). Tabela `lnb_admin_users` extends `auth.users` com `role` (owner/admin/consultor/viewer).

### Cliente — Custom (CPF + senha)
- CPF é o identificador (cliente final raramente lembra de email)
- Senha bcrypt cost 12, lockout após 5 tentativas (15 min)
- Sessão via cookie HttpOnly assinado HMAC-SHA256

## 🗃️ Tabelas Supabase

**Existentes (criadas pelos fluxos n8n)** — schema `public`:
- `LNB - CRM` — leads que chegam pelo Chatwoot
- `LNB - Base` — pós-agendamento
- `LNB_Consultas` — resultados API Full + PDF
- `LNB_Blindagem` — clientes com blindagem ativa
- `LNB_API_Control` — saldo/uso API Full

**Novas (criadas por este projeto)**:
- `lnb_admin_users` — usuários painel admin
- `lnb_cliente_auth` — credenciais cliente
- `lnb_audit_log` — auditoria

**Buckets Storage**:
- `lnb-relatorios` (público) — PDFs gerados pelo n8n
- `lnb-assets` (público) — logo, imagens marketing

## 🔗 Repositório

https://github.com/dosedegrowth-design/lnblimpanome

## 📄 Licença

Proprietary © Dose de Growth — Limpa Nome Brazil.
