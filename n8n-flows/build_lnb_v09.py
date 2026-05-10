#!/usr/bin/env python3
"""
Multi Agentes LNB v09 — Clone-and-Adapt do v06

Estratégia:
1. Carrega v06 como base (preserva 70% do trabalho — debounce, áudio/imagem, anti-spam)
2. Remove lixo (~25 nós): disabled, Valida FIPE, MCP Client, dev artifacts, duplicados
3. Reconecta órfãos: 7 tools, 5 Configs Kanban, Memory Long, Memory Short, models
4. Adiciona nodes novos: Sync Conversation, Check IA Pause, pausa_ia tool
5. Reescreve prompts Maia + Memory Long 100% pra LNB (sem placa/vistoria/FIPE)
6. Atualiza URLs tools pra https://limpanomebrazil.com.br/api/n8n/*
7. Corrige Webhook5 path pra 6ef87fae-...
8. Garante onError continueRegularOutput em todos críticos
"""
import json
import copy
from pathlib import Path

BASE = Path("/Users/lucascassiano/Downloads/Multi Agentes LNB v06.json")
OUT = Path("/Users/lucascassiano/Downloads/Multi Agentes LNB v09.json")

LNB_BASE_URL = "https://limpanomebrazil.com.br"
GEMINI_CRED_ID = "YMZPVHkbJQW9giMq"
GEMINI_CRED_NAME = "LNB Limpa Nome"
SUPABASE_CRED_ID = "OXGFVzeBXWTyLQWp"
SUPABASE_CRED_NAME = "Oficial Account"
REDIS_CRED_ID = "p5McU43k3cRAmUXI"
REDIS_CRED_NAME = "Redistest"
WEBHOOK_PATH = "6ef87fae-3202-4562-abe3-f1386d6d2bc5"
ACCOUNT_ID = "11"
INBOX_ID = "12"
FUNNEL_ID = "1"

# ============================================================
# 1. Carrega v06
# ============================================================
print(f"📂 Carregando {BASE.name}...")
with open(BASE) as f:
    wf = json.load(f)

print(f"   Início: {len(wf['nodes'])} nós, {len(wf.get('connections', {}))} conexões")

# ============================================================
# 2. Lixo a deletar (lista exaustiva)
# ============================================================
NODES_TO_DELETE = {
    # Disabled / Evolution legado
    "Evolution API - HTTP Request3",
    "Evolution API - HTTP Request2",
    "OpenAI", "OpenAI1",
    "Message a model", "Message a model1", "Message a model2",
    "Memory Long",  # disabled, ficou Memory Long1
    "Enviar texto a whatsapp",
    # SPV residue
    "Valida FIPE",
    "Switch20",
    # Dev artifact
    "Abrir Conversa [TESTE]",
    # Órfão
    "MCP Client",
    # Loop/Limit/Split inúteis pro fluxo
    "Loop Over Items",
    "Limit",
    "Split Out",
    # DELETE Redis duplicados (manter apenas 3 conjuntos pro cleanup)
    "DELETE ChatMemory2",
    "DELETE Cachemensage2",
    "DELETE Traplist3",
    "DELETE ChatMemory3",
    "DELETE Cachemensage3",
    "DELETE Traplist4",
    # Models duplicados (manter Gemini Chat Model + 1 backup)
    "OpenAI Chat Model2",
    "OpenAI Chat Model3",
    "OpenAI Chat Model6",
    # FollowUp Reset (vamos manter follow-ups pelo painel cron, simplifica fluxo)
    "Reset FollowUp",
    "Sticky Note - FollowUp",
    "If - Servico Preenchido",
    # Atribuir vendedora SPV-specific
    "Atribuir Conversa Vendedora",
    "Abrir Conversa Transferida",
    "Se Transferiu",
    # Supabase queries SPV
    "Supabase",  # query SPV_Base
    "Supabase1",
    "Buscar supabase",  # tool órfã
    # Configs Kanban antigos vão ser reconstruídos
    # mas deixar os nomes — a limpeza prossegue
    # HTTP Request3 = URL SPV residual go.dosedegrowth.cloud
    "HTTP Request3",
    # AI Agent2 era Orquestrador SPV — vamos consolidar em AI Agent (Maia) único
    "AI Agent2",
    # Memory chain extra (Redis Memory Long2/3/4/5) — manter Redis Memory Long
    "Redis Memory Long2",
    "Redis Memory Long3",
    "Redis Memory Long4",
    "Redis Memory Long5",
    # Models extras Memory Long (Model - Unidades, Agendamento, Orçamento são SPV)
    "Model - Unidades",
    "Model - Unidades1",
    "Model - Agendamento",
    "Model - Agendamento1",
    "Model - Orçamento",
    "Model - Orçamento1",
    # TEXT/Switch1 etc (eram pós-processamento SPV)
    "TEXT",
    "Switch1",
    "Switch2",
    "Supabase4",
    "Supabase6",
    "Supabase7",
    "Supabase8",
    "Supabase9",
    "Supabase28",
    "Supabase29",
    # Criar item / Atualizar Kanban SPV (vamos usar API Painel via lead_status)
    "Criar item no Kanban e na Agenda6",
    "Atualizar item no Kanban2",
    # Wait1 + If5 órfãos
    "Wait1",
    "If5",
    "RemoveCliente",
    "RemoveFromTrapList",  # vamos manter só AddTrapList + BuscaTrapList1
    # Image base SPV (mantém só áudio + imagem principais)
    "SET IMAGE BASE",
    "Analyze document",
    "SET IMAGE MESSAGE1",
    "HTTP Request",  # SET IMAGE BASE chain
    # DELETE HISTORY1 (cleanup órfão)
    "DELETE HISTORY1",
    "Edit Fields",  # SET DEFAULT MESSAGE já consolida
    "Quebra o Vazio",  # SPV typing simulation
    "FimFluxo1",  # mantém só FimFluxo
    "Chat Memory Manager",  # vamos usar Memory Short direto
}

# Remove nodes
nodes_kept = [n for n in wf["nodes"] if n["name"] not in NODES_TO_DELETE]
deleted_count = len(wf["nodes"]) - len(nodes_kept)
print(f"   ❌ Deletados: {deleted_count} nós")
wf["nodes"] = nodes_kept

# Remove conexões que apontam pra nós deletados
def clean_conns(conns: dict) -> dict:
    cleaned = {}
    for src, types in conns.items():
        if src in NODES_TO_DELETE:
            continue
        new_types = {}
        for tname, arrs in types.items():
            new_arrs = []
            for arr in arrs:
                new_arr = [c for c in arr if c.get("node") not in NODES_TO_DELETE]
                if new_arr:
                    new_arrs.append(new_arr)
            if new_arrs:
                new_types[tname] = new_arrs
        if new_types:
            cleaned[src] = new_types
    return cleaned

