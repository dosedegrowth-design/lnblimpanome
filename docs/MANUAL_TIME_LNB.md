# 📋 Manual do Time · Limpa Nome Brazil (LNB)

> **Guia operacional do dia-a-dia.** Linguagem direta, voltada para quem opera o painel. Cobre regras, custos, fluxos e o que cada página faz. Última atualização: 15/mai/2026.

---

## 🎯 Antes de começar — entenda o básico

### O que vendemos

| # | Produto | Preço | Pra quê serve |
|---|---|---|---|
| 1 | **Consulta CPF** | R$ 29,99 | Cliente paga e descobre se tem dívida no nome. Resultado em minutos com score + lista de credores. |
| 2 | **Consulta CNPJ** | R$ 39,99 | Mesma coisa, mas pra empresa. Inclui dados Receita + análise do sócio responsável. |
| 3 | **Limpeza de Nome (CPF)** | R$ 500,00 | Atuação jurídica nos órgãos pra remover restrições. Cliente **NÃO paga a dívida**. Prazo: 20 dias úteis. |
| 4 | **Limpeza de Nome (CNPJ + Sócio)** | R$ 580,01 | Limpeza pra empresa + sócio responsável. |
| 5 | **Blindagem mensal** | R$ 29,90/mês | Monitora score do cliente todo mês. Manda alerta se aparecer nova pendência. |

### Quem pode fazer cada coisa

- **Cliente compra Limpeza?** → SÓ se já tiver pago Consulta E ter pendência no nome
- **Cliente compra Blindagem?** → SIM, sempre. Oferecida automaticamente após "Nome limpo"
- **Cliente paga Consulta 2x?** → BLOQUEADO pelo sistema (não consegue)

### Onde tudo acontece

| Lugar | Pra quem | URL |
|---|---|---|
| 🛒 **Site público** | Cliente novo (lead) | limpanomebrazil.com.br |
| 💬 **WhatsApp + Maia** | Cliente novo via WhatsApp | (n8n + Chatwoot) |
| 🎛️ **Painel Admin** | Você e o time | limpanomebrazil.com.br/painel |
| 👤 **Painel Cliente** | Cliente final acompanhar | limpanomebrazil.com.br/conta |

---

## 💰 Custos e margens (saber antes de operar)

**Toda chamada à API de consulta custa dinheiro.** Resumo:

| Operação | Custo | Quando acontece |
|---|---|---|
| Consulta CPF nova | **R$ 8,29** | Cliente paga consulta CPF |
| Consulta CNPJ nova | **R$ 8,33** | Cliente paga consulta CNPJ |
| Botão "Finalizar Limpeza" | **R$ 8,29** | Time clica pra confirmar nome limpo |
| Verificação mensal Blindagem | **R$ 5,80** | Cron diário das 9h roda automático |

**Margem média por venda:**
- Consulta CPF: **72%** (R$ 21,70 de lucro)
- Consulta CNPJ: **79%** (R$ 31,66 de lucro)
- Limpeza CPF: **98%** (R$ 491,71 de lucro)
- Limpeza CNPJ: **98%** (R$ 571,68 de lucro)
- Blindagem: **80%** (R$ 24,10 de lucro/mês)

**REGRA DE OURO**: nunca dispare consulta sem o cliente ter pago. Sistema bloqueia isso, mas atenção em ações manuais.

---

## 🗺️ Estrutura do Painel Admin

```
SIDEBAR ESQUERDA
├── MENU
│   ├── Dashboard          ← visão geral
│   ├── Processos          ← Kanban completo (jornada inteira)
│   ├── Limpeza            ← vista do time operacional (após pagamento)
│   ├── Blindagens         ← assinaturas mensais ativas
│   ├── Clientes           ← tabela com todos
│   └── Leads              ← CRM (quem ainda não comprou)
├── ANÁLISE
│   ├── Consultas          ← histórico de consultas executadas
│   └── Financeiro         ← receita, custos, margem
└── GERAL
    ├── Equipe             ← usuários do painel
    └── Configurações      ← Produtos · Etapas · Tags · Sistema
```

