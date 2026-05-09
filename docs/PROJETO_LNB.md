# LNB · Limpa Nome Brazil — Documentação Completa do Projeto

> Documento técnico-operacional consolidado de todo o sistema LNB.
> Última atualização: 09/05/2026

---

## 📌 Visão Geral

**LNB (Limpa Nome Brazil)** é uma plataforma 100% digital para limpeza de nome no Brasil. Vende 3 produtos:

| Produto | Preço | Descrição |
|---|---|---|
| **Consulta de CPF** | R$ 19,99 | Score + pendências (Boa Vista/Serasa/SPC) — **GATEWAY OBRIGATÓRIO** |
| **Limpeza + Blindagem 12m** | R$ 480,01 | Limpa nome em 20 dias úteis (sem quitar dívida) — produto principal |
| **Blindagem mensal** | R$ 29,90/mês | Monitoramento contínuo (só pra quem já tem nome limpo) |

### Regra crítica do funil
**Cliente NUNCA pode contratar Limpeza sem ter feito Consulta paga COM pendência.** Isso é validado no banco via RPC `cliente_pode_contratar_limpeza`.

---

## 🌐 URLs Principais

| Item | URL |
|---|---|
| **Site público** | https://limpanomebrazil.com.br |
| **Painel admin** | https://limpanomebrazil.com.br/painel |
| **Área cliente** | https://limpanomebrazil.com.br/conta |
| **GitHub** | https://github.com/dosedegrowth-design/lnblimpanome |
| **Vercel project** | `lnb-painel` (team `dose-de-growths-projects`) |
| **Supabase project** | `hkjukobqpjezhpxzplpj` (DDG, sa-east-1) |
| **Chatwoot** | https://dosedegrowthcrm.com.br (Account 11) |

---

## 🏗️ Arquitetura do Sistema

```
┌──────────────────────────────────────────────────────────────────────┐
│                        FONTES DE LEAD                                │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  🌐 SITE (limpanomebrazil.com.br)        💬 WHATSAPP (n8n + Maia)   │
│  ↓                                        ↓                          │
│  /consultar (wizard 3 steps)              Chatwoot Inbox 12          │
│  ↓                                        ↓                          │
│  /api/site/checkout                       Webhook5 → Multi Agentes   │
│  ↓                                        ↓ tools                    │
│  Mercado Pago Checkout                    /api/n8n/* (painel)        │
│  ↓                                        ↓                          │
│                                                                      │
└────────────────────┬───────────────────────────┬─────────────────────┘
                     │                           │
                     ▼                           ▼
         ┌───────────────────────────────────────────────┐
         │   /api/site/mp-webhook (HMAC validado)       │
         │   - Detecta origem (site OU whatsapp)        │
         │   - Chama API Full (R$ 2,49)                 │
         │   - Gera PDF com pdfkit                      │
         │   - Salva em Supabase Storage                │
         │   - Aplica labels Chatwoot                   │
         │   - Envia via canal correto                  │
         └───────────┬─────────────────────┬─────────────┘
                     │                     │
                     ▼                     ▼
              📧 Resend Email       💬 Chatwoot WhatsApp
              (origem=site)         (origem=whatsapp)
                                    + PDF anexo
                                    + Custom Attributes
                                    + Private Note
```

### Componentes principais

#### 1. **Painel Next.js** (`/Users/lucascassiano/Antigravity/lnb-painel`)
- **Stack:** Next.js 16, React 19, Tailwind v4, Supabase, framer-motion
- **Hosting:** Vercel com auto-deploy do GitHub
- **Domínio:** `limpanomebrazil.com.br` (HTTPS automático)
- **Auth admin:** Supabase Auth nativo
- **Auth cliente:** custom (CPF + senha hasheada via pgcrypto)

#### 2. **Backend Supabase** (project `hkjukobqpjezhpxzplpj`)
- **Database:** PostgreSQL 15.8
- **Region:** sa-east-1
- **Tabelas LNB:**
  - `LNB - CRM` (CRM com 38+ colunas — single source of truth do funil)
  - `LNB_Consultas` (consultas pagas + PDFs + raw API Full)
  - `LNB_Blindagem` (cadastros de blindagem mensal)
  - `lnb_cliente_auth` (auth custom CPF+senha)
  - `lnb_admin_users` (admins do painel)
  - `lnb_processos` (kanban interno pós-venda)
- **Storage buckets:**
  - `lnb-relatorios` (público — PDFs de consulta)
  - `lnb-processos` (privado — documentos do kanban admin)
  - `lnb-assets` (público — imagens estáticas)

#### 3. **Mercado Pago**
- App produção: `LNB - Limpa Nome Brazil`
- Webhook configurado: `https://limpanomebrazil.com.br/api/site/mp-webhook`
- Eventos: `payment`
- Modo: Produtivo
- HMAC validation via `MP_WEBHOOK_SECRET`