wf["connections"] = clean_conns(wf.get("connections", {}))

# ============================================================
# 3. Helpers pra encontrar/modificar nós
# ============================================================
def find(name: str):
    for n in wf["nodes"]:
        if n["name"] == name:
            return n
    return None

def add_or_replace(node):
    existing = find(node["name"])
    if existing:
        wf["nodes"].remove(existing)
    wf["nodes"].append(node)

def add_conn(src, dst, src_type="main", src_idx=0, dst_idx=0):
    if src not in wf["connections"]:
        wf["connections"][src] = {}
    if src_type not in wf["connections"][src]:
        wf["connections"][src][src_type] = []
    while len(wf["connections"][src][src_type]) <= src_idx:
        wf["connections"][src][src_type].append([])
    wf["connections"][src][src_type][src_idx].append({
        "node": dst,
        "type": "main" if src_type == "main" else src_type,
        "index": dst_idx,
    })

def add_ai_conn(src, dst, ai_type, dst_idx=0):
    """Conecta tool/memory/model ao AI Agent"""
    if src not in wf["connections"]:
        wf["connections"][src] = {}
    if ai_type not in wf["connections"][src]:
        wf["connections"][src][ai_type] = []
    if not wf["connections"][src][ai_type]:
        wf["connections"][src][ai_type].append([])
    wf["connections"][src][ai_type][0].append({
        "node": dst,
        "type": ai_type,
        "index": dst_idx,
    })

# ============================================================
# 4. Webhook5 — corrigir path
# ============================================================
wh5 = find("Webhook5")
if wh5:
    wh5["parameters"]["path"] = WEBHOOK_PATH
    wh5["parameters"]["httpMethod"] = "POST"
    wh5.setdefault("parameters", {})["responseMode"] = "responseNode"
    print(f"   ✅ Webhook5 path = {WEBHOOK_PATH}")

# ============================================================
# 5. SetFieldsBasic — campos Chatwoot LNB
# ============================================================
sfb = find("SetFieldsBasic")
if sfb:
    sfb["parameters"] = {
        "mode": "manual",
        "duplicateItem": False,
        "assignments": {
            "assignments": [
                {"id": "1", "name": "Link do chatwoot", "value": "https://dosedegrowthcrm.com.br", "type": "string"},
                {"id": "2", "name": "Acoount ID", "value": ACCOUNT_ID, "type": "string"},
                {"id": "3", "name": "Conta do Chatwoot", "value": ACCOUNT_ID, "type": "string"},
                {"id": "4", "name": "Token Chatwoot", "value": "={{ $env.CHATWOOT_TOKEN }}", "type": "string"},
                {"id": "5", "name": "Token Admin Chatwoot", "value": "={{ $env.CHATWOOT_ADMIN_TOKEN }}", "type": "string"},
                {"id": "6", "name": "ConversationID", "value": "={{ $('Webhook5').item.json.body.conversation.id }}", "type": "string"},
                {"id": "7", "name": "ContactID", "value": "={{ $('Webhook5').item.json.body.sender.id }}", "type": "string"},
                {"id": "8", "name": "Telefone", "value": "={{ ($('Webhook5').item.json.body.sender.phone_number || '').replace(/\\D/g, '') }}", "type": "string"},
                {"id": "9", "name": "Nome", "value": "={{ $('Webhook5').item.json.body.sender.name }}", "type": "string"},
                {"id": "10", "name": "InboxID", "value": INBOX_ID, "type": "string"},
                {"id": "11", "name": "FunilID", "value": FUNNEL_ID, "type": "string"},
                {"id": "12", "name": "Email", "value": "={{ $('Webhook5').item.json.body.sender.email || '' }}", "type": "string"},
                {"id": "13", "name": "Mensagem", "value": "={{ $('Webhook5').item.json.body.content || '' }}", "type": "string"},
                {"id": "14", "name": "MessageType", "value": "={{ $('Webhook5').item.json.body.message_type }}", "type": "string"},
                {"id": "15", "name": "AttachmentType", "value": "={{ $('Webhook5').item.json.body.attachments?.[0]?.file_type || 'text' }}", "type": "string"},
            ]
        },
        "options": {},
    }
    print("   ✅ SetFieldsBasic atualizado (15 campos LNB)")

# ============================================================
# 6. If2 — filtra inbox 12
# ============================================================
if2 = find("If2")
if if2:
    if2["parameters"] = {
        "conditions": {
            "options": {"caseSensitive": True, "leftValue": "", "typeValidation": "strict"},
            "conditions": [
                {
                    "id": "filter-inbox",
                    "leftValue": "={{ $json.body.inbox.id }}",
                    "rightValue": int(INBOX_ID),
                    "operator": {"type": "number", "operation": "equals"},
                }
            ],
            "combinator": "and",
        },
        "options": {},
    }
    print(f"   ✅ If2 filtra inbox.id == {INBOX_ID}")

# ============================================================
# 7. FromMe-Switch — incoming only
# ============================================================
fm = find("FromMe-Switch")
if fm:
    fm["parameters"] = {
        "rules": {
            "values": [
                {
                    "outputKey": "incoming",
                    "conditions": {
                        "options": {"caseSensitive": True, "leftValue": "", "typeValidation": "strict"},
                        "conditions": [
                            {
                                "id": "is-incoming",
                                "leftValue": "={{ $('SetFieldsBasic').item.json.MessageType }}",
                                "rightValue": "incoming",
                                "operator": {"type": "string", "operation": "equals"},
                            }
                        ],
                        "combinator": "and",
                    },
                    "renameOutput": True,
                }
            ]
        },
        "options": {"fallbackOutput": "extra"},
    }
    print("   ✅ FromMe-Switch: incoming only")

# ============================================================
# 8. Mover Lead (Auto) — usa lead-status do painel LNB
# ============================================================
mover = find("Mover Lead (Auto)")
if mover:
    mover["parameters"] = {
        "method": "POST",
        "url": f"{LNB_BASE_URL}/api/n8n/lead-status",
        "sendHeaders": True,
        "headerParameters": {
            "parameters": [
                {"name": "Authorization", "value": "=Bearer {{ $env.N8N_SHARED_TOKEN }}"},
                {"name": "Content-Type", "value": "application/json"},
            ]
        },
        "sendBody": True,
        "specifyBody": "json",
        "jsonBody": "={\n  \"telefone\": \"{{ $('SetFieldsBasic').item.json.Telefone }}\",\n  \"stage\": \"Lead\",\n  \"nome\": \"{{ $('SetFieldsBasic').item.json.Nome }}\",\n  \"email\": \"{{ $('SetFieldsBasic').item.json.Email }}\",\n  \"conversation_id\": {{ $('SetFieldsBasic').item.json.ConversationID }}\n}",
        "options": {},
    }
    mover["onError"] = "continueRegularOutput"
    print("   ✅ Mover Lead Auto → lead-status LNB")

