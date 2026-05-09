# 🎯 LNB · Estado Atual

> **Leia este arquivo SEMPRE no início da sessão.** Última atualização: 09/05/2026

---

## 📍 O que é

**LNB (Limpa Nome Brazil)** — sistema 100% digital de limpeza de nome no Brasil.

Vende 3 produtos:
- **Consulta CPF** R$ 19,99 (gateway obrigatório)
- **Limpeza + Blindagem 12m** R$ 480,01 (produto principal — só após consulta com pendência)
- **Blindagem mensal** R$ 29,90/mês (só pra quem tem nome limpo)

## 🌐 URLs

- **Site:** https://limpanomebrazil.com.br
- **Painel:** https://limpanomebrazil.com.br/painel (lucas@dosedegrowth.com.br / <ADMIN_PASSWORD>)
- **GitHub:** https://github.com/dosedegrowth-design/lnblimpanome
- **Vercel:** team `dose-de-growths-projects`, project `lnb-painel`
- **Supabase:** `hkjukobqpjezhpxzplpj` (sa-east-1)
- **Chatwoot:** Account 11, Inbox 12, Funil 1 ("Limpeza de Nome")

## ⚡ Estado em 09/05/2026

### ✅ Funcionando 100%
- Backend painel completo (28+ rotas, 7 endpoints `/api/n8n/*` Bearer auth)
- Webhook MP com HMAC validation
- PDF interno pdfkit (1 página A4 sóbrio)
- Email Resend (domínio verificado)
- Supabase com 6 tabelas LNB + 16 RPCs SECURITY DEFINER + 3 buckets
- Chatwoot integration: 16 labels + Custom Attributes + Private Notes + PDF anexo
- 16 envs configuradas no Vercel
- Site público completo (home, /consultar, /contratar, /conta, painel admin)

### 🟡 Em progresso
- **Multi Agentes LNB v06** — gerado mas **com bugs** (Webhook5 path errado + 12 URLs SPV remanescentes + 12 nós com palavras SPV + 23 nós órfãos)
- **PRÓXIMO PASSO:** construir **v07 do zero ENXUTO** — só essencial LNB (Webhook + AI Agent + 7 tools), sem clone do SPV inteiro

### ❌ Bloqueios
Nenhum bloqueio crítico. Painel está pronto. Falta só fluxo n8n correto.

### 🔵 Pendências futuras
- Templates Meta WhatsApp aprovados (pra mensagens fora janela 24h)
- Visão Kanban no /painel/leads
- Dashboard métricas
- MCP n8n na próxima sessão (já instalado, ativa após restart Claude Code)

## 🛠️ Stack rápido

- Next.js 16 + React 19 + Tailwind v4
- Supabase PostgreSQL 15
- Mercado Pago (HMAC validated)
- Chatwoot WhatsApp Cloud API oficial Meta
- Gemini (cred separada `LNB Limpa Nome` id `<GEMINI_CRED_ID>`)
- Resend (domínio limpanomebrazil.com.br)
- pdfkit puro Node

## 📋 Regras críticas (NUNCA QUEBRAR)

1. **Cliente NUNCA contrata Limpeza sem ter Consulta paga COM pendência** — RPC `cliente_pode_contratar_limpeza` valida
2. **Webhook5 path** = `6ef87fae-3202-4562-abe3-f1386d6d2bc5` (NUNCA mudar)
3. **Versionamento n8n:** sempre criar versão NOVA (v05 → v06 → v07), nunca editar in-place
4. **Tools n8n:** `bodyParameters` + `$fromAI()` (NUNCA `specifyBody:json`)
5. **Configs Kanban:** AMBOS campos `Acoount ID` (typo) E `Conta do Chatwoot`
6. **onError:** `continueRegularOutput` em TODOS nós críticos
7. **Origem do lead:** sempre setar `origem='site'` ou `origem='whatsapp'` (afeta canal de notificação)

## 🎯 Continuar o projeto em chat novo

```
Estou continuando o projeto LNB. Lê:
1. /Users/lucascassiano/Antigravity/lnb-painel/CLAUDE.md
2. /Users/lucascassiano/Antigravity/lnb-painel/progress.md
3. Skill `lnb-projeto` (auto-trigger pelo nome LNB)

Estamos em [contexto atual]
```

## 📚 Documentos relacionados

- `progress.md` — histórico cronológico
- `docs/PROJETO_LNB.md` — doc técnica completa (tudo)
- `REGRAS_E_LOGICA.md` — regras operacionais
- `DEPLOY_GUIDE.md` — guia deploy
- Skill `lnb-projeto` — `~/.claude/skills/lnb-projeto/SKILL.md`

---

**🚦 Próxima ação:** construir Multi Agentes LNB v07 enxuto (só Webhook + AI Agent + 7 tools — sem cargo SPV)


---

> ⚠️ **Credenciais reais NÃO ficam no repo Git.** Estão em:
> `~/.claude/skills/lnb-projeto/references/credenciais.md` (local apenas)
