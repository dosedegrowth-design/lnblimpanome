# 🟦 Checklist Asaas — Limpa Nome Brazil

> **Pra quê serve:** lista TUDO que precisa ser feito **dentro da conta Asaas da LNB** pra ativar pagamentos reais (PIX, cartão, boleto) no site `limpanomebrazil.com.br`.
>
> **Status atual do código:** 100% migrado Mercado Pago → Asaas. Falta só você passar as credenciais.
>
> **Tempo total:** ~30 min de execução + 24h de análise pelo Asaas (geralmente bem mais rápido que MP).

---

## ⚡ Por que Asaas é melhor que MP no nosso caso

| Item | Mercado Pago | Asaas |
|---|---|---|
| PIX (R$ 19,99) | 0,99% = R$ 0,20 | **R$ 1,99 fixo** |
| PIX (R$ 480,01) | 0,99% = R$ 4,75 | **R$ 1,99 fixo** ✅ |
| Cartão crédito | 4,98% + R$ 0,39 | **4,99%** ✅ empate |
| Boleto | R$ 3,49 fixo | **R$ 1,99 fixo** ✅ |
| Tempo liberação PIX | Imediato | Imediato |
| Tempo liberação Cartão | 14 dias | 32 dias |
| Validação inicial | 24–72h | **24h** ✅ |
| API doc | OK | **Muito melhor** ✅ |
| PIX em test users | ❌ Não | ✅ Sim (sandbox completo) |

**Economia média por venda (LNB):**
- Consulta R$ 19,99 → Asaas mais caro em ~R$ 1,80 (vale a pena pela facilidade)
- Limpeza R$ 480,01 → Asaas **mais barato em R$ 2,76** (R$ 1,99 vs R$ 4,75)
- Blindagem R$ 29,90 → equivalente

---

## ✅ ETAPA 1 — Criar conta Asaas (10 min)

### 1.1 — Acessar e criar
1. Acesse **https://www.asaas.com/registration**
2. Clique em **"Sou empresa"** (NÃO "sou pessoa física")
3. Preencha:
   - **Email:** `contato@limpanomebrazil.com.br`
   - **CNPJ:** o da LNB
   - **Razão Social:** Limpa Nome Brazil [LTDA / EIRELI / etc.]
   - **Nome Fantasia:** Limpa Nome Brazil
   - **Categoria:** "Serviços" → "Consultoria"
   - **Faturamento estimado:** seja realista (afeta limites iniciais)
4. Aceitar os termos e confirmar

### 1.2 — Validar email
1. Abra o email recebido em `contato@limpanomebrazil.com.br`
2. Clique no link de confirmação
3. Defina senha forte

### 1.3 — Confirmar dados básicos
Após login:
- [ ] **Telefone com SMS validado**
- [ ] **CNPJ validado** (Asaas valida automaticamente via Receita)
- [ ] **Endereço da empresa preenchido**

---

## ✅ ETAPA 2 — Documentação para validação completa (10 min)

Asaas pede menos documentos que MP, mas precisa:

1. Acesse **Configurações → Dados da empresa**
2. Envie:
   - [ ] **Cartão CNPJ** atualizado (PDF)
   - [ ] **Contrato Social** ou Última Alteração
   - [ ] **RG ou CNH do sócio administrador**
   - [ ] **Comprovante de endereço da empresa** (até 90 dias)
   - [ ] **Selfie do sócio segurando documento** (se solicitado)

**⏱️ Análise:** geralmente 12–24h úteis.

---

## ✅ ETAPA 3 — Conta bancária para receber (5 min)

1. Acesse **Configurações → Conta bancária**
2. Cadastre:
   - **Banco** (Itaú, Bradesco, Caixa, Inter, Nubank PJ, etc.)
   - **Agência**
   - **Conta corrente**
   - **Titularidade:** mesmo CNPJ da LNB
3. Marque **"Saque automático D+1"** (recomendado — dinheiro cai no banco no dia seguinte ao recebimento)

---

## ✅ ETAPA 4 — Cadastrar chave PIX (3 min)

> Asaas já cria uma chave PIX automaticamente vinculada ao CNPJ, mas você pode cadastrar outras:

1. Acesse **PIX → Minhas chaves**
2. Já deve aparecer:
   - ✅ **CNPJ** (automática)
3. Opcional, adicionar:
   - **Email:** `contato@limpanomebrazil.com.br`
   - **Aleatória**

