# 📈 LNB · Histórico de Progresso

> Cronologia de mudanças. Atualize ao FIM de cada sessão de trabalho.

---

## 🔵 09/05/2026 — Sessão atual (em andamento)

### Estrutura de persistência criada
- ✅ Criada skill **`lnb-projeto`** em `~/.claude/skills/lnb-projeto/` (auto-trigger por keywords LNB)
- ✅ Criado `CLAUDE.md` na raiz do projeto (estado atual de 1 página)
- ✅ Criado `progress.md` (este arquivo)
- ✅ Criada referência `references/credenciais.md` na skill (todas envs/tokens)
- ✅ Criado `docs/PROJETO_LNB.md` (documentação técnica completa)

### Multi Agentes LNB v06 — confirmado QUEBRADO
**4 problemas identificados em auditoria deep:**
1. ❌ Webhook5 path errado (`lnb-chatwoot-webhook` em vez de `6ef87fae-...`)
2. ❌ 12 URLs SPV antigas remanescentes (go.dosedegrowth.cloud/...)
3. ❌ 12 nós com palavras SPV (placa, vistoria, FIPE, Brasília, Moema)
4. ❌ 23 nós órfãos (sem conexão de entrada)

**Decisão:** abandonar abordagem "clone do SPV inteiro" — construir **v07 do zero ENXUTO**.

### Backend painel (já estava 100%)
- 28+ rotas Next.js
- 7 endpoints `/api/n8n/*` com Bearer auth
- mp-webhook com HMAC validation
- PDF interno pdfkit (1 página A4)
- Email Resend funcionando
- Chatwoot integrado: 16 labels + Custom Attributes + Private Notes + PDF anexo
- 6 tabelas LNB + 16 RPCs SECURITY DEFINER + 3 buckets Storage

### Próxima ação
Construir **`Multi Agentes LNB v07.json`** ENXUTO:
- Apenas 1 webhook (Webhook5 com path correto)
- 1 IF filtro inbox==12
- 1 SetFieldsBasic com payload Chatwoot oficial
- 1 Mover Lead automático
- Cadeia mínima de debounce + tipo mensagem
- 4 AI Agents (Maia + Orquestrador + 2 Memory)
- 7 tools LNB (lead_status, criar_checkout consulta/limpeza, blindagem, memory_long, aplicar_label, status_processo)
- Configs Kanban (5 stages)
- ~80 nós (vs 171 do v06 que tem lixo)

---

## 🟢 08/05/2026 — Sessão anterior

### MCP n8n
- Usuário ativou MCP n8n no painel Claude
- Aparece na lista mas tools não ficam ativas até **reiniciar Claude Code**
- Soluções imediatas: REST API n8n direto OU Chrome MCP

### Chatwoot Integration completa
- 16 labels criadas via API (consulta-cpf, limpeza-nome, pago-*, score-*, conflito, vip, etc)
- 4 libs criadas no painel:
  - `lib/chatwoot.ts` — mensagem texto/template
  - `lib/chatwoot-kanban.ts` — mover stage funnel
  - `lib/chatwoot-labels.ts` — aplicar labels (12 contextos)
  - `lib/chatwoot-attributes.ts` — Custom Attributes + Private Notes
  - `lib/chatwoot-attach.ts` — PDF anexo
- 4 endpoints novos `/api/n8n/*`: lead-status, criar-checkout, blindagem-cadastro, memory-long, aplicar-label, status-processo
- Bearer auth com `N8N_SHARED_TOKEN`
- mp-webhook integrado: aplica labels + custom attrs + private note + PDF anexo automático

### Migrations Supabase
- `LNB - CRM` ganhou 11 colunas novas (valor_servico, tipo_servico, conversation_id, kanban_item-id, last_interaction, pdf_url, score, tem_pendencia, qtd_pendencias, total_dividas, labels_aplicadas, memoria_longa)
- 16 RPCs SECURITY DEFINER criadas
- 3 buckets Storage com policies pra anon

### Tentativas v04, v05, v06 (todas com bugs)
- v04: 218 nós (clone SPV Matriz 110)
- v05: 178 nós (auditoria + Mover Lead Auto)
- v06: 171 nós (sem `On form submission` SPV) — **mas com Webhook5 path errado**

---

## 🟢 07/05/2026 — PDF + Domínio

### PDF redesenhado pdfkit
- Trocou `@react-pdf/renderer` (não funcionava no Vercel) por `pdfkit` (puro Node)
- Layout 1 página A4 sóbrio (estilo extrato bancário)
- Header forest verde + 4 quadrantes (dados, score, pendências, CTA)
- Funciona com mock + dados reais API Full

### Funil Consulta → Limpeza
- RPC `cliente_pode_contratar_limpeza` valida 4 condições
- `/contratar` com 3 estados: cpf → form → bloqueado
- Bloqueio com CTA correto (sem_consulta → /consultar; sem_pendencia → "nome limpo")
- mp-webhook detecta origem (site vs whatsapp) e roteia notificação