#### 4. **Chatwoot Account 11**
- URL: `https://dosedegrowthcrm.com.br`
- Inbox 12: WhatsApp Cloud API oficial (Meta)
- Funil 1: "Limpeza de Nome" (5 stages)
- 16 labels customizadas pré-cadastradas

#### 5. **n8n** (atendimento WhatsApp via Maia)
- Único fluxo ativo: **Multi Agentes LNB v06** (clone do SPV Matriz 110 adaptado)
- 1 webhook (Webhook5) recebe Chatwoot
- 7 tools batem em `/api/n8n/*` do painel
- Gemini novo (project Cloud separado): credencial `LNB Limpa Nome`

#### 6. **API Full** (consulta de CPF)
- Endpoint primário: `POST https://api.apifull.com.br/api/e-boavista`
- Custo: R$ 2,49 por consulta
- Token: `eyJpc3M...` (env `API_FULL_TOKEN`)

#### 7. **Resend** (email transacional)
- Domínio verificado: `limpanomebrazil.com.br`
- From: `contato@limpanomebrazil.com.br`

---

## 🎯 Funil de Venda — Kanban 5 Etapas

### Single source of truth: **Chatwoot Funil 1 ("Limpeza de Nome")**

| # | Stage Chatwoot | Stage CRM (LNB - CRM) | Quando aplicar | Quem aciona |
|---|---|---|---|---|
| 1 | `lead` (color #6366F1) | `Lead = true` | 1ª interação WhatsApp ou cadastro `/consultar` | **Mover Lead Auto** (Webhook5) ou `/api/site/checkout` |
| 2 | `interessado` (#8B5CF6) | `Interessado = true` | 4 dados coletados (Nome, CPF, Data nasc, Email) | Maia (tool `lead_status`) |
| 3 | `qualificado` (#EC4899) | `Qualificado = true` | Cliente recebeu link MP de pagamento | Maia (após `gerar_cobranca_*`) ou painel `/consultar` |
| 4 | `fechado` (#EF4444) | `Fechado = true` | Cliente pagou Limpeza R$ 480,01 (NÃO consulta!) | Webhook MP automático |
| 5 | `perdido` (#F59E0B) | `perdido = true` | 7d sem resposta (recheck) / 15d definitivo | Cron painel (futuro) |

### Movimentação automática

**3 mecanismos de garantia:**

1. **Mover Lead Automático** (Webhook5 → 1º HTTP request) — toda 1ª interação cai em Lead, mesmo se IA falhar
2. **Tool `lead_status`** — Orquestrador (AI Agent2) chama em cada etapa
3. **mp-webhook** — pagamento confirmado seta `Fechado=true` server-side automaticamente

A movimentação Kanban acontece em **3 lugares simultaneamente**:
- Tabela `LNB - CRM` (flag boolean)
- Funil Chatwoot (PATCH `/conversations/{id}` com `funnel_stage`)
- Labels (via tool `aplicar_label`)

---

## 🏷️ Labels Chatwoot (16 cadastradas)

### Serviço/Produto
| Label | Cor | Uso |
|---|---|---|
| `consulta-cpf` | #0298D9 | Cliente quer/pagou consulta R$ 19,99 |
| `limpeza-nome` | #10B981 | Cliente quer/pagou limpeza R$ 480,01 |
| `blindagem-mensal` | #8B5CF6 | Cliente quer/pagou blindagem R$ 29,90 |

### Status pagamento
| Label | Cor | Uso |
|---|---|---|
| `aguardando-pagamento` | #F59E0B | Link MP enviado, aguardando |
| `pago-consulta` | #1F5D5D | Consulta paga |
| `pago-limpeza` | #13312E | Limpeza paga (Fechado) |
| `pago-blindagem` | #5B21B6 | Blindagem paga |

### Resultado consulta
| Label | Cor | Uso |
|---|---|---|
| `tem-pendencia` | #DC2626 | Consulta retornou pendências |
| `nome-limpo` | #86EFAC | CPF sem pendências |
| `score-bom` | #059669 | Score >= 700 |
| `score-regular` | #D97706 | Score 500-699 |
| `score-baixo` | #EF4444 | Score < 500 |

### Operacionais
| Label | Cor | Uso |
|---|---|---|
| `origem-whatsapp` | #6B7280 | Lead WhatsApp |
| `origem-site` | #374151 | Lead site |
| `conflito` | #991B1B | Cliente reclamou |
| `vip` | #FBBF24 | Cliente prioritário |

---

## 📡 Endpoints API (Painel Next.js)

### `/api/site/*` (público — site)

| Endpoint | Método | Descrição |
|---|---|---|
| `/api/site/checkout` | POST | Cria preference MP (validação + cadastro cliente) |
| `/api/site/mp-webhook` | POST | Recebe notificações MP (HMAC validado) |
| `/api/site/elegibilidade-limpeza` | GET | Valida se CPF pode contratar limpeza |
| `/api/site/consulta-status/[cpf]` | GET | Polling status consulta (pra `/consultar`) |

### `/api/n8n/*` (Bearer auth via `N8N_SHARED_TOKEN`)

| Endpoint | Método | Descrição |
|---|---|---|
| `/api/n8n/lead-status` | POST | Move stage Kanban + grava valor_servico no CRM + PATCH Chatwoot |
| `/api/n8n/criar-checkout` | POST | Cria preference MP (origem=whatsapp) |
| `/api/n8n/blindagem-cadastro` | POST | Cadastra CPF em monitoramento |
| `/api/n8n/memory-long` | POST | Atualiza memória do agente Maia |
| `/api/n8n/aplicar-label` | POST | Aplica labels Chatwoot por contexto (12 contextos) |
| `/api/n8n/status-processo` | POST | Maia consulta status do processo do cliente |

### `/api/admin/*` (`requireAdmin` — Supabase Auth)

| Endpoint | Método | Descrição |
|---|---|---|
| `/api/admin/teste-fluxo` | POST | Dry-run do fluxo completo (debug) |
| `/api/admin/teste-pdf` | GET | Testa geração de PDF isolada |
| `/api/admin/gerar-pdf` | POST | Gera PDF de uma consulta específica |
| `/api/admin/processos/*` | POST | CRUD do kanban de processos pós-venda |
| `/api/admin/blindagem` | GET/POST | Gestão blindagem |
| `/api/admin/leads` | GET | Lista CRM |
| `/api/admin/users` | GET/POST | Gestão de admins |

### `/api/cliente/*` (cookie HMAC-signed)

| Endpoint | Método | Descrição |
|---|---|---|
| `/api/cliente/login` | POST | Login CPF + senha |
| `/api/cliente/cadastro` | POST | Cadastro novo cliente |
| `/api/cliente/logout` | POST | Logout |
| `/api/cliente/arquivo-url/[id]` | GET | Signed URL pra baixar arquivo do processo |

### `/api/cron/*` (Vercel Cron)

| Endpoint | Schedule | Descrição |
|---|---|---|
| `/api/cron/blindagem-diaria` | `0 9 * * *` (09h BRT) | Verifica todos CPFs ativos via API Full |

---

## 🔐 Variáveis de Ambiente (Vercel)

### Supabase
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` = `<SUPABASE_SERVICE_ROLE_KEY>` (only pra Storage processos)

### Auth
- `CLIENTE_SESSION_SECRET` (gerar com `openssl rand -base64 48`)

### Site
- `NEXT_PUBLIC_SITE_URL` = `https://limpanomebrazil.com.br`

### Chatwoot
- `NEXT_PUBLIC_CHATWOOT_BASE` = `https://dosedegrowthcrm.com.br`
- `CHATWOOT_ACCOUNT_ID` = `11`
- `CHATWOOT_INBOX_ID` = `12`
- `CHATWOOT_TOKEN` = `<CHATWOOT_TOKEN>` (bot token, manda mensagens)
- `CHATWOOT_ADMIN_TOKEN` = `<CHATWOOT_ADMIN_TOKEN>` (admin token, move kanban e funnels)

### WhatsApp Templates Meta
- `WPP_TEMPLATE_LANG` = `pt_BR`
- `WPP_TEMPLATE_GENERICO` (placeholder pra template aprovado no Meta)

### Mercado Pago
- `MP_ACCESS_TOKEN` = `<MP_ACCESS_TOKEN_PARCIAL>-...`
- `MP_WEBHOOK_SECRET` = `<MP_WEBHOOK_SECRET>`

### API Full
- `API_FULL_TOKEN` = `eyJpc3M...`

### n8n
- `N8N_SHARED_TOKEN` = `<N8N_SHARED_TOKEN>`

### Resend
- `RESEND_API_KEY` = `<RESEND_API_KEY>_...`
- `RESEND_FROM` = `Limpa Nome Brazil <contato@limpanomebrazil.com.br>`

### PDF (legado, não usado mais)
- `LNB_PDF_WEBHOOK` (substituído por geração interna pdfkit)

---

## 🤖 Multi Agentes LNB v06 (n8n)

### Estrutura
- **Arquivo:** `/Users/lucascassiano/Downloads/Multi Agentes LNB v06.json` (293KB)
- **171 nós ativos** (clone do SPV Matriz 110, removidos 51 SPV-only)
- **108 conexões**
- **1 webhook:** Webhook5 path `6ef87fae-3202-4562-abe3-f1386d6d2bc5`

### Cadeia de execução
```
Chatwoot Inbox 12 → Webhook5 → If2 (filtro inbox.id == 12)
  → SetFieldsBasic (extrai phone, content, conversation_id, etc)
  → Mover Lead (Auto)  ← garante stage=Lead na 1ª msg
  → FromMe-Switch (filtra outgoing)
  → GET TIMEOUT1 → If4 → BuscaTrapList1 → If1 → If
  → Tipo da Mensagem (texto/áudio/imagem)
  → Debounce Redis (RedisPushMsgs + Wait + ListaMsg-Redis)
  → AgruparMSGs
  → AI Agent (Maia — fala com cliente)
  → AI Agent2 (Orquestrador — chama tools)
  → Tools LNB → painel
  → Resposta Chatwoot
```

### 4 AI Agents
| Nome | Tipo | Função |
|---|---|---|
| **AI Agent** | Recepção (Maia) | Conversa com cliente, empática, vende |
| **AI Agent2** | Orquestrador | Chama tools no momento certo |
| **Memory Long** | Memória estruturada | Organiza markdown do lead |
| **Memory Long1** | Memória estruturada | Backup/segunda chain |

Todos com **Gemini** (credencial `LNB Limpa Nome` id `<GEMINI_CRED_ID>`).

### 7 Tools LNB

| Tool | Endpoint | Quando usar |
|---|---|---|
| `lead_status` | `/api/n8n/lead-status` | Mover stage + gravar valor_servico |
| `gerar_cobranca_consulta` | `/api/n8n/criar-checkout` (tipo=consulta) | Cliente aceitou consulta R$ 19,99 |
| `gerar_cobranca_limpeza` | `/api/n8n/criar-checkout` (tipo=limpeza_desconto) | Cliente aceitou limpeza R$ 480,01 |
| `blindagem_cadastro` | `/api/n8n/blindagem-cadastro` | Cliente sem pendência aceitou Blindagem |
| `memory_long` | `/api/n8n/memory-long` | Atualizar memória do agente |
| `aplicar_label` | `/api/n8n/aplicar-label` | Aplicar labels (12 contextos) |
| `status_processo` | `/api/n8n/status-processo` | Cliente perguntou "tá pronto?" |

### Padrão técnico (skills `spv-core` + `n8n-workflow-patterns`)
- ✅ Tools com `bodyParameters` + `$fromAI()` (NUNCA `specifyBody:json`)
- ✅ Bearer token nos headers de cada tool
- ✅ `onError: continueRegularOutput` em 105+ nós críticos
- ✅ `Respond to Webhook` com body JSON fixo (5/5)
- ✅ Configs Kanban com **AMBOS** `Acoount ID` (typo) E `Conta do Chatwoot`
- ✅ Webhook5 path mantido (regra spv-core: NUNCA mudar)

### Histórico de versões

| Versão | Status | Notas |
|---|---|---|
| `Multi Agentes LNB.json` | Backup | Original Evolution API |
| `Multi Agentes LNB v02.json` | Backup | v2 antiga (Evolution) |
| `Multi Agentes LNB v03-DEPRECATED.json` | ❌ Deprecated | Patches encadeados que deram bug |
| `Multi Agentes LNB v04.json` | Histórico | Clone Matriz inicial (218 nós) |
| `Multi Agentes LNB v05.json` | Histórico | v04 + auditoria (178 nós) |
| **`Multi Agentes LNB v06.json`** | ✅ **PRODUÇÃO** | v05 sem trigger SPV órfão (171 nós) |

---

## 💸 Fluxo de Venda Detalhado

### Caminho A — Site (origem='site')

```
1. Cliente acessa /consultar
2. Preenche CPF + dados + senha
3. /api/site/checkout cria preference MP
4. Redireciona pro Mercado Pago
5. Cliente paga R$ 19,99
6. MP envia webhook → /api/site/mp-webhook
   ├─ Valida HMAC (MP_WEBHOOK_SECRET)
   ├─ Detecta tipo=consulta + origem=site
   ├─ Chama API Full (R$ 2,49)
   ├─ Gera PDF (pdfkit, 1 página, 4 quadrantes)
   ├─ Upload Storage bucket lnb-relatorios (público)
   ├─ Salva pdf_url em LNB_Consultas + LNB - CRM
   └─ Envia email Resend com link PDF
7. Cliente vê resultado em /consultar?status=success (polling 5s)
8. Se tem_pendencia: CTA "Limpar agora" pré-preenche /contratar
9. Cliente paga R$ 480,01 → mp-webhook → marca Fechado=true
10. Email "Equipe inicia em até 4h úteis"
```

### Caminho B — WhatsApp (origem='whatsapp')

```
1. Cliente manda msg pro +55 11 99744-0101
2. WhatsApp Cloud API → Chatwoot Inbox 12
3. Chatwoot envia webhook → n8n Multi Agentes v06
4. Webhook5 → If2 → SetFieldsBasic → Mover Lead (Auto)
   └─ /api/n8n/lead-status (stage=Lead) → CRM + PATCH Chatwoot + label origem-whatsapp
5. Cadeia de processamento → AI Agent (Maia) responde
6. Maia coleta 4 dados → Orquestrador chama:
   - lead_status (stage=Interessado, valor_servico, tipo_servico)
   - memory_long (resumo)
7. Cliente aceita consulta → Orquestrador chama:
   - gerar_cobranca_consulta (telefone, cpf, nome, email, tipo=consulta)
     └─ /api/n8n/criar-checkout cria preference MP + aplica label "interessado_consulta"
   - lead_status (stage=Qualificado)
   - Maia envia init_point pro cliente
8. Cliente paga R$ 19,99 no MP
9. MP webhook → /api/site/mp-webhook (mesmo handler que site, mas detecta origem=whatsapp)
   ├─ Valida HMAC
   ├─ Chama API Full
   ├─ Gera PDF
   ├─ Aplica labels: pago-consulta + tem-pendencia/nome-limpo + score-*
   ├─ registrarConsultaNoCard:
   │   ├─ Custom Attributes (cpf, score, status, qtd, total, pdf_url)
   │   └─ Private Note (resumo + link PDF)
   ├─ Envia mensagem texto via Chatwoot
   └─ Envia PDF como ANEXO via Chatwoot (cliente recebe direto no WhatsApp)
10. Cliente reage ao PDF
11. Se tem pendência: aceita limpeza → gerar_cobranca_limpeza
12. Cliente paga R$ 480,01 → mp-webhook
    ├─ webhook_registrar_limpeza_fechada (Fechado=true)
    ├─ aplicar_label('pago_limpeza')
    ├─ registrarLimpezaPagaNoCard (atributes + private note "iniciar em 4h")
    └─ Envia mensagem WhatsApp "Equipe assume agora"
13. Maia para de vender, fica disponível pra status_processo se cliente perguntar
```

---

## 🗃️ Schema Supabase

### Tabela `LNB - CRM` (single source of truth)

| Coluna | Tipo | Função |
|---|---|---|
| `id` | bigint | PK |
| `created_at` | timestamptz | Data criação |
| `nome` | text | Nome cliente |
| `telefone` | text | Telefone (chave de busca) |
| `CPF` | text | CPF (sem formatação) |
| `e-mail` | text | Email |
| `Servico` | text | Serviço solicitado |
| `Lead` | bool | Stage Lead |
| `Interessado` | bool | Stage Interessado |
| `Qualificado` | bool | Stage Qualificado |
| `Fechado` | bool | Stage Fechado |
| `perdido` | bool | Stage Perdido |
| `valor_servico` | text | "R$ 19,99" / "R$ 480,01" |
| `tipo_servico` | text | "consulta" / "limpeza_desconto" / "blindagem" |
| `conversation_id` | bigint | ID Chatwoot |
| `kanban_item-id` | text | ID do card |
| `last_interaction` | timestamptz | Última msg |
| `link_pagamento` | text | URL MP |
| `external_ref` | text | Ref MP |
| `id_pagamento` | text | ID preference MP |
| `status_pagamento` | text | "paid" / "pending" |
| `pdf_url` | text | URL do PDF da consulta |
| `score` | int | Score crédito |
| `tem_pendencia` | bool | Resultado consulta |
| `qtd_pendencias` | int | Qtd pendências |
| `total_dividas` | numeric | Total R$ pendências |
| `memoria_longa` | text | Markdown da Maia |
| `origem` | text | "whatsapp" / "site" |
| `data_nascimento` | text | dd/mm/aaaa |
| `30min, 2hs, 6hs, 12hs, 24hs, 48hs, 72hs, 120hs, 168hs` | bool | Timers de followup |

### Tabela `LNB_Consultas`

| Coluna | Tipo | Função |
|---|---|---|
| `id` | uuid | PK |
| `cpf` | text | CPF (chave) |
| `nome`, `email`, `telefone` | text | Dados |
| `data_nascimento` | text | |
| `provider` | text | "apifull" |
| `resultado_raw` | jsonb | JSON cru API Full |
| `tem_pendencia` | bool | |
| `qtd_pendencias` | int | |
| `total_dividas` | numeric | |
| `resumo` | text | "X pendências, R$ Y" |
| `consulta_paga` | bool | TRUE após webhook MP |
| `fechou_limpeza` | bool | TRUE após pagar limpeza |
| `pdf_url` | text | URL do PDF |
| `mp_preference_consulta` | text | external_ref consulta |
| `mp_preference_limpeza` | text | external_ref limpeza |
| `created_at` | timestamptz | |
| `origem` | text | |

### Tabela `LNB_Blindagem`

| Coluna | Tipo |
|---|---|
| `id`, `cpf`, `nome`, `telefone`, `email` | uuid/text |
| `ativo` | bool |
| `plano` | text ("mensal" / "anual") |
| `valor` | numeric |
| `proxima_verificacao` | timestamptz |
| `ultima_verificacao` | timestamptz |
| `resultado_ultima` | jsonb |
| `tem_pendencia_atual` | bool |
| `created_at` | timestamptz |

### RPCs SECURITY DEFINER (substituem service_role)

| RPC | Função |
|---|---|
| `cliente_pode_contratar_limpeza(cpf)` | Valida 4 condições antes do checkout limpeza |
| `lnb_cliente_register/login/dashboard` | Auth cliente custom |
| `webhook_registrar_consulta_paga` | mp-webhook escreve consulta paga |
| `webhook_registrar_limpeza_fechada` | mp-webhook marca limpeza fechada |
| `webhook_set_pdf_url` | Atualiza pdf_url após gerar |
| `checkout_upsert_crm_lead` | Upsert no CRM |
| `checkout_save_preference` | Salva preference MP |
| `lnb_crm_set_valor_servico` | Grava valor + tipo (padrão SPV) |
| `lnb_crm_set_consulta_resultado` | Grava resultado API Full |
| `lnb_crm_set_conversation` | Vincula conversation_id Chatwoot |
| `n8n_atualizar_memoria_longa` | Memória do agente |
| `admin_lead_set_status` | Move stage no CRM |
| `blindagem_atualizar_verificacao` | Atualiza após cron |
| `is_lnb_admin` / `has_lnb_role` | RLS helpers |

---

## 📄 PDF do Relatório

### Geração
- **Lib:** `pdfkit` (puro Node, sem Chrome)
- **Tamanho:** ~3-5KB por PDF
- **Formato:** A4, 1 página
- **Localização:** `src/lib/pdf/gerar-relatorio.ts`

### Layout (extrato bancário sóbrio)
1. **Header forest verde (56px)** com logo "LNB" + título "RELATÓRIO DE CONSULTA DE CPF" + data/hora
2. **Dados do consultado** (2 colunas: NOME, CPF, EMAIL, TELEFONE)
3. **Análise de crédito** (4 boxes lado a lado: Score, Faixa, Pendências, Total)
4. **Pendências registradas** (tabela com header dark, máx 8 linhas, total destacado)
5. **Próximos passos** (box CTA forest com R$ 480,01 e botão limpanomebrazil.com.br)
6. **Footer** com protocolo, fonte de dados, contatos LNB

### Onde aparece pro cliente

**Site (origem='site'):**
1. Email Resend com link público
2. Painel cliente `/conta/dashboard`

**WhatsApp (origem='whatsapp'):**
1. Mensagem com PDF anexo na timeline da conversa
2. Custom Attributes do card (campo `pdf_url`)
3. Private Note (resumo + link)
4. Email backup (se cliente passou email)

---

## 🔄 Fluxos n8n LNB

### Fluxos ATIVOS (1)
| Fluxo | Função |
|---|---|
| **Multi Agentes LNB v06** | Atendimento WhatsApp via Maia (única coisa em n8n) |

### Fluxos AUXILIARES
| Fluxo | Função |
|---|---|
| **Limpeza Geral de Base LNB** | Form trigger pra apagar histórico de teste (15 chaves Redis + 3 tabelas LNB) |

### Fluxos DESATIVADOS / INTERNALIZADOS
| Fluxo n8n antigo | Substituído por |
|---|---|
| ~~Fechamento - LNB v03~~ | `/api/site/mp-webhook` (painel) |
| ~~Cobrança Dinâmica LNB~~ | `/api/site/checkout` + `/api/n8n/criar-checkout` |
| ~~PDF Generator LNB v03~~ | `pdfkit` interno (`src/lib/pdf/`) |
| ~~Blindagem Cron LNB v03~~ | Vercel Cron + `/api/cron/blindagem-diaria` |
| ~~Blindagem Cadastro LNB~~ | `/api/n8n/blindagem-cadastro` |

**Filosofia adotada:** internalizar tudo que dá no painel pra ter mais controle, observabilidade (logs Vercel) e versionamento (Git). n8n fica só pro atendimento WhatsApp (porque AI Agent + tools é caso de uso ideal pra n8n).

---

## 🧪 Como testar

### Teste sem custo (sem API Full)
1. Acesse `/painel/teste-fluxo` (logado como admin)
2. Selecione "🌐 Site" como origem
3. **Marque** ✅ "API Full" pra pular (usa mock R$ 4.872 com 3 pendências)
4. Executar fluxo
5. Validar: PDF gerado + email Resend + link no card resumo

### Teste real (R$ 19,99 + R$ 2,49 API Full)
1. Acesse https://limpanomebrazil.com.br/consultar
2. Preencha CPF real + dados + senha
3. Pague com Pix
4. Polling automático mostra 3 checkmarks: ✅ Pagamento → ✅ Consulta → ✅ PDF
5. Email chega + login `/conta/login`

### Teste WhatsApp end-to-end
1. Manda mensagem do seu WhatsApp pra `+55 11 99744-0101`
2. Maia responde em 5-15s
3. Card aparece em Chatwoot Account 11 → Funil "Limpeza de Nome" → coluna **Lead** automaticamente
4. Conversa simulada coleta dados → Interessado
5. Aceita consulta → link MP enviado → Qualificado
6. Paga → resultado vem como PDF anexo + custom attributes preenchidos

### Limpar histórico (entre testes)
1. Acessa form n8n: `https://[n8n-url]/form/limpeza-base-lnb`
2. Coloca telefone com DDI (ex: 5511997440101)
3. Submit → apaga 15 chaves Redis + 3 tabelas LNB

---

## 📊 Painel Admin

### Rotas (`/painel/*`)

| Rota | Função |
|---|---|
| `/painel/dashboard` | Métricas (leads, conversões, receita) |
| `/painel/leads` | CRM lista + filtros + Kanban (futuro) |
| `/painel/consultas` | Histórico consultas pagas |
| `/painel/blindagem` | Cadastros blindagem mensal |
| `/painel/processos` | Kanban interno pós-venda (limpeza/blindagem/consulta) |
| `/painel/processos/[id]` | Detalhe processo + uploads + timeline |
| `/painel/financeiro` | Relatórios receita |
| `/painel/equipe` | Gestão admins |
| `/painel/teste-fluxo` | Dry-run debug end-to-end |
| `/painel/configuracoes` | Settings |

### Auth admin
- Supabase Auth nativo
- Login: `lucas@dosedegrowth.com.br` / `<ADMIN_PASSWORD>`
- Role: `owner`
- RLS via SECURITY DEFINER `is_lnb_admin()`

### Etapas pós-venda (`lnb_processos`)

| Tipo | Etapas |
|---|---|
| **Limpeza** | iniciado → documentação → análise → execução → finalizado (5 etapas) |
| **Blindagem** | ativada → monitorando → alerta → encerrada (4 etapas) |
| **Consulta** | pago → executada → entregue (3 etapas) |

Cada mudança de etapa dispara:
- Email cliente (Resend)
- WhatsApp Chatwoot (template Meta ou texto livre)

---

## 🆘 Troubleshooting

### "Conflicting Webhook Path" no n8n ao ativar
**Causa:** webhook UUID conflita com SPV Matriz 110.
**Fix:** v06 já tem só 1 webhook (Webhook5). Se ainda der, deletar workflows antigos LNB v03/v04/v05.

### Card não move no Chatwoot
**Causa:** `CHATWOOT_ADMIN_TOKEN` não configurado.
**Fix:** Setar env no Vercel + redeploy.

### PDF não gera
**Causa:** `pdfkit` requer Node runtime (não Edge).
**Fix:** já configurado `next.config.ts` com `serverExternalPackages: ['pdfkit']` + `runtime = 'nodejs'` nos handlers.

### Webhook MP não chega
**Causa:** URL errada no painel MP ou modo Teste vs Produtivo.
**Fix:** Confirmar URL = `https://limpanomebrazil.com.br/api/site/mp-webhook` no modo Produtivo.

### Maia não responde
**Causa:** Workflow n8n inativo OU credencial Gemini sem saldo.
**Fix:** Ativar Multi Agentes LNB v06 + verificar quota Gemini.

### Cliente paga mas consulta não roda
**Causa:** API Full sem saldo ou token expirado.
**Fix:** Verificar saldo em https://app.apifull.com.br + confirmar `API_FULL_TOKEN`.

---

## 🔧 Comandos úteis

### Build local + push
```bash
cd /Users/lucascassiano/Antigravity/lnb-painel
npm run build
git add -A
git commit -m "feat: ..."
git push origin main
# Vercel auto-deploy em ~1min
```

### Testar endpoint via curl
```bash
TOKEN="<N8N_SHARED_TOKEN>"
curl -s "https://limpanomebrazil.com.br/api/n8n/lead-status" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"telefone":"5511997440101","stage":"Lead"}'
```

### Logs Vercel em tempo real
```
https://vercel.com/dose-de-growths-projects/lnb-painel/logs
```
Filtros úteis: `[mp-webhook]`, `[n8n/lead-status]`, `[chatwoot]`, `[pdf-gerar]`

### Query Supabase direto
```sql
-- Ver leads recentes
SELECT telefone, nome, "Lead", "Interessado", "Qualificado", "Fechado",
       valor_servico, tipo_servico, last_interaction
FROM "LNB - CRM"
ORDER BY last_interaction DESC NULLS LAST
LIMIT 20;

-- Ver consultas com PDF
SELECT cpf, nome, tem_pendencia, qtd_pendencias, total_dividas, pdf_url
FROM "LNB_Consultas"
WHERE consulta_paga = true
ORDER BY created_at DESC;
```

---

## 📚 Referências

### Skills aplicadas
- `spv-core` — regras críticas (webhook5, $fromAI, onError, Account ID typo)
- `spv-matriz` — padrão validado em produção (origem do clone)
- `n8n-workflow-patterns` — 5 patterns + checklist de criação
- `workflow-automation` — durabilidade, idempotência, sharp edges
- `chatwoot-api` — Account/Inbox/Funnel/Labels/Custom Attributes

### Documentos relacionados
- `/Users/lucascassiano/.claude/projects/-Users-lucascassiano-Claude/memory/lnb-projeto.md` — memória técnica
- `/Users/lucascassiano/Downloads/LNB-v2-fluxo-definitivo.md` — fluxo conversacional Maia
- `/Users/lucascassiano/Downloads/LNB_MIGRATION_v03.md` — relatório migração v03
- `/Users/lucascassiano/Antigravity/lnb-painel/REGRAS_E_LOGICA.md` — regras operacionais
- `/Users/lucascassiano/Antigravity/lnb-painel/DEPLOY_GUIDE.md` — guia deploy

---

## ✅ Checklist Estado Atual (09/05/2026)

### Backend painel
- [x] Domínio `limpanomebrazil.com.br` HTTPS
- [x] Vercel auto-deploy GitHub
- [x] 6 endpoints `/api/n8n/*` Bearer auth
- [x] mp-webhook com HMAC validation
- [x] PDF interno pdfkit (1 página A4)
- [x] Email Resend (domínio verificado)
- [x] Chatwoot 3 libs (kanban, labels, attributes, attach)
- [x] 16 RPCs SECURITY DEFINER
- [x] Vercel Cron blindagem diária
- [x] Painel `/painel/teste-fluxo` debug

### Chatwoot
- [x] Inbox 12 WhatsApp Cloud API ativa
- [x] Funil 1 "Limpeza de Nome" 5 stages
- [x] 16 labels cadastradas via API
- [x] Webhook configurado pra n8n
- [x] Bot token + Admin token no Vercel

### n8n
- [x] Multi Agentes LNB v06 gerado (171 nós)
- [x] Limpeza Geral de Base LNB form trigger
- [ ] **AÇÃO PENDENTE:** importar v06 + ativar
- [ ] **AÇÃO PENDENTE:** testar mensagem real WhatsApp

### Mercado Pago
- [x] APP_USR token Produtivo
- [x] Webhook configurado
- [x] HMAC secret no Vercel

### Supabase
- [x] 5 tabelas LNB com RLS
- [x] 3 buckets Storage com policies
- [x] 16 RPCs públicas (anon/authenticated)
- [x] Service role disponível pra Storage processos

### Site
- [x] Home com 2 planos conectados (Consulta → Limpeza)
- [x] `/consultar` wizard 3 steps
- [x] `/contratar` 3-state com guard de elegibilidade
- [x] Área cliente `/conta/*`
- [x] SEO completo (sitemap, robots, OG, JSON-LD)

---

## 🎯 Próximos passos (roadmap)

### Curto prazo (esta sessão)
1. **Importar v06 no n8n + ativar**
2. **Testar mensagem real** WhatsApp `+55 11 99744-0101`
3. **Validar fluxo completo** (Lead → Interessado → Qualificado → pagamento → PDF)

### Médio prazo (próximas sessões)
1. **Templates Meta WhatsApp aprovados** (pra mensagens fora janela 24h)
2. **Visão Kanban no `/painel/leads`** (5 colunas espelhando Chatwoot)
3. **Dashboard métricas** com conversão real
4. **Multi Agentes LNB v07+** com ajustes baseados em uso real

### Longo prazo
1. **Calculadora de score** interativa na home
2. **Vídeo explicativo 60s** acima do hero
3. **Blog SEO** (artigos sobre Cadastro Positivo, score baixo, Serasa)
4. **Selo Reclame Aqui** quando tiver conta
5. **Mobile app** (React Native) pra cliente acompanhar

---

## 📞 Contatos & Credenciais

| Item | Valor |
|---|---|
| **Email contato** | contato@limpanomebrazil.com.br |
| **WhatsApp** | +55 11 99744-0101 |
| **CNPJ** | (a definir/preenchido futuramente) |
| **Admin painel** | lucas@dosedegrowth.com.br / <ADMIN_PASSWORD> |
| **GitHub** | dosedegrowth-design/lnblimpanome |

---

> **Documentação viva.** Atualize sempre que mudar arquitetura, adicionar endpoint, ou criar nova versão de fluxo n8n. Versão atual: **09/05/2026**.


---

> ⚠️ **Credenciais reais NÃO ficam no repo Git.** Estão em:
> `~/.claude/skills/lnb-projeto/references/credenciais.md` (local apenas)