---

# 📄 Páginas do Painel Admin

## 🏠 `/painel/dashboard` — Visão geral

### O que é
Tela inicial do painel. Resumo executivo do que está acontecendo.

### Quem usa
Todo mundo (admins, gerentes, time operacional).

### O que mostra
- **Receita total** (card verde destacado)
- **Conversão** (% de quem fechou limpeza após consulta)
- **Processos ativos**
- **Dívidas identificadas** (soma das pendências dos clientes)
- **Vendas semana** (gráfico de barras coloridas)
- **Receita 7 dias**
- **Distribuição por serviço** (qual produto vende mais)
- **Funil de vendas**
- **Últimos pagamentos** (5 mais recentes)
- **Taxa de conversão** (donut chart)
- **Status da operação** (em tratativa / aguardando / nome limpo)
- **Alerta automático** se tiver processo parado há 5+ dias

### Regras
- Números são **acumulados desde o início** (não filtra período ainda — feature futura)
- Modo teste ativo? Aparece banner amarelo no topo
- Conversão = `limpezas pagas / consultas pagas`

### O que pode fazer
- Clicar em "Ver Kanban" → vai pra Processos
- Clicar em "Limpeza" → vai pra vista operacional
- Click em qualquer link verde → atalho pra página relacionada

### Atenção
- **Receita total NÃO desconta taxa do Asaas** (~3% Pix, ~5% cartão)
- Use Financeiro para análise de lucro líquido

---

## 📋 `/painel/processos` — Kanban completo

### O que é
A jornada COMPLETA do cliente em formato Kanban. Cada cliente vira 1 card que vai avançando entre etapas.

### Quem usa
- **Time comercial** olha o funil PRÉ-pagamento
- **Time operacional** olha o funil PÓS-pagamento (mas usa mais a página `/painel/limpeza`)

### Como funciona — 2 funis em tabs

**Funil PRÉ-pagamento** (até cliente pagar)
| Etapa | Quando o cliente está aqui |
|---|---|
| Lead | Acabou de entrar (primeira interação) |
| Interessado | Mostrou interesse em consulta |
| Qualificado | Recebeu link de pagamento |
| Consulta paga | Pagou consulta, recebeu relatório |
| Limpeza paga | Pagou limpeza, vai pro time tratar |
| Perdido | Desistiu antes de pagar |

**Funil PÓS-pagamento** (depois que pagou a limpeza)
| Etapa | Quando o cliente está aqui |
|---|---|
| Em tratativa | Time iniciou processo junto aos órgãos |
| Aguardando órgãos | Time finalizou, esperando Serasa atualizar (3-5 dias úteis) |
| Nome limpo | Confirmado 100% limpo |
| Blindagem ativa | Migrou pra serviço mensal |
| Encerrada | Cancelou ou desistiu |

### O que cada card mostra
- **Tag** colorida (Consulta CPF, Consulta CNPJ, Limpeza CPF, Limpeza CNPJ, Blindagem)
- **Nome** do cliente
- **Avatar** com gradient único (gerado pelo nome)
- **Score** (verde 701+, amber 501+, vermelho <500)
- **⚠️ Alerta** se tem pendência (com quantidade)
- **Ícones** ao rodapé: 📞 WhatsApp · 📄 PDF disponível
- **Valor pago** em verde

### O que pode fazer
- **Click no card** → abre **Drawer lateral** com todos os detalhes
- **Filtros** chips removíveis (por serviço)
- **Busca** por nome, CPF, email, telefone

### No Drawer lateral
- Botões rápidos: WhatsApp, Email, Telefone
- Grid 2x2: CPF, Telefone, Origem, Valor pago
- Progress bar do processo
- Etapa atual + botão "Avançar para [próxima]"
- Botão "Finalizar Limpeza" (se em tratativa)
- Score + Pendências
- Status da consulta + link PDF
- Histórico de atividades
- Observações
- Botão "Ver detalhe completo" → página full do processo