# ============================================================
# 9. NOVO: Sync Conversation Painel (logo após SetFieldsBasic)
# ============================================================
sync_conv = {
    "name": "Sync Conversation Painel",
    "type": "n8n-nodes-base.httpRequest",
    "typeVersion": 4.2,
    "position": [-1100, 200],
    "parameters": {
        "method": "POST",
        "url": f"{LNB_BASE_URL}/api/n8n/sync-conversation",
        "sendHeaders": True,
        "headerParameters": {
            "parameters": [
                {"name": "Authorization", "value": "=Bearer {{ $env.N8N_SHARED_TOKEN }}"},
                {"name": "Content-Type", "value": "application/json"},
            ]
        },
        "sendBody": True,
        "specifyBody": "json",
        "jsonBody": "={\n  \"telefone\": \"{{ $('SetFieldsBasic').item.json.Telefone }}\",\n  \"conversation_id\": {{ $('SetFieldsBasic').item.json.ConversationID }},\n  \"content\": \"{{ ($('SetFieldsBasic').item.json.Mensagem || '').replace(/\"/g,'\\\\\"').slice(0,500) }}\",\n  \"message_type\": \"{{ $('SetFieldsBasic').item.json.MessageType }}\",\n  \"attachment_type\": \"{{ $('SetFieldsBasic').item.json.AttachmentType }}\"\n}",
        "options": {},
    },
    "onError": "continueRegularOutput",
}
add_or_replace(sync_conv)
print("   ✅ NOVO: Sync Conversation Painel")

# ============================================================
# 10. NOVO: Check IA Pause (antes de processar Maia)
# ============================================================
check_pause = {
    "name": "Check IA Pause",
    "type": "n8n-nodes-base.httpRequest",
    "typeVersion": 4.2,
    "position": [-700, 200],
    "parameters": {
        "method": "POST",
        "url": f"{LNB_BASE_URL}/api/n8n/check-ia-pause",
        "sendHeaders": True,
        "headerParameters": {
            "parameters": [
                {"name": "Authorization", "value": "=Bearer {{ $env.N8N_SHARED_TOKEN }}"},
                {"name": "Content-Type", "value": "application/json"},
            ]
        },
        "sendBody": True,
        "specifyBody": "json",
        "jsonBody": "={\n  \"telefone\": \"{{ $('SetFieldsBasic').item.json.Telefone }}\"\n}",
        "options": {},
    },
    "onError": "continueRegularOutput",
}
add_or_replace(check_pause)

ia_pausada_if = {
    "name": "IA Está Pausada?",
    "type": "n8n-nodes-base.if",
    "typeVersion": 2.2,
    "position": [-500, 200],
    "parameters": {
        "conditions": {
            "options": {"caseSensitive": True, "leftValue": "", "typeValidation": "strict"},
            "conditions": [
                {
                    "id": "is-paused",
                    "leftValue": "={{ $json.pausada }}",
                    "rightValue": True,
                    "operator": {"type": "boolean", "operation": "true", "singleValue": True},
                }
            ],
            "combinator": "and",
        },
        "options": {},
    },
    "onError": "continueRegularOutput",
}
add_or_replace(ia_pausada_if)
print("   ✅ NOVOS: Check IA Pause + IA Está Pausada?")

# ============================================================
# 11. Tools LNB — atualiza URLs e configs (HTTPRequestTool)
# ============================================================
tools_config = {
    "lead_status": {
        "url": f"{LNB_BASE_URL}/api/n8n/lead-status",
        "description": "Move o cliente entre stages do funil LNB e atualiza CRM. Use quando: cliente engajou (Interessado), aceitou pagar (Qualificado), pagou (Fechado), desistiu/sumiu (Perdido). Use 'Lead' apenas se quiser garantir stage inicial.",
        "params": [
            ("telefone", "string", "Número do cliente sem formatação, ex: 5511997440101"),
            ("stage", "string", "Lead, Interessado, Qualificado, Fechado ou Perdido"),
            ("nome", "string", "Nome completo do cliente"),
            ("cpf", "string", "CPF do cliente apenas números (11 dígitos)"),
            ("email", "string", "Email do cliente"),
            ("valor_servico", "string", "Valor formatado do serviço, ex: R$ 19,99"),
            ("tipo_servico", "string", "consulta, limpeza_desconto ou blindagem"),
            ("conversation_id", "number", "ID da conversa Chatwoot"),
        ],
    },
    "gerar_cobranca_consulta": {
        "url": f"{LNB_BASE_URL}/api/n8n/criar-checkout",
        "description": "Gera link de pagamento no Mercado Pago da CONSULTA CPF (R$ 19,99). Use quando o cliente aceitar fazer a consulta. Cliente DEVE ter passado nome, CPF e telefone antes.",
        "params": [
            ("telefone", "string", "Número do cliente sem formatação"),
            ("cpf", "string", "CPF apenas números"),
            ("nome", "string", "Nome completo do cliente"),
            ("email", "string", "Email do cliente"),
            ("tipo", "string", "Sempre o valor literal: consulta"),
        ],
        "fixed": {"tipo": "consulta"},
    },
    "gerar_cobranca_limpeza": {
        "url": f"{LNB_BASE_URL}/api/n8n/criar-checkout",
        "description": "Gera link de pagamento da LIMPEZA + Blindagem 12m (R$ 480,01 com desconto). USE APENAS APÓS o cliente ter pago a consulta E o resultado mostrou pendências. Cliente NUNCA pode pagar limpeza sem consulta paga com pendência.",
        "params": [
            ("telefone", "string", "Número do cliente"),
            ("cpf", "string", "CPF apenas números"),
            ("nome", "string", "Nome completo"),
            ("email", "string", "Email"),
            ("tipo", "string", "Sempre o valor literal: limpeza_desconto"),
        ],
        "fixed": {"tipo": "limpeza_desconto"},
    },
    "blindagem_cadastro": {
        "url": f"{LNB_BASE_URL}/api/n8n/blindagem-cadastro",
        "description": "Cadastra o CPF no serviço de Blindagem mensal (R$ 29,90/mês). Use APENAS quando consulta mostrou nome LIMPO E cliente aceitou contratar blindagem. Não use se cliente tem pendências.",
        "params": [
            ("telefone", "string", "Telefone do cliente"),
            ("cpf", "string", "CPF apenas números"),
            ("nome", "string", "Nome completo"),
            ("email", "string", "Email"),
            ("plano", "string", "mensal ou anual"),
        ],
    },
    "memory_long": {
        "url": f"{LNB_BASE_URL}/api/n8n/memory-long",
        "description": "Atualiza memória longa estruturada do cliente. Use ao final de cada interação importante pra registrar: dados pessoais, status pagamento, score, pendências, etapa do funil, observações. Use markdown.",
        "params": [
            ("telefone", "string", "Telefone do cliente"),
            ("memoria", "string", "Markdown completo com dados estruturados do lead"),
        ],
    },
    "aplicar_label": {
        "url": f"{LNB_BASE_URL}/api/n8n/aplicar-label",
        "description": "Aplica labels (etiquetas) na conversa. Use quando: cliente aceitou consulta (interessado_consulta), pagou (pago_consulta), resultado da consulta (consulta_resultado_com_pendencia/sem_pendencia), etc.",
        "params": [
            ("telefone", "string", "Telefone do cliente"),
            ("contexto", "string", "interessado_consulta, pago_consulta, consulta_resultado_com_pendencia, consulta_resultado_sem_pendencia, interessado_limpeza, pago_limpeza, interessado_blindagem, pago_blindagem, conflito, vip"),
            ("score", "number", "Score de crédito (opcional, pra labels score-bom/regular/baixo)"),
            ("conversation_id", "number", "ID da conversa Chatwoot"),
        ],
    },
    "status_processo": {
        "url": f"{LNB_BASE_URL}/api/n8n/status-processo",
        "description": "Consulta status do processo do cliente (consulta paga? limpeza em andamento? etapa?). Use quando cliente perguntar 'tá pronto?', 'como está?', 'já foi feito?'. Retorna texto resumo pronto pra usar na resposta.",
        "params": [
            ("telefone", "string", "Telefone do cliente"),
            ("cpf", "string", "CPF apenas números (alternativa ao telefone)"),
        ],
    },
    "pausa_ia": {
        "url": f"{LNB_BASE_URL}/api/n8n/pause-ia",
        "description": "Pausa a IA pra essa conversa — handoff para humano. Use quando cliente pedir explicitamente falar com humano/atendente, ou em caso de conflito grave que você não consegue resolver.",
        "params": [
            ("telefone", "string", "Telefone do cliente"),
            ("conversation_id", "number", "ID da conversa Chatwoot"),
            ("motivo", "string", "cliente_pediu_humano, conflito ou outro"),
        ],
    },
}