---

## 🟢 06/05/2026 — Internalização n8n

**Decisão estratégica:** matar tudo no n8n que dá pra fazer no painel.

### Internalizado no painel:
- ✅ PDF Generator (era n8n) → `src/lib/pdf/` no painel
- ✅ Fechamento - LNB (era n8n) → `mp-webhook` no painel
- ✅ Cobrança Dinâmica (era n8n) → `/api/site/checkout`
- ✅ Blindagem Cron (era n8n) → Vercel Cron + `/api/cron/blindagem-diaria`
- ✅ Blindagem Cadastro (era n8n) → `/api/n8n/blindagem-cadastro`

### Mantém no n8n:
- ❌ Multi Agentes LNB (atendimento WhatsApp via Maia) — único caso ideal pra n8n

---

## 🟢 05/05/2026 — Setup Vercel + Tokens

### Envs Vercel configuradas (via UI)
- `MP_ACCESS_TOKEN` (Mercado Pago Produtivo)
- `MP_WEBHOOK_SECRET` (HMAC validation)
- `API_FULL_TOKEN` (consulta CPF Boa Vista R$ 2,49)
- `LNB_PDF_WEBHOOK` (depois removido — internalizado)
- `SUPABASE_SERVICE_ROLE_KEY` (sb_secret_...)
- `RESEND_API_KEY` + `RESEND_FROM`
- `CHATWOOT_TOKEN` (bot)
- `CHATWOOT_ACCOUNT_ID=11`
- `CHATWOOT_INBOX_ID=12`

### Domínio
- `limpanomebrazil.com.br` HTTPS Vercel
- DNS apontando direto

### Painel admin completo
- Login Supabase Auth: lucas@dosedegrowth.com.br / <ADMIN_PASSWORD>
- 12+ rotas (/painel/dashboard, leads, processos, blindagem, financeiro, equipe, teste-fluxo, configuracoes)
- Sistema de processos pós-venda com kanban (limpeza/blindagem/consulta)

---

## 🟢 04/05/2026 — Brand + Site

### Aplicação completa do Brand Guide
- Paleta: forest900/800/700 + brand500/400 + sand + emerald/amber/red500
- Fonts: Questrial (display) + Quicksand (body)
- Logo PNG real (1172x448) integrada
- Site mobile-first, 4 seções principais

### Implementação 3 produtos
- Home com 2 cards conectados (Consulta → Limpeza)
- /consultar wizard 3 steps
- /contratar com guard de elegibilidade
- /conta área cliente com auth CPF+senha custom

---

## 🟢 03/05/2026 — Início

### Setup inicial
- Next.js 16 project criado em `/Users/lucascassiano/Antigravity/lnb-painel`
- GitHub repo `dosedegrowth-design/lnblimpanome`
- Vercel auto-deploy
- Supabase tabelas iniciais

---

## 📊 Resumo de versões fluxo n8n

| Versão | Nós | Status | Nota |
|---|---|---|---|
| `Multi Agentes LNB.json` | 187 | Backup | Original Evolution API |
| `Multi Agentes LNB v02.json` | 187 | Backup | v2 Evolution |
| `v03-DEPRECATED.json` | 187 | ❌ Bug | Patches encadeados Evolution→Chatwoot |
| `v04.json` | 218 | Histórico | Clone SPV Matriz 110 inicial |
| `v05.json` | 178 | Histórico | Auditoria + Mover Lead Auto |
| `v06.json` | 171 | ❌ Bugs graves | Webhook path errado + lixo SPV |
| **`v07.json`** | **~80** | 🚧 PRÓXIMA | ENXUTO do zero |

---

## 🎯 Roadmap próximas sessões

### Curto prazo
- [ ] Multi Agentes LNB v07 enxuto
- [ ] Importar v07 no n8n
- [ ] Testar mensagem real WhatsApp
- [ ] Validar fluxo end-to-end (Lead → Interessado → Qualificado → pagamento → PDF)

### Médio prazo
- [ ] Templates Meta WhatsApp aprovados (BR)
- [ ] Visão Kanban no `/painel/leads`
- [ ] Dashboard métricas (conversão, receita)
- [ ] Calculadora de score interativa na home

### Longo prazo
- [ ] Mobile app (React Native)
- [ ] Blog SEO (artigos sobre Cadastro Positivo)
- [ ] Reclame Aqui badge
- [ ] Logos "Como na mídia"

---

## 📝 Como manter este arquivo

**Ao FIM de cada sessão:**
1. Adicionar nova entrada no topo com data
2. Atualizar status do roadmap
3. Mover itens completados pra cronologia
4. Commit + push


---

> ⚠️ **Credenciais reais NÃO ficam no repo Git.** Estão em:
> `~/.claude/skills/lnb-projeto/references/credenciais.md` (local apenas)