### Regras
- Card aparece aqui **automaticamente** quando cliente paga (webhook)
- Não tem drag-and-drop ainda — mover etapa pelo dropdown no drawer
- **Backfill aplicado**: clientes antigos que pagaram já estão no Kanban

---

## 🧹 `/painel/limpeza` — Vista do time operacional

### O que é
Tela específica pro **time que limpa nome**. Mostra apenas processos que pagaram limpeza e precisam de ação.

### Quem usa
Time operacional (quem trata com os órgãos).

### O que mostra
Apenas processos nas etapas: `Limpeza paga`, `Em tratativa`, `Aguardando órgãos`, `Nome limpo`

Layout estilo Kanban com 4 colunas, cards mais detalhados.

### Fluxo do time operacional

```
1. Cliente paga limpeza → entra em "Limpeza paga"
   ↓
2. Time pega o caso e move pra "Em tratativa"
   ↓
3. Time trata com os órgãos (atuação jurídica - fora do sistema)
   ↓
4. Concluído? Clica em "FINALIZAR LIMPEZA" no card
   ↓
5. Sistema automaticamente:
   - Dispara nova consulta (custo R$ 8,29)
   - Gera novo PDF "Nome Limpo"
   - Move card pra "Aguardando órgãos"
   - Manda email pro cliente: "Limpamos! Pode demorar 3-5 dias úteis pra constar no Serasa Experian"
   ↓
6. Após 3-5 dias úteis: time confirma e move manualmente pra "Nome limpo"
   ↓
7. Sistema oferece BLINDAGEM automaticamente pro cliente
```

### ⚠️ Botão "Finalizar Limpeza" — REGRA CRÍTICA

- **Cada clique custa R$ 8,29** (uma consulta nova)
- Use **APENAS** quando tiver certeza que o processo terminou junto aos órgãos
- Confirmação dupla aparece antes de disparar
- Após clicar:
  - PDF antigo é substituído pelo novo
  - Cliente recebe email automático com aviso de prazo
  - Card pula pra "Aguardando órgãos" (não vai direto pra "Nome limpo")

### O que pode fazer
- Click no card → drawer com tudo
- Botão "Finalizar Limpeza" inline (só em cards de "Em tratativa")
- Mover etapa pelo drawer

---

## 🛡️ `/painel/blindagens` — Assinaturas mensais

### O que é
Lista de clientes que assinaram **Blindagem** (R$ 29,90/mês).

### Quem usa
Gerente comercial / financeiro.

### O que mostra
- **3 KPIs**: Assinaturas ativas · MRR (Receita Mensal Recorrente) · Com alerta
- **Tabela**: Cliente · Status · Plano · Valor · Última verificação · Próxima verificação

### Como a blindagem funciona

```
Cliente contrata Blindagem
   ↓
Asaas cria SUBSCRIPTION (cobrança automática mensal)
   ↓
Sistema cadastra em LNB_Blindagem (proxima_verificacao = +30 dias)
   ↓
TODO DIA às 9h da manhã (BRT):
   Cron pega todas com proxima_verificacao <= hoje
   ↓
Para cada cliente:
   1. Faz consulta Serasa Premium (custo R$ 5,80)
   2. Detecta nova pendência?
      → SIM: manda alerta pro cliente (email/WhatsApp)
      → NÃO: status segue OK
   3. proxima_verificacao = +30 dias
```

### Estados
- 🟢 **Ativa** — assinatura paga, sem alerta
- 🟠 **Alerta** — apareceu pendência nova!
- ⚫ **Cancelada** — cliente cancelou

### Custos
- **Receita mensal**: R$ 29,90 × ativas
- **Custo mensal**: R$ 5,80 × ativas (1 consulta por mês cada)
- **Margem**: ~80%

### O que pode fazer
- Ver lista de ativas
- Click WhatsApp pra falar com cliente
- (Em breve: pausar/cancelar assinatura)

---

## 👥 `/painel/clientes` — Base completa

### O que é
Tabela única com **todos os clientes do sistema** (que entraram em qualquer processo).

### Quem usa
Time comercial pra prospectar, time financeiro pra análise, gerente pra visão geral.

