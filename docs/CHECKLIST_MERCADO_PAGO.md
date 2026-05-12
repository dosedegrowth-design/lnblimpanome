# 🟡 Checklist Mercado Pago — Limpa Nome Brazil

> **Pra quê serve este documento:** lista TUDO que precisa ser feito **dentro da conta Mercado Pago da LNB** pra ativar pagamentos reais (PIX, cartão, boleto) no site `limpanomebrazil.com.br`.
>
> **Quem faz:** o dono da conta MP (não a equipe técnica DDG — exige acesso aos dados da empresa).
>
> **Tempo total:** ~30–60 min de execução + 24–72h de análise pelo MP.

---

## ⚠️ Status atual (11/05/2026)

**Conta MP usada hoje:** `TESTUSER3072210265305156152` (conta de TESTE / sandbox MP)
**Problema:** test users do MP **não suportam PIX no Brasil** — por isso só aparece cartão/boleto no checkout.
**Solução:** trocar pra uma conta MP de PRODUÇÃO real da LNB (CNPJ ou CPF da empresa).

---

## ✅ ETAPA 1 — Decidir o tipo de conta (5 min)

A LNB precisa decidir **com qual identidade** a conta MP vai operar:

| Opção | Quando usar | Documento principal |
|---|---|---|
| **CNPJ da LNB** ✅ Recomendado | Se a Limpa Nome Brazil já tem CNPJ ativo | Cartão CNPJ + Contrato Social |
| **CPF do sócio responsável** | Se ainda não tem CNPJ aberto | CPF + RG + Comprovante de endereço |

**👉 Por que CNPJ é melhor?**
- Receber valores em conta da empresa (Pix/TED no CNPJ)
- Emitir nota fiscal automaticamente
- Limite de recebimento muito maior (Pessoa Física tem teto baixo)
- Profissionaliza o negócio (cliente vê "LIMPA NOME BRAZIL LTDA" na fatura, não nome pessoal)
- Necessário pra parcelar em até 12x sem juros (MP libera)

---

## ✅ ETAPA 2 — Criar/Validar conta MP da empresa (15 min)

### 2.1 — Se ainda NÃO tem conta MP da LNB
1. Acesse https://www.mercadopago.com.br/registration-mp/landing
2. Clique em **"Criar conta empresa"** (NÃO "conta pessoal")
3. Use o email oficial: `contato@limpanomebrazil.com.br`
4. Cadastre o CNPJ da LNB
5. Preencha dados do responsável legal (sócio administrador)

### 2.2 — Se já tem conta, faça login e valide

Acesse https://www.mercadopago.com.br/ e faça login.

**Checklist da conta empresa:**

- [ ] **Tipo da conta:** "Empresa" (não "Pessoal")
  - Verificar em: Menu → "Sua conta" → "Dados pessoais"
- [ ] **Email confirmado:** sim
  - Verificar em: "Sua conta" → "Email principal" deve mostrar ✓
- [ ] **CNPJ validado:** sim
  - Verificar em: "Seu negócio" → "Dados da empresa"
- [ ] **Telefone validado:** sim
  - Verificar em: "Sua conta" → "Celular"

---

## ✅ ETAPA 3 — Documentação para validação (20 min)

O MP exige envio de documentos pra liberar PIX + valores acima de R$ 1.000.

Acesse: **Menu → Sua conta → Verificação de identidade**

