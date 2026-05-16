# 📘 LNB — Limpa Nome Brazil · Documentação Completa

> **Documento mestre do projeto.** Cobre arquitetura, regras de negócio, valores, fluxos, telas, integrações, banco, APIs e operação. Atualizado em 15/mai/2026.

---

## 📑 Sumário

1. [Visão geral do produto](#1-visão-geral-do-produto)
2. [Modelo de negócio e valores](#2-modelo-de-negócio-e-valores)
3. [Custos reais e margens](#3-custos-reais-e-margens)
4. [Arquitetura técnica](#4-arquitetura-técnica)
5. [Banco de dados](#5-banco-de-dados)
6. [Funções RPC (Postgres)](#6-funções-rpc-postgres)
7. [Painel administrativo](#7-painel-administrativo)
8. [Painel do cliente final](#8-painel-do-cliente-final)
9. [Site público](#9-site-público)
10. [Fluxo de vendas end-to-end](#10-fluxo-de-vendas-end-to-end)
11. [Operação da limpeza](#11-operação-da-limpeza)
12. [Blindagem (assinatura mensal)](#12-blindagem-assinatura-mensal)
13. [Endpoints da API](#13-endpoints-da-api)
14. [Integrações externas](#14-integrações-externas)
15. [Regras de negócio](#15-regras-de-negócio)
16. [Modo teste](#16-modo-teste)
17. [Design system](#17-design-system)
18. [Manutenção e personalização](#18-manutenção-e-personalização)
19. [Deploy e ambiente](#19-deploy-e-ambiente)
20. [Pendências e roadmap](#20-pendências-e-roadmap)

---

## 1. Visão geral do produto

**Limpa Nome Brazil (LNB)** é uma plataforma **100% digital** para limpeza de nome, com 3 produtos principais e 1 add-on de monitoramento.

### Proposta de valor

- **Resolve sem o cliente quitar a dívida** — atuação jurídica direta com órgãos de proteção ao crédito
- **Prazo**: 20 dias úteis para limpeza, 3-5 dias úteis adicionais para constar no Serasa Experian (app gratuito)
- **Score sobe automaticamente** após limpeza
- **Acompanhamento online**: cliente vê tudo no `/conta/dashboard`
- **2 canais de venda**: Site `/consultar` (self-service) e WhatsApp (agente Maia via n8n)

### URLs

- **Site público**: https://limpanomebrazil.com.br
- **Painel admin**: https://limpanomebrazil.com.br/painel
- **Painel cliente**: https://limpanomebrazil.com.br/conta
- **GitHub**: github.com/dosedegrowth-design/lnblimpanome
- **Vercel**: team `dose-de-growths-projects` · projeto `lnb-painel`
- **Supabase**: projeto `hkjukobqpjezhpxzplpj` (DDG, sa-east-1)
- **Chatwoot**: chat.dosedegrowth.pro · Account 11 · Inbox 12

---

## 2. Modelo de negócio e valores

### Catálogo de produtos (tabela `lnb_produtos`)

| Código | Nome | Preço real | Modo teste | Desconto (consulta paga ≤15d) |
|---|---|---|---|---|
| `consulta_cpf` | Consulta CPF | **R$ 29,99** | R$ 5,00 | — |
| `consulta_cnpj` | Consulta CNPJ | **R$ 39,99** | R$ 5,00 | — |
| `limpeza_cpf` | Limpeza de Nome CPF | **R$ 500,00** | R$ 5,00 | R$ 29,99 (vira R$ 470,01) |
| `limpeza_cnpj` | Limpeza de Nome CNPJ + Sócio | **R$ 580,01** | R$ 5,00 | R$ 39,99 (vira R$ 540,02) |
| `blindagem` | Blindagem mensal CPF | **R$ 29,90 / mês** | R$ 5,00 | — |

### Regra do desconto da limpeza

- Cliente que paga **Consulta CPF** ganha 15 dias de desconto na Limpeza
- Desconto = preço da consulta (R$ 29,99 ou R$ 39,99)
- Após 15 dias: paga preço cheio
- RPC: `lnb_calcular_valor_limpeza(cpf)` retorna `tem_desconto`, `valor_com_desconto`, `dias_restantes`

### Pré-requisito da limpeza

- Cliente **NUNCA** contrata limpeza sem ter feito consulta com pendência
- RPC: `cliente_pode_contratar_limpeza(cpf)` valida — retorna `{pode: bool, motivo}`
- Bloqueio aplicado em `/api/site/checkout` e `/api/n8n/criar-checkout`

---

## 3. Custos reais e margens

### Custo unitário por produto

| Produto | Custo do provedor | Detalhamento |
|---|---|---|
| **Consulta CPF** | R$ 8,29 | Serasa Premium R$ 5,80 + Boa Vista R$ 2,49 |
| **Consulta CNPJ** | R$ 8,33 | CNPJ Receita R$ 0,04 + Boa Vista R$ 2,49 + Serasa Premium R$ 5,80 (do sócio) |
| **Limpeza CPF** | R$ 8,29 | 1 nova consulta de verificação após finalizar |
| **Limpeza CNPJ** | R$ 8,33 | Idem |
| **Blindagem mensal** | R$ 5,80 | Apenas Serasa Premium (monitoramento mensal) |

### Margem operacional

| Produto | Preço | Custo | Margem R$ | Margem % |
|---|---|---|---|---|
| Consulta CPF | R$ 29,99 | R$ 8,29 | R$ 21,70 | **72,4%** |
| Consulta CNPJ | R$ 39,99 | R$ 8,33 | R$ 31,66 | **79,2%** |
| Limpeza CPF | R$ 500,00 | R$ 8,29 | R$ 491,71 | **98,3%** |
| Limpeza CNPJ | R$ 580,01 | R$ 8,33 | R$ 571,68 | **98,6%** |
| Blindagem | R$ 29,90 | R$ 5,80 | R$ 24,10 | **80,6%** |

**Observação:** taxa do Asaas (gateway) não está incluída — tipicamente Pix 1,99% / Cartão 3,49% + R$ 0,49.

---

## 4. Arquitetura técnica

### Stack

| Camada | Tecnologia |
|---|---|
| Frontend | **Next.js 16** (App Router) + React 19 + Tailwind v4 |
| UI | shadcn-like custom · framer-motion · lucide-react |
| Backend | Next.js API routes (Node runtime) |
| Banco | **Supabase PostgreSQL 15** |
| Auth painel | Supabase Auth + RLS |
| Auth cliente | Custom CPF+senha (`lnb_cliente_auth`) |
| Pagamentos | **Asaas** (Pix + Cartão + Boleto + Subscriptions) |
| WhatsApp | **Chatwoot Cloud API** oficial Meta |
| AI agente | **Google Gemini** (cred `LNB Limpa Nome`) |
| Email | **Resend** (domínio verificado limpanomebrazil.com.br) |
| Storage | Supabase Storage (3 buckets) |
| PDF | pdfkit puro Node |
| Workflow WhatsApp | **n8n** (workflow `Multi Agentes LNB v10`) |
| Hospedagem | Vercel (region GRU - SP) |

### Buckets

- `lnb-relatorios` (público) — PDFs de consulta
- `lnb-processos` (privado) — anexos de processo (signed URL)
- `lnb-assets` (público) — assets gerais

### Diagrama macro

```
                    ┌─────────────────┐
                    │  Cliente final  │
                    └────────┬────────┘
                             │
            ┌────────────────┼────────────────┐
            │                │                │
       ┌────▼────┐    ┌──────▼────┐    ┌──────▼───────┐
       │  Site   │    │ WhatsApp  │    │ /conta/login │
       │ público │    │ (Chatwoot)│    │ (área cliente)│
       └────┬────┘    └─────┬─────┘    └──────┬───────┘
            │               │                  │
            │          ┌────▼─────┐            │
            │          │   n8n    │            │
            │          │ (Maia)   │            │
            │          └────┬─────┘            │
            │               │                  │
            └───────────────┼──────────────────┘
                            │
                     ┌──────▼───────┐
                     │ Next.js API  │
                     │   routes     │
                     └──────┬───────┘
                            │
            ┌───────────────┼────────────────┐
            │               │                │
       ┌────▼────┐    ┌─────▼────┐    ┌──────▼──────┐
       │ Asaas   │    │ Supabase │    │   Resend    │
       │(pagto)  │    │  (banco) │    │   (email)   │
       └─────────┘    └──────────┘    └─────────────┘
                            │
                     ┌──────▼──────┐
                     │ Provedor de │
                     │  consulta   │
                     │ (CPF/CNPJ)  │
                     └─────────────┘
```

---

## 5. Banco de dados

### Tabelas principais

#### `lnb_admin_users`
Usuários do painel admin (vinculado a Supabase Auth)
- `id` (uuid, FK auth.users), `email`, `nome`, `role` (`owner`|`admin`|`viewer`|`consultor`), `ativo`, `created_at`

#### `lnb_cliente_auth`
Auth custom dos clientes finais
- `cpf` (PK), `nome`, `email`, `telefone`, `senha_hash` (bcrypt), `email_verificado`, `failed_attempts`, `locked_until`, `created_at`, `last_login_at`

#### `LNB - CRM`
Single source of truth do funil de leads/clientes
- `id`, `created_at`, `nome`, `Servico`, `telefone`, `unidade`, `Lead`, `Interessado`, `Agendado`, `Fechado`, `perdido`, `value`, `placa`, `origem` (`site`|`whatsapp`|`admin`), `CPF`, `e-mail`, `data_nascimento`, `link_pagamento`, `external_ref`, `id_pagamento`, `status_pagamento`, `memoria_longa`, `valor_servico`, `tipo_servico`, `conversation_id`, `last_interaction`, `pdf_url`, `score`, `tem_pendencia`, `qtd_pendencias`, `total_dividas`, `labels_aplicadas[]`, `ia_pausada`, `ia_pausada_em`, `ia_pausa_motivo`, `cnpj`, `razao_social`, `cpf_responsavel`, `nome_responsavel`

#### `LNB - Base`
Idem CRM pós-agendamento (legado, espelha CRM)

#### `LNB_Consultas`
Histórico de consultas executadas
- `id`, `cpf` ou `cnpj`, `nome`, `data_nascimento`, `telefone`, `email`, `provider` (=`apifull`), `resultado_raw` (jsonb), `tem_pendencia`, `resumo`, `total_dividas`, `qtd_pendencias`, `consulta_paga`, `fechou_limpeza`, `pdf_url`, `mp_preference_consulta`, `mp_preference_limpeza`, `created_at`, `origem`, `tipo_documento`, dados PJ (`razao_social`, `nome_fantasia`, `situacao_cadastral`, `capital_social`, `data_abertura`, `cnae_principal`, `socios_jsonb`, `cpf_responsavel`, `nome_responsavel`, `resultado_pj_jsonb`), `provider_status`, `provider_error`, `score`, `score_serasa`, `score_boa_vista`, `resultado_serasa_raw`, `resultado_boa_vista_raw`

#### `LNB_Blindagem`
Assinaturas de monitoramento mensal
- `id`, `cpf` (UNIQUE), `nome`, `telefone`, `email`, `ativo`, `plano` (`mensal`|`anual`), `valor`, `proxima_verificacao`, `ultima_verificacao`, `resultado_ultima` (jsonb), `tem_pendencia_atual`, `asaas_subscription_id`, `asaas_customer_id`, `created_at`

#### `lnb_processos`
Kanban interno (jornada do cliente em 1 lugar)
- `id` (uuid), `cpf`, `nome`, `email`, `telefone`, `tipo` (legado), `tag_servico` (FK `lnb_tags_servico`), `etapa` (FK `lnb_kanban_etapas`), `responsavel_id`, `prazo_dias`, `observacoes`, `pdf_url`, `valor_pago`, `finalizado_em`, `created_at`, `updated_at`

#### `lnb_processo_eventos`
Timeline do processo (cada mudança gera 1 evento)
- `id`, `processo_id`, `tipo` (`etapa`|`mensagem`|`arquivo`|`sistema`|`mudanca_etapa`|`mudanca_tag`), `etapa_anterior`, `etapa_nova`, `mensagem`, `metadata` (jsonb), `criado_por` (auth.uid), `visivel_cliente`, `notificou_email`, `notificou_wa`, `autor_nome`, `created_at`

#### `lnb_processo_arquivos`
Anexos vinculados ao processo
- `id`, `processo_id`, `evento_id`, `tipo` (`comprovante`|`relatorio`|`outro`), `nome_arquivo`, `caminho_storage`, `tamanho_bytes`, `mime_type`, `visivel_cliente`, `upload_por`, `created_at`

#### `lnb_audit_log`
Auditoria de ações administrativas
- `id`, `actor_id`, `actor_type`, `action`, `resource_type`, `resource_id`, `metadata`, `ip`, `user_agent`, `created_at`

#### `lnb_webhook_processado`
Idempotência de webhook Asaas
- `payment_id` (PK), `event`, `external_reference`, `cpf`, `cnpj`, `processed_at`

#### `lnb_produtos` ⭐ (gerenciável via UI)
Master data dos produtos
- `codigo` (PK), `nome`, `preco_real`, `preco_teste`, `desconto_consulta`, `custo_api`, `ativo`, `ordem`, `descricao`, `updated_at`

#### `lnb_kanban_etapas` ⭐ (gerenciável via UI)
Etapas únicas do Kanban em 2 funis
- `codigo` (PK), `nome`, `emoji`, `cor` (`brand`|`amber`|`emerald`|`violet`|`red`|`gray`|`forest`), `funil` (`pre`|`pos`), `descricao`, `ordem`, `ativo`, `updated_at`

**Funil PRÉ-pagamento (6 etapas):**
1. `lead` — Lead novo
2. `interessado` — Demonstrou interesse
3. `qualificado` — Recebeu link de pagamento
4. `consulta_paga` — Pagou consulta, relatório entregue
5. `limpeza_paga` — Pagou limpeza, vai pra time tratar
6. `perdido` — Desistiu

**Funil PÓS-pagamento (5 etapas):**
7. `em_tratativa` — Time iniciou processo
8. `aguardando_orgaos` — Limpou, esperando Serasa Experian (3-5d úteis)
9. `nome_limpo` — Confirmado limpo
10. `blindagem_ativa` — Migrou pra recorrente
11. `encerrada` — Cancelou pós-venda

#### `lnb_tags_servico` ⭐ (gerenciável via UI)
Tag identificando o serviço de cada card
- `codigo` (PK), `nome`, `cor`, `emoji`, `produto_codigo` (FK `lnb_produtos`), `ordem`, `ativo`

**Tags atuais (5):**
- `consulta_cpf` (Consulta CPF · brand)
- `consulta_cnpj` (Consulta CNPJ · violet)
- `limpeza_cpf` (Limpeza CPF · emerald)
- `limpeza_cnpj` (Limpeza CNPJ · forest)
- `blindagem` (Blindagem · amber)

#### `LNB_API_Control`
Saldo dos provedores de consulta (uso vs limite mensal)
- `id`, `mes_ano`, `bigdatacorp_count`, `bigdatacorp_limit`, `soawebservices_count`, `provider_ativo`

### RLS (Row Level Security)

- `lnb_produtos`, `lnb_kanban_etapas`, `lnb_tags_servico` → RLS habilitado, acesso só via RPCs SECURITY DEFINER
- `LNB_Consultas` → RLS, acesso via RPCs com validação de CPF/admin
- Demais tabelas LNB: RLS habilitado para painel admin

---

## 6. Funções RPC (Postgres)

Total: **60 RPCs** (todas SECURITY DEFINER quando aplicável).

### Leitura admin

- `admin_dashboard_metrics()` — KPIs do dashboard
- `admin_clientes_list()` — Vista unificada de clientes (processos + consultas)
- `admin_processos_list(p_tipo, p_etapa, p_responsavel_id)` — Kanban admin
- `admin_processo_detail(p_processo_id)` — Detalhe + eventos + arquivos + consulta vinculada
- `admin_users_list()` — Lista de admins

### Mutações admin

- `admin_processo_criar(...)`, `admin_processo_mover_etapa(...)`, `admin_processo_mensagem(...)`
- `admin_lead_set_status(...)` — Move stage do CRM
- `admin_user_add/update(...)`
- `admin_blindagem_pausar/reativar(...)`

### Master data (gerenciamento UI)

- `lnb_get_preco(codigo, p_modo_teste)` — Preço atual (respeita modo teste)
- `lnb_get_precos_map(p_modo_teste)` — Mapa completo
- `lnb_get_etapas()` — Lista etapas ordenadas
- `lnb_get_tags()` — Tags + count de processos
- `lnb_admin_update_produto(codigo, patch)` — Editar produto
- `lnb_admin_update_etapa(codigo, patch)` — Upsert etapa
- `lnb_admin_update_tag(codigo, patch)` — Upsert tag
- `lnb_admin_reordenar_etapas/tags(array_codigos)` — Reorder
- `lnb_processo_mover_etapa(id, codigo)` · `lnb_processo_set_tag(id, codigo)` · `lnb_processo_set_pdf_url(cpf, url)`

### Webhook / Pós-pagamento

- `webhook_criar_processo_consulta/limpeza/blindagem(cpf, nome, email, telefone, valor)` — Cria lnb_processos
- `webhook_registrar_consulta_paga(...)` · `webhook_registrar_consulta_cnpj_paga(...)`
- `webhook_registrar_consulta_falha_provider(...)` — Marca falha pra reprocessar
- `webhook_registrar_limpeza_fechada(...)` · `webhook_registrar_limpeza_cnpj_fechada(...)`
- `webhook_set_consulta_resultado(...)` · `webhook_set_consulta_cnpj_resultado(...)` · `webhook_set_pdf_url(...)`
- `lnb_webhook_tentar_processar(payment_id, event, ...)` — **Idempotência** (INSERT ON CONFLICT DO NOTHING)

### Cliente final

- `lnb_cliente_register(...)` · `lnb_cliente_login(...)` · `lnb_cliente_me(...)`
- `lnb_cliente_dashboard(...)` · `cliente_meus_processos(...)`
- `cliente_pode_contratar_limpeza(cpf)` · `cliente_pode_contratar_limpeza_cnpj(cnpj)`
- `lnb_consulta_cpf_ja_paga(cpf)` · `lnb_consulta_cnpj_ja_paga(cnpj)`

### Negócio

- `lnb_calcular_valor_limpeza(cpf)` — Desconto 15 dias
- `lnb_gerar_senha_temporaria(cpf, nome, email, telefone)` — Cria acesso automático pós-pagamento
- `lnb_crm_*` — Helpers do CRM (set_consulta_resultado, add_label, set_conversation, set_ia_pause, etc)

### Auxiliares

- `_lnb_is_admin()` — Validação interna admin
- `lnb_audit_insert(...)` — Audit log
- `checkout_save_preference(...)` · `checkout_upsert_crm_lead(...)`

---

## 7. Painel administrativo

URL: `https://limpanomebrazil.com.br/painel`

### Layout macro

- **Wrapper card branco** envolvendo tudo (sidebar + topbar + main), fundo `#e4e5e7` cinza claro
- **Sidebar branca** (244px) com brand, 4 sections, user no rodapé
- **Topbar branca** (64px) com search central (⌘F) + bell + mail + avatar

### Sidebar - Sections

**Menu (Operação)**
- Dashboard
- Processos
- Limpeza
- Blindagens
- Clientes
- Leads

**Análise**
- Consultas
- Financeiro

**Geral (Configuração)**
- Equipe
- Configurações

**Suporte**
- Ajuda (link WhatsApp)
- Sair

### `/painel/dashboard`

KPIs Nexus-style + chart de barras coloridas + donut conversão + card dark.

**Seções:**
1. **Header** — saudação + data + botões "Ver Kanban" (verde) + "Limpeza" (outline) + banner modo teste
2. **4 KPI Cards** — Receita total (**verde sólido destacado**), Conversão, Processos ativos, Dívidas identificadas
3. **Vendas semana** — chart de barras (verde no dia atual, listrado nos zerados)
4. **Próxima ação** — card branco com CTA
5. **Funil** — lista compacta com dots coloridos
6. **Últimos pagamentos** — 5 mais recentes com avatar + tag emoji
7. **Taxa de conversão** — donut chart (gradient emerald)
8. **Status da operação** — card DARK com gradient + 3 métricas + botões Play/Stop
9. **Alerta** — processos parados há 5+ dias (se houver)

### `/painel/processos`

Kanban unificado com **2 funis** em tabs.

**Funcionalidades:**
- Tabs no topo: `Pré-pagamento · X` / `Pós-pagamento · Y` / `Todos · Z`
- Filtros (chip removível) + busca + select de Serviço
- Cada coluna: header colorido (cyan/amber/violet/teal/emerald/rose) com dot + nome + contador
- Card: tag pill + nome + avatar gradient + score (cor por faixa) + alerta pendência + valor pago + ícones PDF/WhatsApp
- Click no card → **Drawer lateral** com detalhes
- Estado vazio: border-dashed

### `/painel/processos/[id]`

Detalhe completo do processo.

**Funcionalidades:**
- Header com tag pill + nome + CPF + etapa atual em badge
- Card "Pagamento" com valor pago
- Card "Cliente" — dados de contato
- Card "Ações" — mover etapa, mensagem, finalizar
- Card "Consulta CPF" — score, pendências, total dívidas, PDF
- Timeline cronológica de eventos
- Arquivos anexados

### `/painel/limpeza`

Vista operacional do time (só processos pós-pagamento).

**Funcionalidades:**
- Filtra etapas `limpeza_paga`, `em_tratativa`, `aguardando_orgaos`, `nome_limpo`
- Headers coloridos (Fixolaw style)
- Card mostra: tag + nome + CPF + dias na etapa + valor + ícones
- **Botão "Finalizar Limpeza"** em cards de `em_tratativa`:
  1. Dispara nova consulta API (custo R$ 8,29)
  2. Gera novo PDF "Nome Limpo"
  3. Atualiza `pdf_url` do processo
  4. Move pra `aguardando_orgaos`
  5. Envia email pro cliente com prazo 3-5 dias úteis
  6. Audit log

### `/painel/blindagens`

Lista de assinaturas ativas.

**Funcionalidades:**
- 3 KPIs: Ativas / **MRR** (receita mensal recorrente) / Com alerta
- Tabela: Cliente + Status (`Ativa`/`Alerta`/`Cancelada`) + Plano + Valor + Última verif. + Próxima
- WhatsApp 1-click + Avatar gradient

### `/painel/clientes`

Tabela unificada (lnb_processos + dados consulta).

**Funcionalidades:**
- Tabs por etapa com contador (`Todos / Consulta paga / Limpeza paga / Em tratativa / Nome limpo / Perdido`)
- Filtros chips + search + select Serviço
- Tabela: nome + tag pill + etapa + score (colorido) + dívidas (alerta amber) + valor pago + PDF + avatar
- Click linha → drawer
- **2 botões export:** `Nome+CPF` (operacional pro time) + `Exportar` (completo)

### `/painel/leads`

Mesma estrutura da Clientes, mas usa `LNB - CRM` direto.

**Tabs:** Todos / Lead / Interessado / Agendado / Fechado / Perdido
**Colunas:** Nome + status pill + origem (Site/WhatsApp) + serviço + data + avatar

### `/painel/consultas`

Mesma estrutura.

**Tabs:** Todas / Não pagas / Com pendência / Nome limpo / Fechou limpeza
**Colunas:** Cliente + status + score colorido + dívidas + origem + PDF + data + avatar

### `/painel/financeiro`

Visão financeira com custos REAIS.

**Seções:**
- 4 KPIs: Receita / Custo provedores / Lucro operacional / Ticket médio (com ↑↓ trend)
- Card "Receita por produto" — dots coloridos (cyan Consulta / emerald Limpeza)
- Card "Composição do lucro" — Receita - Custo consultas - Custo verificações = Lucro
- Tabela "Saldo de provedores de consulta" — sem nome do provedor exposto

### `/painel/equipe`

Lista admins. Restrito a `role=owner|admin`.

### `/painel/configuracoes` (HUB)

4 cards:
1. **Produtos & Preços** → `/configuracoes/produtos`
2. **Etapas do Kanban** → `/configuracoes/etapas`
3. **Tags de Serviço** → `/configuracoes/tags`
4. **Sistema** → `/configuracoes/sistema`

Embaixo: Perfil + Trocar senha.

#### `/painel/configuracoes/produtos`

CRUD inline dos 5 produtos: editar `preco_real`, `preco_teste`, `desconto_consulta`, `custo_api`.

#### `/painel/configuracoes/etapas`

Lista única de etapas. Reordenar com ↑↓, criar nova, editar nome/emoji/cor/ativo.

#### `/painel/configuracoes/tags`

Lista de tags com vínculo ao produto.

#### `/painel/configuracoes/sistema` (read-only)

- 3 cards de status: Modo teste / Ambiente / Provedores
- Health checks (banco, webhook, provedor, modo teste)
- Contagem das tabelas
- Saldo do provedor (progress bar colorida)
- Links úteis (Site, Supabase, Vercel, Asaas, Chatwoot, GitHub)

---

## 8. Painel do cliente final

URL: `https://limpanomebrazil.com.br/conta`

### Auth

- Login com CPF + senha
- Senha gerada automaticamente pós-pagamento (`Lnb#XXXXX`) — enviada por WhatsApp e email
- Cliente pode trocar depois

### `/conta/dashboard`

**Header dark gradient** (estilo Healthink).

**Para cada processo ativo:**
- Tag pill (Consulta CPF, Limpeza, etc) + status (Em andamento / Concluído)
- Etapa atual em pill colorida
- Progress bar verde + % concluído + mini stepper das etapas
- Arquivos disponíveis (PDF assinado via signed URL)
- Timeline cronológica (8 últimos eventos)

**3 cards rápidos:**
1. Relatório CPF (link condicional)
2. Monitoramento (se blindagem ativa)
3. Suporte WhatsApp

**CTAs contextuais:**
- Sem consulta → bloco verde "Faça primeira consulta R$ 29,99"
- Tem pendência sem processo → bloco amber "Falar com consultor"
- Todos finalizados → bloco emerald "Processos concluídos"
- Nome limpo sem blindagem → **bloco roxo "Mantenha nome limpo R$ 29,90/mês"** ⭐

### `/conta/relatorio`

Mostra dados completos da consulta CPF: score Serasa + score Boa Vista + pendências + protestos + cheques. Link pro PDF.

### `/conta/pagamentos`

Histórico de pagamentos do cliente.

---

## 9. Site público

### `/` (home)

Landing page com proposta de valor.

### `/consultar`

Hub com 2 opções: CPF ou CNPJ.

### `/consultar/cpf`

Wizard 3 passos:
1. **Identificação** — CPF, nome, email, telefone, senha + aceite termos
2. **Pagamento** — Cobranca Asaas (Pix/Cartão/Boleto). Mostra R$ 29,99 (ou banner modo teste R$ 5)
3. **Resultado** — Polling até PDF ficar pronto

Bloqueio: cliente que já pagou consulta é redirecionado pra `/conta/relatorio` (não compra 2x).

### `/consultar/cnpj`

Mesmo wizard, mas com CNPJ + razão social + CPF responsável + nome responsável.

### `/contratar`

Página para contratar Limpeza (precisa consulta prévia paga).

**Plano CPF:**
- Limpeza completa em até 20 dias úteis
- **✅ Aumenta o seu score Serasa automaticamente** (copy nova)
- Você não precisa quitar a dívida
- Monitoramento 12 meses bônus
- Painel online
- Consultor dedicado
- Atualizações WhatsApp + email

**Plano CNPJ:** mesma estrutura, "Aumenta o score do sócio responsável".

### `/termos/*`

Modais com termos juridicamente válidos (LGPD, CDC, foro): `/consulta`, `/consulta-cnpj`, `/limpeza`, `/limpeza-cnpj`, `/privacidade`.

### Banner Modo Teste

Quando `LNB_MODO_TESTE=true` aparece banner amber em `/consultar/*` e `/contratar`:
> ⚠️ Modo de teste ativo — esta operação cobrará apenas R$ 5,00 em vez do valor exibido.

---

## 10. Fluxo de vendas end-to-end

### Caminho A — Site (origem=`site`)

```
Cliente abre /consultar/cpf
    ↓
Preenche CPF + dados + senha
    ↓
POST /api/site/checkout → cria cliente em lnb_cliente_auth + upsert LNB-CRM (origem=site) + cria cobrança Asaas
    ↓
Cliente paga via Asaas (Pix/Cartão/Boleto)
    ↓
Asaas envia webhook PAYMENT_RECEIVED → POST /api/site/asaas-webhook
    ↓
Webhook (com idempotência via lnb_webhook_processado):
    1. RPC webhook_registrar_consulta_paga
    2. RPC webhook_criar_processo_consulta → cria em lnb_processos (etapa=consulta_paga)
    3. Consulta API (Serasa Premium + Boa Vista) - custo R$ 8,29
    4. Gera PDF (pdfkit)
    5. Salva no Storage lnb-relatorios
    6. RPC lnb_processo_set_pdf_url (vincula PDF ao card)
    7. RPC lnb_gerar_senha_temporaria (cria senha do cliente)
    8. Envia email Resend com resumo + senha + link painel
    ↓
Cliente recebe email + acessa /conta/dashboard
    ↓
Vê processo "Consulta paga" no Kanban
    ↓
Cliente paga Limpeza → ... → entra em "Limpeza paga" automaticamente
```

### Caminho B — WhatsApp (origem=`whatsapp`)

```
Cliente manda mensagem no WhatsApp LNB
    ↓
Chatwoot recebe → webhook → n8n Multi Agentes LNB v10
    ↓
n8n: AI Agent1 (Orquestrador) → AI Agent (Maia atende cliente)
    ↓
Maia coleta dados → chama POST /api/n8n/criar-checkout
    ↓
Cliente recebe link Asaas via WhatsApp
    ↓
Cliente paga → mesmo webhook /api/site/asaas-webhook
    ↓
Identifica origem=whatsapp → entrega via Chatwoot:
    - aplicarLabelsLnb (pago_consulta)
    - registrarConsultaNoCard (custom attribute)
    - enviarTextoChatwoot (resumo + senha + link painel)
    - PDF anexo na conversa
```

### Estados no Kanban

```
Funil PRÉ:
  lead → interessado → qualificado → consulta_paga → limpeza_paga
                                                       ↓
Funil PÓS:                                  em_tratativa → aguardando_orgaos → nome_limpo
                                                                                  ↓
                                                                          (oferta blindagem)
                                                                                  ↓
                                                                          blindagem_ativa
```

---

## 11. Operação da limpeza

### Time recebe processo em `limpeza_paga`

1. Move pra `em_tratativa` manualmente
2. Trata junto aos órgãos (atuação jurídica — fora do sistema)
3. Quando concluir, clica **"Finalizar Limpeza"** no card

### Botão "Finalizar Limpeza" — fluxo automático

```
Click → POST /api/admin/processos/finalizar-limpeza { processo_id }
    ↓
1. Dispara nova consulta API (custo R$ 8,29 - Serasa Premium)
2. Gera novo PDF "Nome Limpo" (template gerar-relatorio.ts)
3. Salva no Storage
4. RPC lnb_processo_mover_etapa → aguardando_orgaos
5. UPDATE lnb_processos.pdf_url = nova URL
6. Email pro cliente:
   - Subject: "✨ Limpamos seu nome! Aguarde a atualização"
   - Texto: "Prazo 3-5 dias úteis pra constar no Serasa Experian"
   - Anexa novo PDF
7. lnb_audit_log gravado
```

### Confirmação final

Após ~5 dias úteis, admin pode mover manualmente de `aguardando_orgaos` → `nome_limpo`. Sistema vai oferecer blindagem ao cliente.

---

## 12. Blindagem (assinatura mensal)

### Oferta automática

- Cliente com processo em etapa `nome_limpo` E sem blindagem ativa
- Vê banner roxo no `/conta/dashboard` ofertando R$ 29,90/mês
- CTA leva ao WhatsApp pra contratação (ou direto via API)

### Contratação

```
POST /api/site/contratar-blindagem { cpf, nome, email, telefone }
    ↓
1. Valida CPF, dados básicos
2. Verifica que não tem assinatura ativa
3. Asaas: findOrCreateCustomer
4. Asaas: createSubscription (cycle=MONTHLY, value=R$29,90, billingType=UNDEFINED)
5. Upsert em LNB_Blindagem:
   - asaas_subscription_id
   - ativo=true
   - proxima_verificacao = +30 dias
6. Retorna invoice_url da primeira parcela
```

### Cron mensal (já existe)

`vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/blindagem-diaria",
      "schedule": "0 9 * * *"
    }
  ]
}
```

Roda diariamente às 9h BRT. Para cada blindagem ativa com `proxima_verificacao <= NOW()`:
1. Chama API Serasa Premium (custo R$ 5,80)
2. Detecta nova pendência (`!tem_pendencia_atual && parsed.tem_pendencia`)
3. Se nova pendência: envia alerta por email/WhatsApp
4. Atualiza `proxima_verificacao = +30 dias`

---

## 13. Endpoints da API

### `/api/site/*` (público, validado por HMAC quando aplicável)

| Endpoint | Método | Função |
|---|---|---|
| `/checkout` | POST | Cria cliente + cobrança Asaas (consulta/limpeza CPF/CNPJ) |
| `/asaas-webhook` | POST | Recebe Asaas, idempotência, processa pagamento |
| `/consulta-status/[cpf]` | GET | Polling do status da consulta |
| `/elegibilidade-limpeza` | GET | Valida se cliente pode contratar limpeza |
| `/contratar-blindagem` | POST | Cria assinatura mensal Asaas |
| `/aceite-termos` | POST | Registra aceite de termos |
| `/modo-teste` | GET | Retorna `{ modo_teste: boolean }` |

### `/api/n8n/*` (Bearer auth `N8N_SHARED_TOKEN`)

Endpoints chamados pelo n8n / agente Maia:

| Endpoint | Função |
|---|---|
| `/criar-checkout` | Gera link de pagamento Asaas |
| `/lead-status` | Move stage no funil + atualiza CRM + Chatwoot Kanban |
| `/aplicar-label` | Aplica labels Chatwoot + grava labels_aplicadas[] |
| `/blindagem-cadastro` | Cadastra blindagem inicial (sem Asaas) |
| `/memory-long` | Memória longa do agente (CRM.memoria_longa + custom attr) |
| `/status-processo` | Read-only do status (consulta/limpeza/blindagem) |
| `/sync-conversation` | Log de cada msg em audit |
| `/pause-ia` · `/start-ia` · `/check-ia-pause` | Pausa/reativa Maia em conversa |
| `/criar-acesso-cliente` | Gera senha temporária |
| `/calcular-valor-limpeza` | Maia consulta antes de oferecer limpeza |

### `/api/admin/*` (requer `requireAdmin`)

| Endpoint | Função |
|---|---|
| `/produtos` | GET, PATCH — CRUD produtos |
| `/etapas` | GET, PATCH, PUT (reorder) — CRUD etapas |
| `/tags` | GET, PATCH, PUT (reorder) — CRUD tags |
| `/clientes/exportar` | GET — CSV (`formato=completo`\|`operacional`) |
| `/processos/[id]` | GET — Detalhe pro drawer |
| `/processos/criar` | POST — Criação manual |
| `/processos/mover-etapa` | POST — Move etapa |
| `/processos/mensagem` | POST — Adiciona mensagem |
| `/processos/finalizar-limpeza` | POST — **Dispara nova consulta + PDF + email** |
| `/processos/upload` · `/processos/arquivo-url` | Upload e download de arquivos |
| `/leads` | Operações de CRM |
| `/blindagem` | Operações de blindagem |
| `/users` | CRUD admins |
| `/me/senha` | Trocar senha admin |
| `/gerar-pdf` · `/regerar-pdf` · `/reprocessar-consulta` · `/teste-pdf` | Ferramentas |

### `/api/cliente/*` (cookie `lnb_session`)

| Endpoint | Função |
|---|---|
| `/cadastro` | POST — Registro |
| `/login` | POST — Login |
| `/logout` | POST — Logout |
| `/me` | GET — Sessão atual |
| `/arquivo-url/[id]` | GET — Signed URL de arquivo |

### `/api/cron/*` (header `Authorization: Bearer CRON_SECRET`)

| Endpoint | Schedule | Função |
|---|---|---|
| `/blindagem-diaria` | `0 9 * * *` (9h BRT diário) | Verifica todas blindagens ativas com `proxima_verificacao <= hoje` |

---

## 14. Integrações externas

### Asaas (pagamento)

- **Base URL**: `https://api.asaas.com/v3` (prod) ou `https://api-sandbox.asaas.com/v3`
- **Auth**: header `access_token: $aact_XXX`
- **Recursos usados:**
  - `POST /customers` — Find or create customer
  - `POST /payments` — Cobrança avulsa (consultas/limpezas)
  - `POST /subscriptions` — Assinatura mensal (blindagem)
  - Webhook: `PAYMENT_CONFIRMED` + `PAYMENT_RECEIVED`
- **Idempotência**: tabela `lnb_webhook_processado` bloqueia processamento duplo

### Chatwoot (WhatsApp)

- **URL**: `https://chat.dosedegrowth.pro`
- **Account**: 11
- **Inbox**: 12 (LNB WhatsApp)
- **Funil**: ID 1 ("Limpeza de Nome") com 5 stages: `lead`, `interessado`, `qualificado`, `fechado`, `perdido`
- **16 labels** padronizadas (serviço, pagamento, resultado, operacional)
- **Endpoints usados**: messages, custom_attributes, labels, funnel_mappings/move_stage, attachments

### n8n (workflow WhatsApp)

- **Workflow**: `Multi Agentes LNB v10` (195 nós · 7 webhooks · 10 tools LNB)
- **Pipeline DUAL AI Agent**: AI Agent1 (Orquestrador interno) → AI Agent (Maia atende cliente)
- **Webhook5 path**: `6ef87fae-3202-4562-abe3-f1386d6d2bc5` (NUNCA mudar)
- **Memory**: Redis (sessionKey = telefone)
- **LLM**: Google Gemini (credencial `LNB Limpa Nome`)

### Provedor de consulta de CPF/CNPJ

- Multi-bureau (Serasa Premium + Boa Vista + CNPJ Receita)
- **Custos** detalhados na seção 3
- Idempotência implementada para evitar cobrança dupla

### Resend (email transacional)

- **Domínio verificado**: limpanomebrazil.com.br
- **From**: definido em `RESEND_FROM`
- Template HTML em `src/lib/email.ts` com `renderEmailHTML({ titulo, corpo, ctaUrl, ctaTexto })`

### Google Gemini

- Credencial separada `LNB Limpa Nome` (id `YMZPVHkbJQW9giMq`)
- Modelo: Gemini Pro / Gemini Flash
- Usado pelo agente Maia no n8n

---

## 15. Regras de negócio

### Pagamento

1. **Idempotência obrigatória**: Asaas envia `PAYMENT_CONFIRMED` + `PAYMENT_RECEIVED` para cada pagamento. RPC `lnb_webhook_tentar_processar` bloqueia processamento duplicado por `payment_id`.

2. **CPF não paga 2x consulta**: Bloqueio em `/api/site/checkout` via RPC `lnb_consulta_cpf_ja_paga`.

3. **CNPJ não paga 2x consulta**: Idem via `lnb_consulta_cnpj_ja_paga`.

### Limpeza

4. **Limpeza só após consulta paga COM pendência**: RPC `cliente_pode_contratar_limpeza(cpf)` retorna `{pode, motivo, mensagem}`. Bloqueio em ambos checkouts.

5. **Desconto de 15 dias**: A partir do `created_at` da consulta paga, cliente ganha desconto = preço da consulta na limpeza. Aplicado automaticamente no checkout.

6. **Limpeza CNPJ**: Pré-requisito é consulta CNPJ paga com pendência no sócio responsável.

### Operação

7. **"Finalizar Limpeza" dispara consulta REAL**: cada clique custa R$ 8,29 (uma nova consulta API pra confirmar limpeza nos órgãos).

8. **Prazo Serasa Experian**: aviso obrigatório no email pós-finalização — "pode levar 3-5 dias úteis para constar no app gratuito".

9. **Blindagem mensal**: cron diário às 9h BRT processa apenas quem tem `proxima_verificacao <= NOW()`. Cada verificação custa R$ 5,80.

10. **Detecção de nova pendência**: `!tem_pendencia_atual && parsed.tem_pendencia` → dispara alerta pro cliente.

### CRM

11. **Origem do lead** (`site` / `whatsapp` / `admin`): determina canal de notificação. Site = email. WhatsApp = Chatwoot + email. Admin = manual.

12. **labels_aplicadas[]**: array no CRM espelha as labels Chatwoot pra histórico.

13. **IA pausada**: campo `ia_pausada` no CRM bloqueia Maia de responder. Cron n8n verifica antes de chamar.

### Webhook

14. **Webhook path n8n5**: `6ef87fae-3202-4562-abe3-f1386d6d2bc5` é IMUTÁVEL (Chatwoot já aponta pra ele).

15. **Versionamento n8n**: sempre criar versão NOVA (v10 → v11). Nunca editar in-place. Renomear antiga para `_DEPRECATED`.

---

## 16. Modo teste

### Ativação

- Env Vercel: `LNB_MODO_TESTE=true`
- Effect: todos os checkouts cobram **R$ 5,00** (mínimo do Asaas)
- Endpoint `/api/site/modo-teste` retorna `{ modo_teste: true }`
- Banner amber aparece no site (`/consultar/*` e `/contratar`)
- Cards do painel `/dashboard` mostram badge "Modo teste"

### Comportamento

- Site mostra R$ 29,99 mas cobra R$ 5,00 (Asaas exige mínimo 5)
- Função `getValor(codigo)` retorna `preco_teste` em vez de `preco_real`
- Função `lnb_calcular_valor_limpeza` retorna R$ 5 (skip desconto)
- RPCs `lnb_get_preco` e `lnb_get_precos_map` aceitam `p_modo_teste: boolean`

### Como desligar

- Remover env `LNB_MODO_TESTE` no Vercel
- Forçar redeploy

### Alerta automático

- Página `/painel/configuracoes/sistema` mostra warning se ativo
- Health check: "Modo teste" aparece com ❌ se ativo em produção

---

## 17. Design system

### Tokens centrais

- **Bg página**: `bg-[#e4e5e7]` (cinza marcado)
- **Wrapper macro**: `bg-white rounded-2xl shadow-[0_4px_24px_rgba(16,24,40,0.08)]` envolvendo sidebar + main
- **Card**: `bg-white border border-gray-100/80 shadow-[0_1px_3px_rgba(16,24,40,0.06),0_2px_8px_rgba(16,24,40,0.04)]`
- **Conteúdo**: `bg-[#fafbfc]` no main
- **Primary button**: `bg-gray-900` (dark) — Beyond/Plan style
- **Success button**: `bg-emerald-600`
- **Outline**: `border-gray-200 bg-white text-gray-700`
- **Tipografia título**: `font-display text-2xl/3xl tracking-tight text-gray-900`
- **Tipografia label**: `text-xs text-gray-500 font-medium`
- **Tabular-nums** em todos valores numéricos

### Cores

- `brand` (cyan) → Consulta CPF / Pago
- `violet` → Consulta CNPJ / Qualificado
- `emerald` → Limpeza CPF / Nome limpo / Success
- `forest` (teal) → Limpeza CNPJ / Blindagem ativa
- `amber` → Interessado / Em tratativa / Warning
- `rose/red` → Perdido / Danger
- `gray` → Lead / Encerrada / Neutro

### Componentes reusáveis (`src/components/ui/data-table-bits.tsx`)

- **TabsCounter** — Tabs com counter inline + underline verde na ativa
- **FilterChips** — Chips removíveis com X
- **PriorityPill** — Pill com dot colorido (low/med/high/success/danger)
- **ProgressCircle** — SVG circle 12/14
- **AvatarCircle** — Avatar com gradient determinístico por nome (hash)
- **TableToolbar** — Container search + chips + botões

### Componentes globais

- **Card** (`src/components/ui/card.tsx`) — rounded-xl + shadow sutil
- **Button** — variants: primary (dark), forest, outline, ghost, danger, success, link
- **Sheet** (`src/components/ui/sheet.tsx`) — Drawer com framer-motion + ESC + scroll lock
- **ProcessoDrawer** — Drawer estilo Plan com avatar gradient + grid 2x2 + progress + activities
- **Sidebar** (estilo Donezo) — brand box + sections + user card
- **Topbar** — search central com ⌘F + bell + avatar info

---

## 18. Manutenção e personalização

### Mudar preço de um produto

**Pelo painel** (~30s, sem deploy):
1. `/painel/configuracoes/produtos`
2. Editar `preco_real` na linha do produto
3. Salvar
4. Effect em até 60s (cache helper)

### Adicionar etapa nova no Kanban

1. `/painel/configuracoes/etapas`
2. Clicar "+ Adicionar"
3. Informar codigo (slug), nome, emoji, cor, funil (pre/pos), ativo=true
4. Salvar — aparece automaticamente nos Kanbans

### Reordenar etapas

`/painel/configuracoes/etapas` → drag-and-drop ou setas ↑↓

### Criar nova tag

`/painel/configuracoes/tags` → "+ Adicionar" → vincular ao produto

### Ligar modo teste

1. Vercel → Project Settings → Environment Variables
2. Add: `LNB_MODO_TESTE` = `true` (production)
3. Redeploy
4. Banner aparece no site automaticamente

### Apagar dados de teste

Via Supabase Studio (SQL Editor):
```sql
-- Apaga lead específico (substituir CPF)
DELETE FROM lnb_processo_arquivos WHERE processo_id IN (SELECT id FROM lnb_processos WHERE cpf = 'XXX');
DELETE FROM lnb_processo_eventos WHERE processo_id IN (SELECT id FROM lnb_processos WHERE cpf = 'XXX');
DELETE FROM lnb_processos WHERE cpf = 'XXX';
DELETE FROM "LNB - CRM" WHERE "CPF" = 'XXX';
DELETE FROM "LNB_Consultas" WHERE cpf = 'XXX';
DELETE FROM lnb_cliente_auth WHERE cpf = 'XXX';
DELETE FROM lnb_webhook_processado WHERE cpf = 'XXX';
```

PDF do storage:
```sql
SET LOCAL storage.allow_delete_query = 'true';
DELETE FROM storage.objects WHERE name LIKE '%XXX%';
```

### Adicionar produto novo

Mais complexo — requer migração:
1. INSERT em `lnb_produtos` (codigo, nome, preco_real, etc)
2. Adicionar tipo em `TipoCobranca` em `/api/site/checkout` e `/api/n8n/criar-checkout`
3. Adicionar tag correspondente em `/painel/configuracoes/tags`
4. Atualizar PLANOS em `/src/lib/planos.ts`
5. Adicionar opção no /contratar

### Reset visual do painel

Tokens em:
- `src/app/painel/(logged)/layout.tsx` (bg geral)
- `src/components/ui/card.tsx` (shadow/border padrão)
- `src/components/ui/button.tsx` (variants)
- `src/components/admin/sidebar.tsx` (cores active)

---

## 19. Deploy e ambiente

### Envs obrigatórias (Vercel)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://hkjukobqpjezhpxzplpj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Asaas
ASAAS_API_KEY=$aact_XXX
ASAAS_ENV=production
ASAAS_WEBHOOK_TOKEN=XXX

# Provedor de consulta
API_FULL_TOKEN=XXX

# Resend
RESEND_API_KEY=re_XXX
RESEND_FROM="LNB <no-reply@limpanomebrazil.com.br>"

# Chatwoot
CHATWOOT_URL=https://chat.dosedegrowth.pro
CHATWOOT_TOKEN=XXX
CHATWOOT_ADMIN_TOKEN=XXX
CHATWOOT_ACCOUNT_ID=11
CHATWOOT_INBOX_ID=12

# n8n
N8N_SHARED_TOKEN=XXX

# Cron
CRON_SECRET=XXX

# App
NEXT_PUBLIC_SITE_URL=https://limpanomebrazil.com.br

# Modo teste (opcional)
LNB_MODO_TESTE=true     # se setado, cobra R$ 5
```

### Deploy

- Push pra `main` → Vercel deploy automático (2-3 min)
- Migrations Supabase → aplicar via `mcp__supabase__apply_migration` ou Supabase Studio
- Cron Vercel: já configurado em `vercel.json`

### Backups

- Supabase: backup automático diário (incluído no plano Pro)
- Storage: replicação automática

---

## 20. Pendências e roadmap

### Em standby

- **FASE G** — Build `Multi Agentes LNB v30.json` (n8n) com pitch estruturado da Maia (5 mensagens pós-resumo da consulta + branches: "quero entender", "tá caro", "vou pensar"). Lucas pausou para manter v10 atual rodando.

### Nice-to-have

- Drag-and-drop real no Kanban (hoje move via dropdown no drawer)
- Auto-mover de `aguardando_orgaos` → `nome_limpo` após 5 dias úteis (cron)
- Página `/painel/equipe` com criar admin pelo email+senha (hoje precisa UUID manual)
- Página `/painel/blindagens` ganhar ações: pausar/cancelar assinatura
- Migrations gerenciáveis: `lnb_settings` (key-value) pra modo teste via UI em vez de env
- Dashboard cliente: histórico de pagamentos detalhado
- Site: blog/SEO

### Próximas decisões necessárias

- Estratégia de upsell pós-limpeza (blindagem) — automatizar email/WhatsApp ofertando?
- Política de churn: cliente cancela blindagem como?
- LP do site: redesign visual (atual ok, mas pode evoluir)

---

## 📞 Contatos importantes

- **Dev**: Lucas Cassiano (lucas@dosedegrowth.com.br)
- **Empresa**: Dose de Growth (DDG)
- **Suporte cliente final**: WhatsApp +55 11 99744-0101

---

**Última atualização**: 15/mai/2026 · Documento mantido por Claude (assistente AI da DDG).

> **Importante**: este documento reflete o estado **atual** do projeto. Mudanças relevantes (preços, regras, integrações) devem ser refletidas aqui imediatamente para manter rastreabilidade.