### O que mostra
Tabs por etapa: Todos / Consulta paga / Limpeza paga / Em tratativa / Nome limpo / Perdido

Para cada cliente:
- Nome + CPF
- Serviço (tag colorida)
- Etapa atual (pill com bolinha)
- Score (colorido por faixa)
- Dívidas identificadas (alerta amber)
- Valor pago (verde)
- PDF inline (clica e baixa)
- Data criação

### O que pode fazer
- **Filtros**: chip de serviço, busca por nome/CPF/email/tel
- Click linha → drawer detalhado
- **2 botões de export ⭐**:
  - "Nome + CPF" → CSV simples (passar pro time externo)
  - "Exportar" → CSV completo (todas colunas)
- WhatsApp 1-click

### Regras
- Mostra TODOS, mesmo perdidos
- Cliente que paga consulta + limpeza = 1 linha só (não duplica)

---

## 📞 `/painel/leads` — CRM (quem ainda não comprou)

### O que é
Tabela dos leads. Quem demonstrou interesse mas ainda não fechou.

### Quem usa
Time comercial.

### O que mostra
Tabs: Todos / Lead / Interessado / Agendado / Fechado / Perdido

Colunas: Nome + Status + Origem (Site / WhatsApp) + Serviço + Data + Avatar

### Regras
- Origem **Site** → cliente preencheu formulário em `/consultar`
- Origem **WhatsApp** → veio pelo agente Maia
- Origem **Admin** → time cadastrou manualmente

### O que pode fazer
- Filtrar por status, origem
- Buscar por nome/CPF/email/tel
- Click → drawer
- WhatsApp 1-click

---

## 🔍 `/painel/consultas` — Histórico

### O que é
Histórico de **TODAS as consultas executadas**, mesmo as não pagas (raros casos).

### Quem usa
Suporte (verificar pedido de cliente), financeiro (auditoria de custos).

### O que mostra
Tabs: Todas / Não pagas / Com pendência / Nome limpo / Fechou limpeza

Colunas: Cliente + Status + Score + Dívidas + Origem + PDF + Data

### Regras
- 1 linha por consulta executada
- Custo: cada linha "Com pendência" ou "Nome limpo" custou R$ 8,29 (CPF) ou R$ 8,33 (CNPJ)
- PDFs ficam armazenados permanentemente

---

## 💼 `/painel/financeiro` — Receita e custos

### O que é
Análise financeira da operação.

### Quem usa
Gerente / sócio.

### O que mostra

**4 KPIs no topo:**
- Receita total
- Custo dos provedores (TODAS as chamadas API)
- Lucro operacional
- Ticket médio

**Card "Receita por produto"**: quanto cada produto trouxe

**Card "Composição do lucro"**:
```
Receita bruta             R$ X
(-) Custo consultas       -R$ A
↳ Verificações de limpeza -R$ B
─────────────────────────
Lucro operacional         R$ Y
Margem                    Z%
```

**Tabela "Saldo de provedores de consulta"**: uso vs limite mensal

### Regras
- Custo = (qtd consultas executadas × R$ 8,29) + (qtd "Finalizar Limpeza" × R$ 8,29)
- **Não inclui** taxa do Asaas (pode descontar manual: ~2% Pix, ~5% cartão)
- Modo teste: cobra R$ 5 mas custo continua R$ 8,29 → fica negativo (normal em teste)

### Atenção
- "Provedor de consulta" é genérico — não expõe nome do fornecedor
- Saldo mensal precisa ser **acompanhado**: se acabar, consultas param

---

## 👨‍💼 `/painel/equipe` — Usuários do painel

### O que é
Lista quem tem acesso ao painel admin.

### Quem usa
Apenas `owner` ou `admin`.

### Roles
- **Owner** — acesso total + pode gerenciar usuários
- **Admin** — acesso total exceto algumas configs sensíveis
- **Consultor** — acesso operacional limitado
- **Viewer** — só leitura

### Regras
- Adicionar usuário hoje: criar no Supabase Auth + cadastrar UUID aqui
- (Em breve: criar usuário pelo email+senha direto)
- Soft delete: marca `ativo=false` (não apaga registro)