Pronto, PIX já recebe.

---

## ✅ ETAPA 5 — Gerar API Key (3 min) ⚠️ CRÍTICO

1. Acesse **Configurações → Integrações → API Asaas**
   - URL direta: https://www.asaas.com/customerApiAccessTokens
2. Clique em **"Gerar nova chave"**
3. Dê um nome: `LNB Painel - Produção`
4. **Copie a chave que aparece** (começa com `$aact_prod_...`) — **isto é o que vai pro Vercel**

**⚠️ ATENÇÃO:**
- A chave aparece **UMA ÚNICA VEZ**, salve em lugar seguro
- Se perder, gera nova (mas a antiga continua válida — pode revogar depois)
- **NÃO compartilhe** em screenshot público / grupo

### 5.1 — Sandbox (opcional, pra testar antes de produção)

Se quiser testar primeiro sem mover dinheiro real:
1. Acesse **https://sandbox.asaas.com** com seu mesmo email/senha
2. Repita o processo: **Configurações → Integrações → API Asaas**
3. Chave de sandbox começa com `$aact_YTU5...` (diferente da prod)

---

## ✅ ETAPA 6 — Configurar Webhook (5 min) ⚠️ CRÍTICO

Webhook é como o Asaas avisa o site quando o cliente paga.

1. Acesse **Configurações → Notificações por API (Webhooks)**
   - URL direta: https://www.asaas.com/customerConfigsApiNotifications
2. Clique em **"Adicionar novo Webhook"**
3. Preencha:
   - **URL:** `https://limpanomebrazil.com.br/api/site/asaas-webhook`
   - **Email para erros:** `contato@limpanomebrazil.com.br`
   - **Token de autenticação:**
     - Marque **"Gerar token automaticamente"** OU
     - Crie um manual (mínimo 32 caracteres, sem sequências previsíveis)
   - **Tipo de fila:** "Sequencial" (recomendado pra LNB — garante ordem dos eventos)
   - **Versão da API:** v3 (default)
   - **Eventos:**
     - [x] **Cobranças** (todos eventos PAYMENT_*)
     - [ ] (deixe os outros desmarcados por enquanto)
4. **Copie o token** que aparece — **isto vai pro Vercel como `ASAAS_WEBHOOK_TOKEN`**
5. Salvar

### 6.1 — Testar webhook (opcional)
Após salvar, Asaas oferece botão **"Enviar teste"**. Clica nele:
- Status esperado: **200 OK**
- Se aparecer 401: o token configurado no Vercel não bate com o gerado aqui

---

## 📦 O QUE VOCÊ PRECISA ME ENVIAR

Depois das 6 etapas, me mande **3 valores**:

```
1) ASAAS_API_KEY (Etapa 5)
   Valor: $aact_prod_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
   (ou $aact_YTU5... se for sandbox)

2) ASAAS_WEBHOOK_TOKEN (Etapa 6)
   Valor: chave alfanumérica de ~32+ caracteres
   Ex: AbC123XyZ789QWErtyUiOpaSdF0123456789

3) ASAAS_ENV (Etapa 5)
   Valor: "production" ou "sandbox"
   (recomendo começar em sandbox pra testar 1–2 pagamentos antes de produção)
```

**Como mandar com segurança:**
- WhatsApp privado (NÃO em grupo)
- Ou arquivo .txt anexo

---

## 🚦 O QUE EU FAÇO QUANDO RECEBER

1. ✅ Validar a chave via API Asaas (`/v3/customers?limit=1`)
2. ✅ Atualizar 3 envs no Vercel:
   - `ASAAS_API_KEY`
   - `ASAAS_WEBHOOK_TOKEN`
   - `ASAAS_ENV` (sandbox ou production)
3. ✅ Remover envs antigas `MP_ACCESS_TOKEN` e `MP_WEBHOOK_SECRET`
4. ✅ Redeploy do site
5. ✅ Criar uma cobrança de R$ 19,99 de teste e te mandar o link (`invoiceUrl`)
6. ✅ Você abre o link e confirma: **PIX + Cartão + Boleto** aparecem como opções
7. ✅ Você (ou eu, se sandbox) faz um pagamento PIX de R$ 19,99
8. ✅ Confirmar que webhook chegou, gerou PDF, mandou email pra `contato@`
9. ✅ Marcar site como **100% PRONTO** pra vendas reais