def make_tool(name, cfg):
    body_params = []
    for pname, ptype, pdesc in cfg["params"]:
        if "fixed" in cfg and pname in cfg["fixed"]:
            body_params.append({
                "name": pname,
                "value": cfg["fixed"][pname],
            })
        else:
            from_ai = f'={{ $fromAI("{pname}", "{pdesc}", "{ptype}") }}'
            body_params.append({
                "name": pname,
                "value": from_ai,
            })

    return {
        "name": name,
        "type": "n8n-nodes-base.httpRequestTool",
        "typeVersion": 4.2,
        "position": [400 + (list(tools_config.keys()).index(name) * 120), 1200],
        "parameters": {
            "toolDescription": cfg["description"],
            "method": "POST",
            "url": cfg["url"],
            "sendHeaders": True,
            "headerParameters": {
                "parameters": [
                    {"name": "Authorization", "value": "=Bearer {{ $env.N8N_SHARED_TOKEN }}"},
                    {"name": "Content-Type", "value": "application/json"},
                ]
            },
            "sendBody": True,
            "bodyParameters": {
                "parameters": body_params,
            },
            "options": {},
        },
        "onError": "continueRegularOutput",
    }

for tname, tcfg in tools_config.items():
    add_or_replace(make_tool(tname, tcfg))
print(f"   ✅ {len(tools_config)} tools LNB configuradas")