---

## ⚙️ `/painel/configuracoes` — HUB de configurações

### O que é
Centro de gerenciamento do produto. Tudo que é editável fica aqui.

4 sub-páginas + Perfil/Senha:

### `/configuracoes/produtos` — Editar preços
- Edita os 5 produtos: preço real, preço teste, desconto consulta, custo provedor
- Mudança vale em até 60s (cache)
- **REGRA**: editar preço aqui afeta NOVOS checkouts. Cobranças já feitas mantém valor antigo.
- **Atenção**: JSON-LD do SEO do site usa preço hardcoded em `layout.tsx` — precisa redeploy pra atualizar

### `/configuracoes/etapas` — Etapas do Kanban
- Lista única de etapas (11 atuais em 2 funis)
- Reordenar com ↑↓
- Criar/editar: nome, emoji, cor, ativo
- **REGRA**: não dá pra deletar etapa que tem processo ativo

### `/configuracoes/tags` — Tags de serviço
- 5 tags atuais
- Cada tag vincula a 1 produto
- Cor + emoji editáveis
- Reordenar

### `/configuracoes/sistema` — Status do ambiente
**SOMENTE LEITURA**. Mostra:
- Modo teste (ativo/inativo)
- Versão do app
- Saldo dos provedores
- Health checks (banco OK, webhook OK, etc)
- Contagem de tabelas
- Links úteis: Site, Supabase, Vercel, Asaas, Chatwoot, GitHub

---

# 👤 Página do Cliente Final

## `/conta/dashboard` — O que o cliente vê

### Quem acessa
Cliente final logado (CPF + senha).

### O que mostra

**Header dark gradient** com saudação.

**Para cada processo ativo:**
- Tag (Consulta CPF, Limpeza, etc)
- Status (Em andamento / Concluído ✓)
- Pill da etapa atual colorida
- Progress bar + % concluído
- Mini stepper das etapas
- Arquivos disponíveis (PDF assinado, expira em X minutos)
- Timeline cronológica de atualizações

**3 cards rápidos**:
1. Relatório CPF — link condicional
2. Monitoramento (se blindagem ativa)
3. Suporte WhatsApp

**CTAs automáticos**:
- Sem consulta → bloco verde "Faça primeira consulta R$ 29,99"
- Tem pendência sem processo → bloco amber "Falar com consultor"
- Todos finalizados → bloco emerald "Processos concluídos"
- **Nome limpo sem blindagem** → bloco roxo "Mantenha nome limpo R$ 29,90/mês" ⭐

### Como o cliente entra
- **Login direto**: limpanomebrazil.com.br/conta/login
- **Senha temporária** é criada automaticamente quando paga consulta (`Lnb#XXXXX`)
- Recebe senha por WhatsApp + email

---

# 🌐 Site Público

## `/consultar/cpf` — Wizard de Consulta CPF

### Quem usa
Cliente novo querendo consultar.

### Fluxo (3 passos)
1. **Identificação** — CPF, nome, email, telefone, senha
2. **Pagamento** — checkout Asaas (Pix/Cartão/Boleto)
3. **Resultado** — polling até PDF ficar pronto

### Regras
- Cliente que já pagou é redirecionado pra `/conta/relatorio` (sem comprar 2x)
- Aceite de termos obrigatório (modais inline)
- Senha mínima 8 caracteres

### Banner modo teste
Aparece automaticamente se `LNB_MODO_TESTE=true` no Vercel:
> ⚠️ Modo de teste ativo — esta operação cobrará apenas R$ 5,00

## `/consultar/cnpj`
Mesma estrutura, mas pra CNPJ + razão social + CPF responsável.

## `/contratar`
Página de Limpeza. Pré-requisito: consulta paga com pendência.

**Plano CPF**: Limpeza R$ 500
- Benefícios:
  - Limpeza completa em até 20 dias úteis
  - ✅ **Aumenta o seu score Serasa automaticamente** ⭐
  - Você não precisa quitar a dívida
  - Monitoramento 12 meses bônus
  - Painel online
  - Consultor dedicado
  - Atualizações WhatsApp + email

