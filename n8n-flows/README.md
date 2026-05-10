# n8n Flows — LNB

> Fluxos n8n versionados do projeto LNB.

## Multi Agentes LNB v09 (atual)

**Arquivo:** `Multi Agentes LNB v09.json` (88 nós, 52 conexões)

**Auditoria:** 42/42 checks OK (100%)

### Como importar
1. Abrir n8n
2. Workflows → Import from File → selecionar `Multi Agentes LNB v09.json`
3. Garantir credenciais conectadas:
   - **Gemini:** `LNB Limpa Nome` (id `YMZPVHkbJQW9giMq`)
   - **Supabase:** `Oficial Account` (id `OXGFVzeBXWTyLQWp`)
   - **Redis:** `Redistest` (id `p5McU43k3cRAmUXI`)
4. Configurar env no n8n:
   - `N8N_SHARED_TOKEN` (mesmo valor do Vercel — usado pelas 8 tools chamarem o painel)
   - `CHATWOOT_TOKEN` (bot)
   - `CHATWOOT_ADMIN_TOKEN` (admin pra labels/kanban)
5. Ativar workflow

### Estrutura
```
Webhook5 (path 6ef87fae-3202-4562-abe3-f1386d6d2bc5)
  → If2 (inbox 12)
  → SetFieldsBasic (15 campos Chatwoot)
  → Sync Conversation Painel (logs em audit_log)
  → Mover Lead (Auto) (stage Lead na 1ª msg)
  → FromMe-Switch (incoming only)
  → Check IA Pause (consulta painel)
  → IA Está Pausada?
    [true]  → FimFluxo silencioso
    [false] → GET TIMEOUT1 (lock 60s)
              → BuscaTrapList1 (anti-spam 5s)
              → Tipo da Mensagem (texto/áudio/imagem/replied)
              → RedisPushMsgs → Wait 8s → ListaMsg → Should Continue?
                → AgruparMSGs → RedisClearMSGs
                → Maia (AI Agent + Gemini + Memory + 8 tools)
                → Envia Texto Chatwoot (retry 3x)
                → Respond to Webhook
```

### 8 Tools LNB conectadas à Maia
Todas chamam `https://limpanomebrazil.com.br/api/n8n/*` com Bearer auth:

| Tool | Quando |
|---|---|
| `lead_status` | Move stage funil (Lead/Interessado/Qualificado/Fechado/Perdido) |
| `gerar_cobranca_consulta` | Cliente aceitou consulta R$ 19,99 |
| `gerar_cobranca_limpeza` | Cliente aceitou limpeza R$ 480,01 (após consulta com pendência) |
| `blindagem_cadastro` | Cliente aceitou blindagem R$ 29,90/mês |
| `memory_long` | Atualiza memória estruturada |
| `aplicar_label` | Marca etiquetas Chatwoot + sync CRM |
| `status_processo` | Cliente pergunta "tá pronto?", "como está?" |
| `pausa_ia` | Cliente pede humano OU conflito grave |

### Webhooks auxiliares
- `POST /webhook/lnb-pause-ia` — pausa IA externamente (botão no painel)
- `POST /webhook/lnb-start-ia` — reativa IA externamente

## Scripts

- `build_lnb_v09.py` — gera v09 a partir do v06 (clone-and-adapt)
- `audit_v09.py` — auditoria 42 checks

## Histórico de versões

| Versão | Nós | Status |
|---|---|---|
| v02 | 187 | Backup Evolution |
| v03 | 187 | Deprecated |
| v04 | 218 | Histórico (clone SPV inicial) |
| v05 | 178 | Histórico (auditoria) |
| v06 | 171 | Bugs graves (42 órfãos + 25 lixo) |
| v07 | 24 | Enxuto demais (perdeu áudio/imagem/anti-spam) |
| v08 | 60 | Tentativa intermediária |
| **v09** | **88** | ✅ ATUAL — auditoria 42/42 100% |