# ============================================================
# 12. AI Agent (Maia) — prompt completo LNB
# ============================================================
MAIA_PROMPT = """# Você é Maia, atendente virtual da Limpa Nome Brazil (LNB)

## QUEM VOCÊ É
- Maia, atendente da LNB. Empática, profissional, brasileira.
- Trabalha com WhatsApp, atende clientes que querem limpar o nome.
- Comunica de forma humana, sem mencionar "atendimento automático" ou "IA".

## O QUE A LNB OFERECE (3 produtos)
1. **Consulta CPF** — R$ 19,99 (gateway obrigatório, primeiro passo SEMPRE)
   - Relatório completo: score, pendências, credores, valores
   - Email com PDF detalhado
2. **Limpeza + Blindagem 12m** — R$ 480,01 (com desconto da consulta)
   - Remove negativações do CPF SEM precisar quitar dívida
   - Até 20 dias úteis
   - Inclui Blindagem 12 meses
3. **Blindagem mensal** — R$ 29,90/mês
   - Monitoramento contínuo do CPF
   - Apenas pra quem JÁ tem nome limpo

## REGRA DE OURO (NUNCA QUEBRAR)
**Cliente NUNCA contrata Limpeza sem ter pago Consulta E ter pendência confirmada.**
Se ele pedir limpeza direto, você OBRIGATORIAMENTE oferece consulta primeiro.

## FLUXO DE ATENDIMENTO

### PASSO 1 — Saudação (1ª mensagem do cliente)
> Oii, tudo bem? Sou a *Maia* da *Limpa Nome Brazil*!
>
> Aqui na LNB ajudamos pessoas a limpar o nome, resolver pendências e proteger o CPF. Tudo 100% digital e seguro.
>
> Para eu verificar a situação do seu CPF, preciso de algumas informações:
> *Nome completo*
> *CPF*
> *Data de nascimento*
> *E-mail*
>
> Pode me passar?

→ Chame tool `lead_status` com stage="Lead"

### PASSO 2 — Coletar 4 dados
Cliente envia. Confirme com empatia e pergunte motivo.
→ Chame `lead_status` com stage="Interessado"
→ Chame `aplicar_label` contexto="interessado_consulta"

### PASSO 3 — Oferta consulta R$ 19,99
Explique:
- Consulta nos órgãos oficiais (Serasa, SPC, Boa Vista)
- Score, pendências, credores, valores
- PDF por email
- Se fechar limpeza, R$ 19,99 vira desconto

### PASSO 4 — Cliente aceitou consulta
→ Chame `gerar_cobranca_consulta`
→ Envie o link recebido (campo init_point)
→ Chame `lead_status` com stage="Qualificado", valor_servico="R$ 19,99", tipo_servico="consulta"

Mensagem:
> Segue o link para pagamento da consulta:
> {link}
>
> Assim que o pagamento for confirmado no sistema, já faço a consulta e envio o relatório completo pro seu email!

### PASSO 5 — Pagamento confirmado (vem automático via webhook MP)
Se cliente perguntar status, use `status_processo`.

### PASSO 6A — TEM pendência (consulta retornou negativação)
Explique: limpeza R$ 480,01 SEM quitar dívida + blindagem incluída.
Se cliente aceitar:
→ Chame `gerar_cobranca_limpeza`
→ Envie link
→ Chame `lead_status` stage="Qualificado", valor_servico="R$ 480,01", tipo_servico="limpeza_desconto"
→ Chame `aplicar_label` contexto="interessado_limpeza"

### PASSO 6B — NÃO tem pendência (nome limpo)
Parabenize. Ofereça blindagem mensal R$ 29,90/mês.
Se cliente aceitar:
→ Chame `blindagem_cadastro` plano="mensal"
→ Chame `aplicar_label` contexto="interessado_blindagem"

### PASSO 7 — Pagamento limpeza confirmado
→ Chame `lead_status` stage="Fechado"
→ Envie orientações pós-venda completas:
  - Consultor entra em contato em horas
  - Painel de acompanhamento
  - Até 20 dias úteis
  - Documento de confirmação no final
  - Blindagem ativa após limpeza

## REGRAS CRÍTICAS

### NUNCA:
- Falar de outros produtos da Dose de Growth — você é APENAS LNB (consulta CPF, limpeza de nome, blindagem mensal)
- Dizer que precisa quitar a dívida (a LNB remove negativação SEM quitar)
- Oferecer desconto além dos R$ 19,99 já estabelecidos
- Aceitar pagamento sem confirmar via tool
- Repetir saudação se já houve conversa anterior
- Mencionar IDs internos, tools ou processos técnicos

### SEMPRE:
- Use *asteriscos únicos* pra destacar (formato WhatsApp)
- Mensagens entre 200-500 caracteres (curtas, diretas)
- Termine com pergunta pra próximo passo
- Demonstre empatia com situação do cliente
- Mencione Blindagem como benefício INCLUÍDO na limpeza
- Se cliente em conflito grave: chame `pausa_ia` motivo="conflito" e diga que vai chamar atendente humano

## QUEBRA DE OBJEÇÕES

| Objeção | Resposta |
|---|---|
| "É caro" | Compare custo de ficar com nome sujo: juros, financiamentos negados, etc |
| "Preciso pagar a dívida?" | NÃO. LNB remove negativação SEM quitar |
| "Demora?" | Até 20 dias úteis com acompanhamento |
| "É seguro?" | +10 mil nomes limpos, 100% digital, contrato digital |
| "Como acompanho?" | Painel online + atualizações WhatsApp e email |
| "Volta a sujar?" | Blindagem inclusa monitora e alerta |

## TOOLS DISPONÍVEIS

| Tool | Quando |
|---|---|
| `lead_status` | Move stage funil (Lead/Interessado/Qualificado/Fechado/Perdido) |
| `gerar_cobranca_consulta` | Cliente aceitou consulta R$ 19,99 |
| `gerar_cobranca_limpeza` | Cliente aceitou limpeza R$ 480,01 (após consulta paga c/ pendência) |
| `blindagem_cadastro` | Cliente aceitou blindagem R$ 29,90/mês |
| `memory_long` | Atualiza memória estruturada (final de cada interação importante) |
| `aplicar_label` | Marca etiqueta no Chatwoot |
| `status_processo` | Cliente pergunta "tá pronto?", "como está?" |
| `pausa_ia` | Cliente pede humano OU conflito grave |

## DADOS DO CLIENTE NA CONVERSA ATUAL
- Telefone: {{ $('SetFieldsBasic').item.json.Telefone }}
- Conversation ID: {{ $('SetFieldsBasic').item.json.ConversationID }}
- Nome (do Chatwoot): {{ $('SetFieldsBasic').item.json.Nome }}

Use esses valores nas tools.
"""

ai_agent = find("AI Agent")
if ai_agent:
    ai_agent["parameters"] = {
        "promptType": "define",
        "text": "={{ $('AgruparMSGs').item.json.messages || $('SetFieldsBasic').item.json.Mensagem }}",
        "options": {
            "systemMessage": MAIA_PROMPT,
        },
    }
    ai_agent["onError"] = "continueRegularOutput"
    print("   ✅ Maia (AI Agent) prompt LNB completo")

# ============================================================
# 13. Memory Long1 — prompt LNB
# ============================================================
MEMORY_LONG_PROMPT = """# Memory Long Agent — LNB

Você analisa as últimas mensagens entre Maia e o cliente e produz um markdown estruturado com TODOS os dados conhecidos do lead.

## FORMATO OBRIGATÓRIO

```markdown
# Lead {{ $('SetFieldsBasic').item.json.Telefone }}
**Última atualização:** {{ $now.toISO() }}

## Dados pessoais
- **Nome completo:** ?
- **CPF:** ?
- **Data de nascimento:** ?
- **Email:** ?
- **Telefone:** {{ $('SetFieldsBasic').item.json.Telefone }}

## Status do funil
- **Etapa atual:** ? (Lead/Interessado/Qualificado/Fechado/Perdido)
- **Último serviço ofertado:** ? (consulta/limpeza/blindagem)
- **Valor ofertado:** ?

## Consulta CPF
- **Status pagamento consulta:** ? (não pagou/pagou)
- **Tem pendência:** ? (sim/não/desconhecido)
- **Score crédito:** ?
- **Quantidade pendências:** ?
- **Valor total dívidas:** ?
- **Credores principais:** ?

## Limpeza
- **Status pagamento limpeza:** ?
- **Link pagamento limpeza:** ?
- **Em andamento:** ?

## Blindagem
- **Blindagem ativa:** ? (sim/não)
- **Plano:** ? (mensal/anual)

## Observações
- ?
```

Preencha apenas o que sabe das mensagens. Use "?" pro que não sabe.
NUNCA mencione placa, vistoria, FIPE — não é desse produto.

Output: APENAS o markdown, sem comentários adicionais.
"""

ml1 = find("Memory Long1")
if ml1:
    ml1["parameters"] = {
        "promptType": "define",
        "text": "={{ $('AgruparMSGs').item.json.messages || $('SetFieldsBasic').item.json.Mensagem }}",
        "options": {
            "systemMessage": MEMORY_LONG_PROMPT,
        },
    }
    ml1["onError"] = "continueRegularOutput"
    print("   ✅ Memory Long1 prompt LNB")