**Plano CNPJ**: idem com "Aumenta o score do sócio responsável"

---

# 🤖 Maia (WhatsApp via n8n)

### Quem é
Agente IA que atende WhatsApp. Powered by Gemini.

### O que faz
- Atende cliente novo
- Coleta dados (CPF, nome, email, telefone)
- Qualifica como CPF ou CNPJ
- Gera link de pagamento (Asaas) via API
- Acompanha após pagamento
- Avisa quando relatório fica pronto
- Oferece limpeza pra quem tem pendência

### Pode ser pausada
- Time pode pausar Maia numa conversa específica (em casos de conflito)
- Reativar depois

### Workflow atual
`Multi Agentes LNB v10` no n8n (195 nós, ativo em produção)

### ATENÇÃO — Time não mexe no n8n
- Versionamento controlado por dev
- Não editar prompts da Maia sem alinhar
- Bugs reportar via WhatsApp Lucas

---

# 📊 Glossário do time

| Termo | Significado |
|---|---|
| **Lead** | Pessoa que entrou no funil (ainda não pagou nada) |
| **Interessado** | Demonstrou interesse mas não pagou |
| **Qualificado** | Recebeu link de pagamento da consulta |
| **Consulta paga** | Pagou os R$ 29,99 e recebeu relatório |
| **Limpeza paga** | Pagou os R$ 500 — vai pro time tratar |
| **Em tratativa** | Time iniciou processo junto aos órgãos |
| **Aguardando órgãos** | Finalizou junto aos órgãos, esperando Serasa atualizar (3-5d) |
| **Nome limpo** | Confirmado 100% limpo |
| **Blindagem ativa** | Migrou pra serviço mensal de monitoramento |
| **Tag de serviço** | Identifica qual produto cada card representa |
| **Etapa** | Posição do cliente no Kanban (uma das 11) |
| **Funil** | Conjunto de etapas. PRÉ-pagamento (6) ou PÓS-pagamento (5) |
| **CRM** | Banco de leads (tabela `LNB - CRM`) |
| **MRR** | Monthly Recurring Revenue — receita mensal recorrente (blindagens) |
| **Drawer** | Painel lateral que abre ao clicar em qualquer card |
| **Webhook** | Notificação automática que o Asaas manda quando um pagamento ocorre |

---

# 🚨 FAQ — Perguntas comuns do time

### "Cliente paga consulta e não aparece no Kanban. Por quê?"

Praticamente impossível. O webhook do Asaas cria automaticamente. Se não apareceu:
1. Confirme que o pagamento foi **APROVADO** no Asaas (não pendente)
2. Veja `/painel/configuracoes/sistema` → Health checks
3. Reporte ao dev

### "Posso disparar consulta sem cobrar?"

**NÃO.** Cada consulta custa R$ 8,29. Sistema bloqueia consulta sem pagamento. Pra teste, use modo teste (R$ 5).

### "Como saber se o cliente já pagou?"

`/painel/clientes` → busca por nome ou CPF → coluna "Pago" mostra valor (verde se pago).

### "Cliente perdeu o PDF. Como recuperar?"

- Pelo painel admin: `/painel/clientes` → click no cliente → drawer → link PDF
- Cliente acessa: `/conta/relatorio` (logado)
- Reenviar manualmente: WhatsApp anexo

### "Cliente quer reembolso?"

Decisão comercial (não automático no sistema). Time financeiro processa via Asaas dashboard. Marcar lead como `Perdido` no Kanban.

### "Cliente fechou limpeza, mas mudou de ideia. Como cancelar?"

- Mover card pra `Encerrada` (funil pós)
- Decisão de reembolso fica com financeiro
- Não tem botão "cancelar pagamento" — fazer manual no Asaas

### "Como sei que a limpeza realmente funcionou?"

Após clicar "Finalizar Limpeza", aguardar 3-5 dias úteis. Cliente abre app gratuito Serasa Experian no celular → score atualizado = funcionou. Time pode também rodar consulta manual de verificação.