---

## ❓ FAQ

### Quanto demora pra começar a receber?

| Etapa | Tempo |
|---|---|
| Criar conta + validar email | 5 min |
| Cadastrar dados empresa | 10 min |
| Análise documental Asaas | 12–24h |
| Cadastrar chave PIX | 3 min |
| Gerar API Key + Webhook | 8 min |
| **TOTAL atendimento ao cliente real** | **~24h** ✅ |

### Posso usar Sandbox primeiro?

Sim, é o que **recomendo** pra evitar surpresas. Sandbox tem todas as funcionalidades de produção (PIX inclusive), só não move dinheiro real. Quando estiver tudo OK, troca pra produção em 1 minuto (só trocar a env).

### O cliente vê "Asaas" na fatura do cartão?

Não. Aparece como **"LIMPA NOME BRAZIL"** (ou o que você configurar em "Descrição na fatura"). Pode configurar em **Configurações → Faturamento → Soft Descriptor**.

### Quanto custa cobrar?

| Método | Tarifa | Tempo recebimento |
|---|---|---|
| **PIX** | **R$ 1,99 fixo** ✅ | Imediato |
| **Boleto** | R$ 1,99 fixo | 1–3 dias úteis |
| **Cartão à vista** | 4,99% | 32 dias |
| **Cartão parcelado (2–6x)** | 5,49% por parcela | 32 dias |
| **Cartão parcelado (7–12x)** | 6,99% por parcela | 32 dias |
| **Saque pra banco** | R$ 1,99 (TED) ou grátis (Pix) | D+1 |

> **Dica:** dá pra usar **"Antecipação"** pra receber valores de cartão antes dos 32 dias, mas tem taxa adicional (~3%/mês). Avalie depois.

### E se Asaas recusar a conta?

Muito raro com CNPJ válido. Se acontecer:
1. Asaas envia email explicando motivo
2. Geralmente é doc faltando ou ilegível — reenvia
3. Como alternativa: **Pagar.me** ou **Stripe Brasil** (eu integro)

### Como cancelar uma cobrança gerada por erro?

1. Painel Asaas → **Cobranças**
2. Encontra a cobrança → **Ações → Cancelar**
3. Se cliente já pagou: tem que estornar (Asaas faz automaticamente, devolve em 7 dias úteis)

---

## 📞 Suporte Asaas

- **Chat ao vivo:** dentro do painel (canto inferior direito)
- **Email:** suporte@asaas.com
- **Telefone:** 0800 942 0042
- **Central de ajuda:** https://ajuda.asaas.com/

Asaas tem reputação MUITO boa de atendimento. Geralmente respondem em minutos pelo chat.

---

## 🎯 Resumo executivo (TL;DR)

```
1. Criar conta Asaas empresa (CNPJ LNB)              10 min
2. Enviar documentos pra validação                   10 min
3. Aguardar análise Asaas                            12–24h
4. Cadastrar conta bancária pra saque                  5 min
5. Cadastrar chave PIX (CNPJ já vem auto)             3 min
6. Gerar API Key produção                              3 min
7. Configurar Webhook + copiar token                   5 min
8. Mandar pro Lucas: API_KEY + WEBHOOK_TOKEN + ENV
9. Eu atualizo Vercel, testamos                        2 min
```

**Após isso, site aceita PIX/Cartão/Boleto pra clientes reais.** ✅

---

## 🔄 Status do código (já implementado)

✅ `src/lib/asaas.ts` — cliente API completo (customer + payment + helpers)
✅ `src/lib/asaas-webhook.ts` — validação por token (timing-safe)
✅ `src/app/api/site/asaas-webhook/route.ts` — endpoint webhook completo
✅ `src/app/api/site/checkout/route.ts` — site usa Asaas
✅ `src/app/api/n8n/criar-checkout/route.ts` — n8n (WhatsApp) usa Asaas
✅ `src/app/api/admin/teste-fluxo/route.ts` — envs check Asaas
✅ UI atualizada (`/consultar`, `/contratar`, `/termos`, `/privacidade`, dashboard, confiança)
❌ `src/lib/mercadopago.ts` — **DELETADO**
❌ `src/lib/mp-webhook-signature.ts` — **DELETADO**
❌ `src/app/api/site/mp-webhook/` — **DELETADO**

**Build local:** OK ✅
**Pronto pra plugar a chave Asaas e testar.**