# ============================================================
# 14. Configs Kanban (5 stages) — recriar limpos
# ============================================================
def make_config_kanban(name, stage):
    return {
        "name": name,
        "type": "n8n-nodes-base.set",
        "typeVersion": 3.4,
        "position": [800 + (["lead", "interessado", "qualificado", "fechado", "perdido"].index(stage) * 200), 1500],
        "parameters": {
            "mode": "manual",
            "duplicateItem": False,
            "assignments": {
                "assignments": [
                    {"id": "1", "name": "Acoount ID", "value": ACCOUNT_ID, "type": "string"},
                    {"id": "2", "name": "Conta do Chatwoot", "value": ACCOUNT_ID, "type": "string"},
                    {"id": "3", "name": "FunilID", "value": FUNNEL_ID, "type": "string"},
                    {"id": "4", "name": "Stage", "value": stage, "type": "string"},
                    {"id": "5", "name": "StageNome", "value": stage.capitalize(), "type": "string"},
                ]
            },
            "options": {},
        },
    }

for stage_name, stage_key in [("ConfigLead", "lead"), ("ConfigInteressado", "interessado"),
                                ("ConfigQualificado", "qualificado"), ("ConfigFechado", "fechado"),
                                ("ConfigPerdido", "perdido")]:
    add_or_replace(make_config_kanban(stage_name, stage_key))
print("   ✅ 5 Configs Kanban (com Acoount ID + Conta do Chatwoot)")

# ============================================================
# 15. Send to Chatwoot (Envia Texto)
# ============================================================
envia_texto = find("Envia Texto")
if envia_texto:
    envia_texto["parameters"] = {
        "method": "POST",
        "url": "={{ $('SetFieldsBasic').item.json['Link do chatwoot'] }}/api/v1/accounts/{{ $('SetFieldsBasic').item.json['Conta do Chatwoot'] }}/conversations/{{ $('SetFieldsBasic').item.json.ConversationID }}/messages",
        "sendHeaders": True,
        "headerParameters": {
            "parameters": [
                {"name": "api_access_token", "value": "={{ $('SetFieldsBasic').item.json['Token Chatwoot'] }}"},
                {"name": "Content-Type", "value": "application/json"},
            ]
        },
        "sendBody": True,
        "specifyBody": "json",
        "jsonBody": "={\n  \"content\": {{ JSON.stringify($json.output || $json.text || '') }},\n  \"message_type\": \"outgoing\",\n  \"private\": false\n}",
        "options": {"retry": {"maxTries": 3}},
    }
    envia_texto["onError"] = "continueRegularOutput"
    print("   ✅ Envia Texto Chatwoot (retry 3x)")

# ============================================================
# 16. Respond to Webhook — body fixo OK
# ============================================================
for n in wf["nodes"]:
    if n.get("type") == "n8n-nodes-base.respondToWebhook":
        n["parameters"] = {
            "respondWith": "json",
            "responseBody": "={\"status\":\"ok\"}",
            "options": {},
        }

# ============================================================
# 17. Garantir onError continueRegularOutput em nós críticos
# ============================================================
critical_types = (
    "n8n-nodes-base.httpRequest",
    "n8n-nodes-base.httpRequestTool",
    "n8n-nodes-base.redis",
    "n8n-nodes-base.supabase",
    "n8n-nodes-base.set",
    "n8n-nodes-base.if",
    "n8n-nodes-base.switch",
)
fixed_count = 0
for n in wf["nodes"]:
    if n.get("type") in critical_types:
        if n.get("onError") != "continueRegularOutput":
            n["onError"] = "continueRegularOutput"
            fixed_count += 1
print(f"   ✅ onError continueRegularOutput em {fixed_count} nós")

# ============================================================
# 18. Reconectar tools órfãs ao AI Agent (Maia)
# ============================================================
for tname in tools_config.keys():
    if find(tname):
        add_ai_conn(tname, "AI Agent", "ai_tool")

# Memory Short → AI Agent
if find("Memory Short"):
    add_ai_conn("Memory Short", "AI Agent", "ai_memory")

# Gemini model → AI Agent
google_models = [n["name"] for n in wf["nodes"] if n.get("type") == "@n8n/n8n-nodes-langchain.lmChatGoogleGemini"]
if "Google Gemini Chat Model" in google_models:
    add_ai_conn("Google Gemini Chat Model", "AI Agent", "ai_languageModel")
    # Garantir cred LNB
    gn = find("Google Gemini Chat Model")
    if gn:
        gn["credentials"] = {"googlePalmApi": {"id": GEMINI_CRED_ID, "name": GEMINI_CRED_NAME}}

# Memory Long1 (Agent paralelo) — também precisa de model próprio
if "OpenAI Chat Model1" in google_models:
    add_ai_conn("OpenAI Chat Model1", "Memory Long1", "ai_languageModel")
    n = find("OpenAI Chat Model1")
    if n:
        n["credentials"] = {"googlePalmApi": {"id": GEMINI_CRED_ID, "name": GEMINI_CRED_NAME}}

print("   ✅ Tools + Memory + Gemini conectados ao AI Agent")

# ============================================================
# 19. Reconstrói main path crítico
# ============================================================
# Limpa conexões existentes do main path pra reescrever
for src in ["Webhook5", "If2", "SetFieldsBasic", "Sync Conversation Painel",
            "Mover Lead (Auto)", "FromMe-Switch", "Check IA Pause", "IA Está Pausada?"]:
    if src in wf["connections"]:
        # mantém só ai_* conns
        wf["connections"][src] = {k: v for k, v in wf["connections"][src].items() if k.startswith("ai_")}

# Limpa também conexões dos nós intermediários (vamos reescrever cadeia debounce)
intermediate_nodes = [
    "GET TIMEOUT1", "If4", "BuscaTrapList1", "If1", "If",
    "SET DEFAULT MESSAGE", "RedisPushMsgs", "Wait", "ListaMsg-Redis",
    "Should Continue?", "AgruparMSGs", "RedisClearMSGs", "Redis6", "Config",
    "Redis Memory Long", "Redis3", "Tipo da Mensagem",
    "SET REPLIED MESSAGE", "SET EDITED MESSAGE",
    "SET AUDIO BASE64", "HTTP Request1", "SET AUDIO MESSAGE",
    "SET IMAGE BASE64", "HTTP Request2", "SET IMAGE MESSAGE",
    "AddTrapList", "STOP AND SET TIMEOUT1",
]
for src in intermediate_nodes:
    if src in wf["connections"]:
        wf["connections"][src] = {k: v for k, v in wf["connections"][src].items() if k.startswith("ai_")}

# === MAIN PATH ===
# Webhook5 → If2
add_conn("Webhook5", "If2")
# If2 [true] → SetFieldsBasic
add_conn("If2", "SetFieldsBasic", src_idx=0)
# SetFieldsBasic → Sync Conversation Painel
add_conn("SetFieldsBasic", "Sync Conversation Painel")
# Sync Conversation → Mover Lead Auto
add_conn("Sync Conversation Painel", "Mover Lead (Auto)")
# Mover Lead Auto → FromMe-Switch
add_conn("Mover Lead (Auto)", "FromMe-Switch")
# FromMe-Switch [incoming] → Check IA Pause
add_conn("FromMe-Switch", "Check IA Pause", src_idx=0)
# Check IA Pause → IA Está Pausada?
add_conn("Check IA Pause", "IA Está Pausada?")
# IA Está Pausada? [true] → FimFluxo silencioso
if find("FimFluxo"):
    add_conn("IA Está Pausada?", "FimFluxo", src_idx=0)
