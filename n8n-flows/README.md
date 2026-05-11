# n8n Flows — LNB

> Fluxos n8n versionados do projeto LNB.

## Multi Agentes LNB v10 (ATUAL — definitivo)

**Arquivo:** `Multi Agentes LNB v10.json` (195 nós, 146 conexões, 216KB)

**Auditoria:** 45/45 checks OK (100%)

### Filosofia
Clone do arquivo original `Multi Agentes LNB.json` (184 nós, estrutura canônica que funcionava em produção) com **adaptação cirúrgica** Evolution → Chatwoot + URLs LNB. NÃO foi redesenhado, apenas adaptado.

### Como importar
1. Abrir n8n
2. Workflows → Import from File → selecionar `Multi Agentes LNB v10.json`
3. Conectar credenciais (já vêm referenciadas no JSON):
   - **Gemini**: `LNB Limpa Nome` (id `YMZPVHkbJQW9giMq`)
   - **Supabase**: `Oficial Account` (id `OXGFVzeBXWTyLQWp`)
   - **Redis**: `Redistest` (id `p5McU43k3cRAmUXI`)
4. Configurar envs no n8n:
   - `N8N_SHARED_TOKEN` (mesmo valor do Vercel — auth Bearer pras 10 tools chamarem o painel)
   - `CHATWOOT_TOKEN` (bot token, envia msg cliente)
   - `CHATWOOT_ADMIN_TOKEN` (admin token, move kanban/labels)
5. Ativar workflow

### Arquitetura — Pipeline DUAL AI Agent

```
Webhook5 (path 6ef87fae-...) — Chatwoot incoming
  → If2 (inbox 12)
  → SetFieldsBasic (23 campos Chatwoot)
  → Sync Conversation Painel ⭐ (log + last_interaction)
  → FromMe-Switch (incoming only)
  → Check IA Pause ⭐ (consulta painel)
  → IA Está Pausada?
    [true]  → FimFluxo silencioso
    [false] → GET TIMEOUT1 → If4 → STOP AND SET TIMEOUT1
              → BuscaTrapList1 → If1 → AddTrapList
              → Tipo da Mensagem (texto/áudio/imagem)
                ├─ Texto: SET DEFAULT MESSAGE
                ├─ Áudio: SET AUDIO BASE64 → CONVERT TO MP3 → SET AUDIO MESSAGE
                └─ Imagem: SET IMAGE BASE64 → CONVERT TO JPG → SET IMAGE MESSAGE
              → Edit Fields → RedisPushMsgs → Wait 8s → ListaMsg-Redis
              → Should Continue? → AgruparMSGs → RedisClearMSGs → Redis6 → Config
              → Chat Memory Manager → Redis Memory Long
              → AI Agent1 (ORQUESTRADOR) — chama tools internas
                  ├─ Gemini LNB (ai_languageModel)
                  ├─ Memory Short1 (ai_memory)
                  ├─ Lead_kanban, interessado, Qualificado
                  ├─ long_memory, status_processo
                  ├─ blindagem_cadastro, aplicar_label, pausa_ia
                  └─ Think (raciocínio)
              → Redis3 → Redis Memory Long4
              → AI Agent (MAIA) — responde cliente
                  ├─ Gemini LNB (ai_languageModel)
                  ├─ Memory Short (ai_memory)
                  └─ conflito (tool de handoff)
              → Envia texto Chatwoot (retry 3x)
              → Respond to Webhook
```

### 7 Webhooks distintos

| Webhook | Path | Função |
|---|---|---|
| **Webhook5** | `6ef87fae-3202-4562-abe3-f1386d6d2bc5` | Main Chatwoot incoming |
| **Webhook3** | `lnb-tool-lead` | Tool externa: muda CRM Lead |
| **Webhook4** | `lnb-tool-interessado` | Tool externa: muda CRM Interessado |
| **Webhook** | `lnb-tool-checkout` | Tool externa: gera checkout MP |
| **Webhook6** | (original) | long_memory chain paralela |
| **Webhook7** | (original) | Pause IA externo |
| **Webhook8** | (original) | Reset trap + start IA externo |

### 10 Tools LNB (conectadas ao Orquestrador + Maia)
Todas chamam `https://limpanomebrazil.com.br/api/n8n/*` com `Authorization: Bearer {{$env.N8N_SHARED_TOKEN}}`:

| Tool | Endpoint Painel | Conectada a |
|---|---|---|
| `Lead_kanban` | `/lead-status` (stage=Lead) | AI Agent1 |
| `interessado` | `/lead-status` (stage=Interessado) | AI Agent1 |
| `Qualificado` | `/criar-checkout` (3 tipos) | AI Agent1 |
| `long_memory` | `/memory-long` | AI Agent1 |
| `status_processo` | `/status-processo` | AI Agent1 |
| `blindagem_cadastro` | `/blindagem-cadastro` | AI Agent1 |
| `aplicar_label` | `/aplicar-label` | AI Agent1 |
| `pausa_ia` | `/pause-ia` | AI Agent1 |
| `conflito` | `/pause-ia` (motivo=conflito) | AI Agent (Maia) |
| `Think` | (tool nativo) | AI Agent1 |

### Sincronia DUPLA Painel ↔ Chatwoot

Cada tool atualiza AMBOS lados:
- **Chatwoot**: labels visíveis na UI atendente, custom attributes, private notes
- **Painel LNB**: `LNB - CRM` (flags, valor_servico, tipo_servico, conversation_id, labels_aplicadas[]), `LNB_Consultas`, `LNB_Blindagem`, `lnb_audit_log`

## Scripts

- `build_lnb_v10.py` — gera v10 a partir do original (adaptação cirúrgica)
- `audit_v10.py` — auditoria 45 checks
- `build_lnb_v09.py` — script v09 (histórico)
- `audit_v09.py` — auditoria v09 (histórico)

## Histórico de versões

| Versão | Nós | Status | Nota |
|---|---|---|---|
| Original | 184 | Histórico | Evolution-based, estrutura canônica |
| v02 | 187 | Backup | Backup Evolution |
| v03 | 187 | Deprecated | |
| v04 | 218 | Histórico | Clone SPV inicial |
| v05 | 178 | Histórico | Auditoria parcial |
| v06 | 171 | Bugs graves | 42 órfãos + 25 lixo |
| v07 | 24 | Enxuto demais | Perdeu áudio/anti-spam/debounce |
| v08 | 60 | Tentativa intermediária | From-scratch |
| v09 | 88 | Descartado | Fora da estrutura canônica |
| **v10** | **195** | ✅ **ATUAL** | Clone+adapt do original 184 |
