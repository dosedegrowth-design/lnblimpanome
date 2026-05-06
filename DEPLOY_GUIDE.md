# Deploy Guide — LNB Painel

Passo a passo completo do zero ao ar em `limpanomebrazil.com.br`.

## 1. Supabase — schema novo

```sql
-- Painel Supabase (hkjukobqpjezhpxzplpj) → SQL Editor → New Query
-- Cole o conteúdo de supabase/migrations/20260506_lnb_painel_schema.sql
-- e execute.
```

Verificar:
- Tabelas `lnb_admin_users`, `lnb_cliente_auth`, `lnb_audit_log` criadas
- Buckets `lnb-relatorios` e `lnb-assets` criados (públicos)
- Policies RLS aplicadas

## 2. Criar primeiro usuário admin

1. **Painel Supabase → Authentication → Users → Add user**
   - Email: seu email da equipe
   - Senha: defina uma forte
   - Auto Confirm: SIM
2. Copiar o **UUID** gerado
3. **SQL Editor** rodar:
   ```sql
   INSERT INTO public.lnb_admin_users (id, email, nome, role, ativo)
   VALUES ('<UUID-COPIADO>', 'lucas@dosedegrowth.com.br', 'Lucas Cassiano', 'owner', true);
   ```

## 3. Variáveis de ambiente locais

```bash
cp .env.example .env.local
```

Preencher:
- `NEXT_PUBLIC_SUPABASE_URL` — `https://hkjukobqpjezhpxzplpj.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Project Settings → API → anon/public key
- `SUPABASE_SERVICE_ROLE_KEY` — Project Settings → API → service_role key
- `CLIENTE_SESSION_SECRET` — gerar com `openssl rand -base64 48`
- `NEXT_PUBLIC_WHATSAPP_NUMBER` — número WhatsApp da equipe (com DDI/DDD, ex: `5511999999999`)

## 4. Rodar local

```bash
npm install
npm run dev
```

- Site: http://localhost:3000
- Admin: http://localhost:3000/painel/login
- Cliente: http://localhost:3000/conta/login

## 5. Deploy Vercel

```bash
# Instalar CLI
npm i -g vercel

# Login + link
vercel login
vercel link

# Adicionar env vars (todas do .env.local)
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add CLIENTE_SESSION_SECRET production
vercel env add NEXT_PUBLIC_WHATSAPP_NUMBER production
vercel env add NEXT_PUBLIC_CHATWOOT_BASE production
vercel env add CHATWOOT_ACCOUNT_ID production
vercel env add CHATWOOT_TOKEN production

# Deploy produção
vercel --prod
```

## 6. Domínio limpanomebrazil.com.br

### 6.1 Vercel
- Vercel Dashboard → Project → Settings → Domains
- Add `limpanomebrazil.com.br` e `www.limpanomebrazil.com.br`

### 6.2 DNS no Registro.br
**Opção A — DNS no Vercel** (mais simples):
- Trocar nameservers para `ns1.vercel-dns.com` e `ns2.vercel-dns.com`

**Opção B — DNS no Registro.br**:
- Apex (`@`): A `76.76.21.21`
- `www`: CNAME `cname.vercel-dns.com`

Aguardar propagação (geralmente <1h).

### 6.3 SSL
Vercel emite Let's Encrypt automático.

## 7. Migrar conteúdo do WordPress

Opções:
1. **Trocar direto** — DNS aponta pro Vercel, WP morre. Conteúdo recriado no Next.
2. **Subdomínio `blog.`** — WP move pra `blog.limpanomebrazil.com.br`, Next fica no apex.
3. **Path-based** — Vercel proxy `/blog/*` pra WP.

## 8. Checklist pós-deploy

- [ ] Login admin funciona
- [ ] Cadastro + login cliente funciona
- [ ] Logo oficial em `public/brand/lnb-logo.svg` (substituir placeholder)
- [ ] OG image em `public/og.png` (1200x630)
- [ ] Número WhatsApp real no `.env`
- [ ] Vercel Analytics ativo
- [ ] Mobile responsivo testado