### 3.1 — Pessoa Jurídica (CNPJ)
Documentos necessários:
- [ ] **Cartão CNPJ** atualizado (baixar em https://servicos.receita.fazenda.gov.br/servicos/cnpjreva/cnpjreva_solicitacao.asp)
- [ ] **Contrato Social** ou Última Alteração Contratual (PDF)
- [ ] **Comprovante de endereço** da empresa (max 90 dias) — conta de luz, água, internet ou telefone
- [ ] **RG ou CNH do sócio responsável** (frente + verso)
- [ ] **CPF do sócio responsável**
- [ ] **Selfie do sócio segurando o RG** (foto de rosto + documento)

### 3.2 — Pessoa Física (CPF do sócio)
Documentos necessários:
- [ ] **RG ou CNH** (frente + verso)
- [ ] **CPF**
- [ ] **Comprovante de endereço** (max 90 dias)
- [ ] **Selfie segurando o documento**

**⏱️ Análise:** entre 24h e 72h úteis. MP envia email quando aprovar.

---

## ✅ ETAPA 4 — Cadastrar chave PIX (5 min)

Após conta validada:

1. Acesse https://www.mercadopago.com.br/your-pix
2. Clique em **"Cadastrar chave PIX"**
3. Escolha uma das opções:
   - **CNPJ** (recomendado se conta empresa)
   - **Email** (use `contato@limpanomebrazil.com.br`)
   - **Celular**
   - **Chave aleatória** (gerada pelo MP)
4. Confirme via SMS ou email
5. **Status final:** "Ativa" (não "Pendente de validação")

**Cadastre pelo menos 1, recomendamos 2:**
- Chave principal: **CNPJ da LNB**
- Chave secundária: **email `contato@limpanomebrazil.com.br`**

---

## ✅ ETAPA 5 — Aceitar PIX como meio de recebimento (3 min)

Mesmo com chave cadastrada, MP exige ativar PIX como forma de pagamento:

1. Acesse https://www.mercadopago.com.br/settings/payment-methods
2. Encontre **"Pix"** na lista
3. Toggle deve estar **LIGADO** (verde)
4. Confirme

Repita pra:
- [ ] **Cartão de crédito** (Visa, Master, Elo, Amex) — geralmente já vem ligado
- [ ] **Cartão de débito** (Visa Débito, Elo Débito) — geralmente já vem ligado
- [ ] **Boleto** (Bradesco) — opcional, vale a pena ativar (taxa baixa, ~R$ 3,49 fixo)
- [ ] **Pix** — OBRIGATÓRIO ativar

---

## ✅ ETAPA 6 — Criar a aplicação (App) no painel do desenvolvedor (10 min)

Aqui geramos o `MP_ACCESS_TOKEN` que o site usa.

1. Acesse https://www.mercadopago.com.br/developers/panel/app
2. Clique em **"+ Criar aplicação"**
3. Preencha:
   - **Nome do app:** `Limpa Nome Brazil — Site`
   - **Solução:** "Pagamentos online" → "Checkout Pro / Checkout API"
   - **Modelo:** "Eu uso o Mercado Pago em meu próprio site / app"
   - **Você é o usuário final?** Não
   - **Categoria:** "Serviços" → "Serviços profissionais"
   - **Recebe pagamentos do seu próprio negócio?** Sim
4. Salvar

---

## ✅ ETAPA 7 — Copiar credenciais de PRODUÇÃO (3 min)

Dentro da aplicação criada:

1. Menu lateral: **"Credenciais de produção"**
2. **Public Key:** copie o valor (começa com `APP_USR-...`) — não vai pro site, mas guarde
3. **Access Token:** copie o valor (começa com `APP_USR-...`) — **ESTE é o que vai pro Vercel**

**⚠️ ATENÇÃO:**
- Use **"Credenciais de produção"** (NÃO "Credenciais de teste")
- Test credentials não suportam PIX nem pagamentos reais
- Trate o Access Token como senha — não compartilhe em screenshots públicos

**Pra mandar pro Lucas (DDG):**
- Envie por canal seguro (WhatsApp privado direto, NÃO grupo)
- Ou cole em arquivo `.txt` e envie

---

## ✅ ETAPA 8 — Configurar Webhook (5 min)

O webhook é o que avisa o site quando o cliente pagou.

1. Ainda dentro da aplicação MP, menu lateral: **"Webhooks"**
2. Em **"URL de produção"**, cole:
   ```
   https://limpanomebrazil.com.br/api/site/mp-webhook
   ```
3. Em **"Eventos"**, marque APENAS:
   - [x] **Pagamentos** (`payment`)
   - [ ] (todos os outros desmarcados)
4. Salvar
5. Após salvar, clique em **"Configurar assinatura secreta"** ou **"Suas chaves"**
6. Copie a **"Chave secreta"** que aparece — **ESTE é o que vai pro Vercel como `MP_WEBHOOK_SECRET`**

---

## ✅ ETAPA 9 — URLs de retorno (Back URLs) — opcional mas recomendado (2 min)

No mesmo painel da aplicação MP:

1. Menu: **"Suas integrações"** → **"Checkout Pro"** → **"URLs de retorno"**
2. Configure:
   - **URL de sucesso:** `https://limpanomebrazil.com.br/consultar?status=success`
   - **URL de pendência:** `https://limpanomebrazil.com.br/consultar?status=pending`
   - **URL de falha:** `https://limpanomebrazil.com.br/consultar?status=failure`
3. Salvar

(O site já força essas URLs no código, então é redundância de segurança.)

---

## ✅ ETAPA 10 — Configurar dados de recebimento (3 min)

Pra dinheiro cair onde precisa:

1. Acesse https://www.mercadopago.com.br/settings/account
2. **Dados bancários** (se quiser sacar pra banco automaticamente):
   - Banco
   - Agência
   - Conta corrente
   - Titular: deve ser o mesmo CNPJ/CPF da conta MP
3. **Saque automático:** ligado (recomendado — dinheiro cai no banco em até 1 dia útil)

---

## 📦 O QUE VOCÊ PRECISA ME ENVIAR (resumo)

Depois das 10 etapas, me mande os **3 valores**:

```
1) MP_ACCESS_TOKEN
   Valor: APP_USR-XXXXXXXXXXXXXX-XXXXXX-XXXXXXXXXXXXXXXXXXXXXXX-XXXXXXXX
   Origem: Etapa 7

2) MP_PUBLIC_KEY (opcional, pra debugging)
   Valor: APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   Origem: Etapa 7

3) MP_WEBHOOK_SECRET
   Valor: chave alfanumérica de ~64 chars
   Origem: Etapa 8

4) Confirmar nickname da conta
   Print da tela "Sua conta" → "Dados pessoais" mostrando o nome real
   (NÃO pode ser "TESTUSER..." nem email "@testuser.com")
```

---

## 🚦 O QUE EU FAÇO QUANDO RECEBER

1. ✅ Validar o token via API MP (confirmar que é conta real e tem PIX ativo)
2. ✅ Atualizar `MP_ACCESS_TOKEN` no Vercel (env de produção)
3. ✅ Atualizar `MP_WEBHOOK_SECRET` no Vercel
4. ✅ Redeploy do site
5. ✅ Criar uma preference de R$ 19,99 de teste e te mandar o link
6. ✅ Você abre o link e confirma que aparece **PIX + cartão + boleto** (3 opções)
7. ✅ Fazer um pagamento real de R$ 19,99 via PIX (você mesmo) pra validar o fluxo end-to-end
8. ✅ Confirmar que webhook chegou, gerou PDF, mandou email
9. ✅ Marcar site como 100% PRONTO para vendas reais

---

## ❓ FAQ

### Quanto custa o MP cobrar?

| Método | Tempo recebimento | Taxa |
|---|---|---|
| **PIX** | Imediato | **0,99%** |
| **Cartão crédito (à vista)** | 14 dias | **4,98%** + R$ 0,39 |
| **Cartão crédito (parcelado)** | 30 dias | **5,31%** a 6,30% por parcela |
| **Cartão débito** | 14 dias | 1,99% + R$ 0,39 |
| **Boleto** | 1–3 dias úteis | R$ 3,49 fixo |

> 💡 **Estratégia pra LNB:** incentivar PIX (taxa menor, dinheiro imediato). Cartão como conveniência. Boleto opcional.

### Posso receber em conta de outro banco?

Sim. Configure o saque automático na Etapa 10. MP transfere via TED/Pix pra conta cadastrada em até 1 dia útil. Sem custo adicional.

### Quanto tempo demora a validação?

- **Email + telefone:** instantâneo
- **CNPJ:** geralmente 24h
- **Documentos de identidade:** 24–72h
- **Liberação completa de PIX:** geralmente até 24h após documentos aprovados

### Posso testar antes de ativar valores grandes?

Sim. Recomendo fazer 1–2 pagamentos de **R$ 19,99 via PIX** (você mesmo paga). Se cair OK, o sistema está validado.

### E se o MP recusar a conta?

Raro, mas pode acontecer se:
- CNPJ está com pendência fiscal
- Documentos enviados estão ilegíveis
- Atividade da empresa cai em "lista cinza" (a LNB pode cair, pois "limpeza de nome" é categoria sensível)

**Se acontecer:** MP envia email explicando. Aí podemos:
1. Reenviar documentos melhores
2. Contestar abrindo chamado em https://www.mercadopago.com.br/ajuda
3. Como alternativa: ativar **Asaas** ou **Pagar.me** como gateway alternativo (eu integro no site)

---

## 📞 Suporte MP

- **Telefone:** 0800 643 4444 (gratuito, 8h–22h dias úteis)
- **Chat:** https://www.mercadopago.com.br/ajuda
- **Email:** suporte@mercadopago.com

Se travar em qualquer etapa, abre chamado e me avisa pra acompanhar.

---

## 🎯 Resumo executivo (TL;DR)

```
1. Criar/validar conta MP empresa (CNPJ LNB)         15 min
2. Enviar documentos pra validação                    20 min
3. Aguardar análise MP                               24–72h
4. Cadastrar chave PIX + ativar como meio recebimento  8 min
5. Criar App no painel desenvolvedor                  10 min
6. Configurar Webhook + Back URLs                      7 min
7. Mandar os 3 valores (token + webhook secret + ok)
8. Eu atualizo Vercel e validamos                      2 min
```

**Após isso, site aceita PIX/Cartão/Boleto pra clientes reais. ✅**