### "Cliente paga R$ 5 quando deveria pagar R$ 29,99. O que houve?"

**Modo teste está ativo**. Ir em Vercel → Environment Variables → remover `LNB_MODO_TESTE` → redeploy. Banner amber no `/painel/dashboard` indica isso.

### "Posso mudar o preço de um produto?"

SIM, e instantâneo. `/painel/configuracoes/produtos` → editar → salvar. Vale em até 60s.

### "Como adiciono um vendedor novo no painel?"

Hoje: criar conta no Supabase Auth + cadastrar UUID em `/painel/equipe`. Em breve: vai dar pra criar direto pelo email+senha.

### "Quando o cliente recebe a blindagem mensal?"

Cron roda todo dia às 9h da manhã. Verifica blindagens com `proxima_verificacao <= hoje`. Faz consulta nova + envia email/WhatsApp se aparecer pendência.

---

# 🎬 Sequência operacional ideal

### Cliente novo entra (lead via site ou WhatsApp)
1. Maia ou form do site coleta dados → vira **Lead**
2. Cliente paga consulta → **Consulta paga** (automático)
3. Cliente recebe relatório por email + WhatsApp + acesso ao painel

### Cliente tem pendência → quer limpar
4. Volta no site / Maia oferece limpeza
5. Paga limpeza → vira **Limpeza paga** (entra no funil PÓS)

### Time pega o caso
6. Move pra **Em tratativa**
7. Resolve juridicamente (fora do sistema)
8. Concluído? Click **"Finalizar Limpeza"** → vira **Aguardando órgãos**
9. Cliente recebe email automático com prazo

### Confirmação final (5 dias depois)
10. Time confirma que constou no Serasa Experian
11. Move pra **Nome limpo**
12. Cliente recebe email "tudo certo!"

### Upsell blindagem
13. Cliente vê CTA "Mantenha nome limpo R$ 29,90/mês" no painel
14. Aceita → vira **Blindagem ativa**
15. Asaas cria subscription mensal

### Mensal recorrente (automático)
16. Cron roda 9h → consulta CPF do cliente
17. Sem alerta? Manda relatório mensal por email
18. Com alerta? Manda alerta + acionar time

---

# 📈 Métricas que o time deve acompanhar

### Diário
- Quantos pagamentos novos hoje? (Dashboard / Vendas semana)
- Tem processo parado há +5 dias em "Aguardando órgãos"? (Alerta no Dashboard)

### Semanal
- Conversão consulta → limpeza está acima de 20%?
- Tickets de suporte recorrentes?

### Mensal
- MRR de Blindagem cresceu?
- Saldo dos provedores está OK pra continuar operando?
- Receita / Lucro / Margem (`/painel/financeiro`)

---

# 🆘 Quando algo der errado

### Sistema fora do ar
- Verificar `/painel/configuracoes/sistema` → health checks
- Tudo vermelho? Contatar dev (Lucas)

### Pagamento não confirmou
1. Confirmar no Asaas dashboard que está como `RECEIVED` ou `CONFIRMED`
2. Se sim e não apareceu no painel, esperar 1-2 min (webhook pode atrasar)
3. Se passou 10 min, contatar dev

### Cliente não recebe email
1. Verificar Resend dashboard (https://resend.com)
2. Email no spam?
3. Confirmar email cadastrado correto em `/painel/clientes`

### Botão "Finalizar Limpeza" deu erro
1. Verificar saldo do provedor (`/painel/configuracoes/sistema`)
2. Reenviar tentativa
3. Se persistir, contatar dev

---

# 📞 Contatos

- **Lucas Cassiano** (dev/owner): lucas@dosedegrowth.com.br
- **Suporte cliente final**: WhatsApp +55 11 99744-0101
- **Empresa**: Dose de Growth (DDG)

---

**📌 Este documento deve ser revisado mensalmente.** Mudanças importantes (preços, regras novas, etapas adicionadas) devem ser atualizadas aqui imediatamente para manter o time alinhado.

**Última atualização**: 15/mai/2026