# IA Está Pausada? [false] → GET TIMEOUT1
if find("GET TIMEOUT1"):
    add_conn("IA Está Pausada?", "GET TIMEOUT1", src_idx=1)

# === Cadeia debounce/anti-spam ===
# GET TIMEOUT1 → If4
if find("If4"):
    add_conn("GET TIMEOUT1", "If4")
    # If4 [false=sem timeout, ok seguir] → STOP AND SET TIMEOUT1 → BuscaTrapList1
    if find("STOP AND SET TIMEOUT1") and find("BuscaTrapList1"):
        add_conn("If4", "STOP AND SET TIMEOUT1", src_idx=1)
        add_conn("STOP AND SET TIMEOUT1", "BuscaTrapList1")
    # If4 [true=tem timeout, encerra] → FimFluxo
    if find("FimFluxo"):
        add_conn("If4", "FimFluxo", src_idx=0)

# BuscaTrapList1 → If1 (existe?)
if find("BuscaTrapList1") and find("If1"):
    add_conn("BuscaTrapList1", "If1")
    # If1 [false=não está no trap, segue] → AddTrapList → Tipo da Mensagem
    if find("AddTrapList") and find("Tipo da Mensagem"):
        add_conn("If1", "AddTrapList", src_idx=1)
        add_conn("AddTrapList", "Tipo da Mensagem")
    # If1 [true=já está no trap, encerra] → FimFluxo
    if find("FimFluxo"):
        add_conn("If1", "FimFluxo", src_idx=0)

# Tipo da Mensagem outputs (4 branches: texto/áudio/imagem/replied)
if find("Tipo da Mensagem"):
    if find("SET DEFAULT MESSAGE"):
        add_conn("Tipo da Mensagem", "SET DEFAULT MESSAGE", src_idx=0)
    if find("SET AUDIO BASE64"):
        add_conn("Tipo da Mensagem", "SET AUDIO BASE64", src_idx=1)
    if find("SET IMAGE BASE64"):
        add_conn("Tipo da Mensagem", "SET IMAGE BASE64", src_idx=2)
    if find("SET REPLIED MESSAGE"):
        add_conn("Tipo da Mensagem", "SET REPLIED MESSAGE", src_idx=3)

# Áudio chain
if find("SET AUDIO BASE64") and find("HTTP Request1"):
    add_conn("SET AUDIO BASE64", "HTTP Request1")
if find("HTTP Request1") and find("SET AUDIO MESSAGE"):
    add_conn("HTTP Request1", "SET AUDIO MESSAGE")
if find("SET AUDIO MESSAGE") and find("RedisPushMsgs"):
    add_conn("SET AUDIO MESSAGE", "RedisPushMsgs")

# Imagem chain
if find("SET IMAGE BASE64") and find("HTTP Request2"):
    add_conn("SET IMAGE BASE64", "HTTP Request2")
if find("HTTP Request2") and find("SET IMAGE MESSAGE"):
    add_conn("HTTP Request2", "SET IMAGE MESSAGE")
if find("SET IMAGE MESSAGE") and find("RedisPushMsgs"):
    add_conn("SET IMAGE MESSAGE", "RedisPushMsgs")

# Texto + Replied chain
if find("SET DEFAULT MESSAGE") and find("RedisPushMsgs"):
    add_conn("SET DEFAULT MESSAGE", "RedisPushMsgs")
if find("SET REPLIED MESSAGE") and find("RedisPushMsgs"):
    add_conn("SET REPLIED MESSAGE", "RedisPushMsgs")

# Debounce 8s
if find("RedisPushMsgs") and find("Wait"):
    add_conn("RedisPushMsgs", "Wait")
if find("Wait") and find("ListaMsg-Redis"):
    add_conn("Wait", "ListaMsg-Redis")
if find("ListaMsg-Redis") and find("Should Continue?"):
    add_conn("ListaMsg-Redis", "Should Continue?")
if find("Should Continue?"):
    if find("AgruparMSGs"):
        add_conn("Should Continue?", "AgruparMSGs", src_idx=1)  # true=continua
    if find("FimFluxo"):
        add_conn("Should Continue?", "FimFluxo", src_idx=0)  # false=encerra (nova msg chegou)

if find("AgruparMSGs") and find("RedisClearMSGs"):
    add_conn("AgruparMSGs", "RedisClearMSGs")
if find("RedisClearMSGs") and find("AI Agent"):
    add_conn("RedisClearMSGs", "AI Agent")

# AI Agent → Envia Texto → Respond
if find("AI Agent") and find("Envia Texto"):
    if "AI Agent" in wf["connections"]:
        wf["connections"]["AI Agent"]["main"] = []
    add_conn("AI Agent", "Envia Texto")
    if find("Respond to Webhook"):
        if "Envia Texto" in wf["connections"]:
            wf["connections"]["Envia Texto"]["main"] = []
        add_conn("Envia Texto", "Respond to Webhook")

print("   ✅ Main path reconectado: Webhook→If2→SetFields→Sync→MoverLead→FromMe→CheckPause→...→AIAgent→Envia→Respond")

# ============================================================
# 20. Adicionar webhooks aux: lnb-pause-ia + lnb-start-ia
# ============================================================
def make_aux_webhook(name, path, action_url):
    return [
        {
            "name": f"{name} Webhook",
            "type": "n8n-nodes-base.webhook",
            "typeVersion": 2,
            "position": [-2200, 1500 + (0 if "pause" in path else 200)],
            "parameters": {
                "httpMethod": "POST",
                "path": path,
                "responseMode": "responseNode",
                "options": {},
            },
            "webhookId": f"lnb-{path}",
        },
        {
            "name": f"{name} Action",
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 4.2,
            "position": [-1900, 1500 + (0 if "pause" in path else 200)],
            "parameters": {
                "method": "POST",
                "url": action_url,
                "sendHeaders": True,
                "headerParameters": {
                    "parameters": [
                        {"name": "Authorization", "value": "=Bearer {{ $env.N8N_SHARED_TOKEN }}"},
                        {"name": "Content-Type", "value": "application/json"},
                    ]
                },
                "sendBody": True,
                "specifyBody": "json",
                "jsonBody": "={ \"telefone\": \"{{ $json.body.telefone }}\", \"conversation_id\": {{ $json.body.conversation_id || 'null' }} }",
                "options": {},
            },
            "onError": "continueRegularOutput",
        },
        {
            "name": f"{name} Respond",
            "type": "n8n-nodes-base.respondToWebhook",
            "typeVersion": 1.1,
            "position": [-1600, 1500 + (0 if "pause" in path else 200)],
            "parameters": {
                "respondWith": "json",
                "responseBody": "={\"status\":\"ok\"}",
                "options": {},
            },
        },
    ]

