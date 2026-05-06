# LNB Painel — Regras de Negócio

## 🎯 Modelo de negócio

LNB é serviço **100% digital** de:
1. Consulta de CPF (R$ 19,99)
2. Limpeza de nome + Blindagem (R$ 480,01 com desconto, R$ 499,90 sem)

Cliente paga ANTES de qualquer consulta na API Full (R$ 2,49) — zero prejuízo se não converter.

## 🔁 Pipeline (CRM)

```
Lead → Interessado → Qualificado → Consulta Paga → Fechado → (Perdido)
```

Mapeamento na tabela `LNB - CRM`:
- `Lead = true` → entrou em contato
- `Interessado = true` → forneceu 4 dados (nome, CPF, nascimento, email)
- `Qualificado = true` → recebeu link de pagamento
- `consulta_paga = true` → pagou consulta R$ 19,99
- `Fechado = true` → pagou limpeza R$ 480,01

## 💰 Preços

| Serviço | Valor | External ref |
|---|---|---|
| Consulta CPF | R$ 19,99 | `CONSULTA-{CPF}-{ts}` |
| Limpeza com desconto | R$ 480,01 | `LIMPEZA-DESC-{CPF}-{ts}` |
| Limpeza sem desconto | R$ 499,90 | `LIMPEZA-{CPF}-{ts}` |

## 🛡️ Blindagem

- Inclusa em todo plano de limpeza
- Cron diário 08:00 verifica CPFs ativos
- Se aparece nova pendência → alerta no WhatsApp via Chatwoot
- Tabela `LNB_Blindagem` com `proxima_verificacao` (a cada 7 dias)

## 🔐 Auth

### Admin (Supabase Auth)
- Email + senha
- Roles: `owner` > `admin` > `consultor` > `viewer`
- `owner`/`admin` veem financeiro e gerem equipe
- `consultor` vê leads/consultas/blindagem
- `viewer` só lê

### Cliente (Custom)
- CPF + senha bcrypt
- Cookie HttpOnly assinado HMAC (TTL 30d)
- Lockout: 5 falhas → 15min de bloqueio

## 📊 Métricas (dashboard admin)

```
Total Leads      = count(LNB - CRM)
Pagos Consulta   = count(LNB - CRM where consulta_paga = true)
Fechados         = count(LNB - CRM where Fechado = true)
Blindagens       = count(LNB_Blindagem where status = 'ativa')

Taxa Conversão   = Fechados / Total Leads × 100
Receita Total    = Pagos × R$19,99 + Fechados × R$480,01
Custo API        = count(LNB_Consultas) × R$2,49
Lucro            = Receita - Custo
Margem           = Lucro / Receita × 100
```

## ⚠️ Regras técnicas

- CPF sempre limpo no banco (sem `.` ou `-`)
- Telefone como id do CRM (formato BRA, sem `@s.whatsapp.net` — JID só no Chatwoot)
- Campo Chatwoot tem typo: `Acoount ID` (manter por compat com fluxos n8n)
- Schema `public` (NÃO migrar pra `lnb` — quebra n8n)

## 🔄 Integração com n8n

Painel **lê** dos fluxos n8n; n8n **escreve** nas tabelas:

| Fluxo | Escreve em |
|---|---|
| Multi Agentes LNB | `LNB - CRM` |
| Cobranca Dinamica | `LNB - CRM` (link_pagamento) |
| Fechamento LNB | `LNB - CRM` (Fechado=true), `LNB_Consultas` |
| PDF Generator | `LNB_Consultas` (pdf_url, pdf_enviado) |
| Blindagem Cadastro | `LNB_Blindagem` |
| Blindagem Cron | `LNB_Blindagem` (verificacao) |

Painel **NÃO** escreve nas tabelas operacionais — só lê.
Escrita só em `lnb_admin_users`, `lnb_cliente_auth`, `lnb_audit_log`.

## 📝 Auditoria

Toda ação sensível registrar em `lnb_audit_log`:
- Login admin (sucesso/falha)
- Cadastro/login cliente
- Mudança manual de status no CRM (futuro)
- Acesso a dados financeiros

## 🚫 Não fazer

- ❌ Renomear tabelas existentes (quebra n8n)
- ❌ Mudar schema dos campos `LNB - CRM`
- ❌ Hardcoded credentials no código
- ❌ Service role key no client
- ❌ Senha em texto plano em qualquer lugar
- ❌ Confiar em CPF do cookie sem revalidar contra `lnb_cliente_auth`