for name, path, url in [
    ("Pause IA", "lnb-pause-ia", f"{LNB_BASE_URL}/api/n8n/pause-ia"),
    ("Start IA", "lnb-start-ia", f"{LNB_BASE_URL}/api/n8n/start-ia"),
]:
    nodes_aux = make_aux_webhook(name, path, url)
    for n in nodes_aux:
        add_or_replace(n)
    add_conn(f"{name} Webhook", f"{name} Action")
    add_conn(f"{name} Action", f"{name} Respond")
print("   ✅ Webhooks aux: lnb-pause-ia + lnb-start-ia")

# ============================================================
# 21. Sticky Notes documentação (limpar antigas + criar novas)
# ============================================================
# Remove sticky notes antigas
wf["nodes"] = [n for n in wf["nodes"] if n.get("type") != "n8n-nodes-base.stickyNote"]

stickies = [
    {"name": "Note - Entrada", "content": "## 🟢 ENTRADA\n\nWebhook5 (path 6ef87fae-...) recebe payload do Chatwoot.\nIf2 filtra apenas inbox 12 (LNB WhatsApp).\nSetFieldsBasic centraliza 15 campos pra reuso.", "pos": [-2400, 100], "size": [400, 300]},
    {"name": "Note - Sync Painel", "content": "## 🔵 SYNC PAINEL LNB\n\nA cada msg, registra no painel:\n• last_interaction\n• audit log\n• liga conversation_id ao CRM\n\nTbm garante que cliente fique no stage Lead automático.", "pos": [-1100, 100], "size": [400, 300]},
    {"name": "Note - Pause IA", "content": "## ⏸️ HANDOFF HUMANO\n\nAntes de processar, checa se IA está pausada (cliente pediu humano OU equipe assumiu).\nSe pausada → encerra silenciosamente (humano vai responder).\n\nWebhooks aux:\n• /lnb-pause-ia\n• /lnb-start-ia", "pos": [-700, 100], "size": [400, 300]},
    {"name": "Note - Anti-spam", "content": "## 🛡️ ANTI-SPAM + DEBOUNCE\n\nGET TIMEOUT (60s) bloqueia processamento concorrente.\nTrap List (5s) bloqueia msg duplicada.\nDebounce 8s agrupa mensagens rápidas em uma única chamada à Maia.", "pos": [-200, 600], "size": [400, 280]},
    {"name": "Note - Tipo Msg", "content": "## 📨 TIPO DE MENSAGEM\n\nSwitch detecta texto/áudio/imagem.\n• Áudio: Gemini transcreve\n• Imagem: Gemini analisa\n• Texto: passa direto", "pos": [200, 100], "size": [400, 280]},
    {"name": "Note - Maia", "content": "## 🤖 MAIA (AI AGENT)\n\nGemini LNB cred + Memory Short Redis + 8 tools LNB + Think tool.\n\nPrompt completo pra venda:\n1. Saudação + 4 dados\n2. Empatia\n3. Consulta R$ 19,99\n4. Bifurcação tem/não tem pendência\n5. Limpeza R$ 480,01 OU Blindagem R$ 29,90\n6. Pós-venda completo", "pos": [400, 700], "size": [500, 400]},
    {"name": "Note - Tools", "content": "## 🔧 8 TOOLS LNB\n\nTodas → limpanomebrazil.com.br/api/n8n/*\nAuth: Bearer {{$env.N8N_SHARED_TOKEN}}\n\n• lead_status\n• gerar_cobranca_consulta\n• gerar_cobranca_limpeza\n• blindagem_cadastro\n• memory_long\n• aplicar_label\n• status_processo\n• pausa_ia (handoff)\n\nCada uma sincroniza Painel + Chatwoot.", "pos": [400, 1100], "size": [500, 380]},
    {"name": "Note - Kanban", "content": "## 📋 KANBAN (5 stages)\n\nFunil 'Limpeza de Nome' (id=1) Account 11.\n\nLead → Interessado → Qualificado → Fechado / Perdido\n\nCada Config tem AMBOS: 'Acoount ID' (typo) + 'Conta do Chatwoot' pra compat.", "pos": [800, 1400], "size": [500, 280]},
    {"name": "Note - Saída", "content": "## ✅ SAÍDA\n\nMaia gera resposta → Envia Texto Chatwoot (retry 3x) → Respond to Webhook 200 OK.\n\nDelete Redis cleanup chains pra liberar locks/cache.", "pos": [1300, 700], "size": [400, 280]},
    {"name": "Note - Sync Dupla", "content": "## ⚡ REGRA: SINCRONIA DUPLA\n\nTODA tool atualiza:\n• CHATWOOT (UI atendentes)\n• PAINEL LNB (Supabase persistente)\n\nEx: aplicar_label →\n  Chatwoot labels (visível na UI)\n  + LNB - CRM.labels_aplicadas[] (audit)", "pos": [-2400, 600], "size": [450, 320]},
]

for s in stickies:
    wf["nodes"].append({
        "name": s["name"],
        "type": "n8n-nodes-base.stickyNote",
        "typeVersion": 1,
        "position": s["pos"],
        "parameters": {
            "content": s["content"],
            "height": s["size"][1],
            "width": s["size"][0],
            "color": 6,
        },
    })
print(f"   ✅ {len(stickies)} sticky notes documentação")

# ============================================================
# 22. Renomear pausa a IA3 → mover pro tools_config
# ============================================================
# Já adicionamos 'pausa_ia' no tools_config, deletar o antigo se ainda existir
for old_name in ["pausa a IA3"]:
    if find(old_name):
        wf["nodes"] = [n for n in wf["nodes"] if n["name"] != old_name]
        if old_name in wf["connections"]:
            del wf["connections"][old_name]

# ============================================================
# 23. Settings finais
# ============================================================
wf["name"] = "Multi Agentes LNB v09"
wf["active"] = False  # importar inativo, ativar após auditoria
wf.setdefault("settings", {})["executionOrder"] = "v1"

# ============================================================
# 24. Salva
# ============================================================
with open(OUT, "w") as f:
    json.dump(wf, f, indent=2, ensure_ascii=False)

print(f"\n📦 SALVO: {OUT}")
print(f"   Nós: {len(wf['nodes'])}")
print(f"   Conexões: {len(wf['connections'])}")
print(f"   Tamanho: {OUT.stat().st_size // 1024}KB")
