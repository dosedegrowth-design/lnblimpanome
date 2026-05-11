#!/usr/bin/env python3
"""
Multi Agentes LNB v10 — Adaptação cirúrgica do original 184 nós

Estratégia:
1. Carrega `Multi Agentes LNB.json` (184 nós, Evolution-based, mas ESTRUTURA CANÔNICA correta)
2. Mudanças cirúrgicas (NÃO redesenhar):
   - Webhook5 path (manter `6ef87fae-...`)
   - SetFieldsBasic: substituir campos Evolution → Chatwoot
   - Brasilia / Brasilia3 / Data_lead: campos Chatwoot Account 11
   - If2 / FromMe-Switch / Tipo da Mensagem: usar body.* Chatwoot
   - Conteúdo da mensagem: body.content (não body.data.message.conversation)
   - URLs das 4 tools antigas + novas URLs LNB Painel
   - Webhook3/4/Webhook/Webhook6/7/8: redirecionar pra /api/n8n/*
   - Substituir 9 nós Evolution por equivalentes Chatwoot
   - Adicionar: Sync Conversation Painel + Check IA Pause
   - Adicionar tools: blindagem_cadastro, aplicar_label, status_processo, pausa_ia
   - Adaptar prompts AI Agent + AI Agent1 + Memory Long1 pra LNB completo

3. Preserva 100%:
   - Pipeline DUAL AI Agent (Orquestrador → Maia)
   - 7 webhooks
   - Áudio/imagem com convert (adaptado pra Chatwoot)
   - 16 Supabase queries (substituir credenciais SPV → LNB)
   - 3 Memory components
   - Anti-spam + debounce + STOP TIMEOUT
   - Sticky notes documentação
   - DELETE chains cleanup
"""
import json
import copy
from pathlib import Path

BASE = Path("/Users/lucascassiano/Downloads/Multi Agentes LNB.json")
OUT_DOWNLOADS = Path("/Users/lucascassiano/Downloads/Multi Agentes LNB v10.json")
OUT_REPO = Path("/Users/lucascassiano/Antigravity/lnb-painel/n8n-flows/Multi Agentes LNB v10.json")

# Constantes LNB
LNB_BASE_URL = "https://limpanomebrazil.com.br"
LNB_API = f"{LNB_BASE_URL}/api/n8n"

GEMINI_CRED_ID = "YMZPVHkbJQW9giMq"
GEMINI_CRED_NAME = "LNB Limpa Nome"
SUPABASE_CRED_ID = "OXGFVzeBXWTyLQWp"
SUPABASE_CRED_NAME = "Oficial Account"
REDIS_CRED_ID = "p5McU43k3cRAmUXI"
REDIS_CRED_NAME = "Redistest"

CHATWOOT_BASE = "https://dosedegrowthcrm.com.br"
ACCOUNT_ID = "11"
INBOX_ID = "12"
FUNNEL_ID = "1"
WEBHOOK_PATH = "6ef87fae-3202-4562-abe3-f1386d6d2bc5"

# ============================================================
# 1. Carrega base
# ============================================================
print(f"📂 Carregando {BASE.name} (referência canônica)...")
with open(BASE) as f:
    wf = json.load(f)
print(f"   Início: {len(wf['nodes'])} nós, {len(wf['connections'])} conexões")

def find(name):
    return next((n for n in wf["nodes"] if n["name"] == name), None)

def find_idx(name):
    for i, n in enumerate(wf["nodes"]):
        if n["name"] == name:
            return i
    return -1

def replace_node(name, new_node):
    idx = find_idx(name)
    if idx >= 0:
        # Preserva position e ID se existirem
        if "position" in wf["nodes"][idx] and "position" not in new_node:
            new_node["position"] = wf["nodes"][idx]["position"]
        if "id" in wf["nodes"][idx]:
            new_node["id"] = wf["nodes"][idx]["id"]
        wf["nodes"][idx] = new_node
    else:
        wf["nodes"].append(new_node)

def add_conn(src, dst, src_type="main", src_idx=0):
    if src not in wf["connections"]:
        wf["connections"][src] = {}
    if src_type not in wf["connections"][src]:
        wf["connections"][src][src_type] = []
    while len(wf["connections"][src][src_type]) <= src_idx:
        wf["connections"][src][src_type].append([])
    wf["connections"][src][src_type][src_idx].append({
        "node": dst,
        "type": "main" if src_type == "main" else src_type,
        "index": 0,
    })

# ============================================================
# 2. Webhook5 — corrige path (já estava certo no original)
# ============================================================
wh5 = find("Webhook5")
if wh5:
    wh5["parameters"]["path"] = WEBHOOK_PATH
    wh5["parameters"]["httpMethod"] = "POST"
    wh5["parameters"]["responseMode"] = "responseNode"
    print(f"   ✅ Webhook5 path = {WEBHOOK_PATH}")

# ============================================================
# 3. SetFieldsBasic — campos Chatwoot (substitui Evolution)
# ============================================================
sfb = find("SetFieldsBasic")
if sfb:
    sfb["parameters"]["assignments"] = {
        "assignments": [
            {"id": "1", "name": "text", "value": "={{ $('Webhook5').item.json.body.content || ' ' }}", "type": "string"},
            {"id": "2", "name": "type", "value": "={{ $('Webhook5').item.json.body.attachments?.[0]?.file_type || 'text' }}", "type": "string"},
            {"id": "3", "name": "phone", "value": "={{ ($('Webhook5').item.json.body.sender.phone_number || '').replace(/\\D/g, '') }}", "type": "string"},
            {"id": "4", "name": "phone_number", "value": "={{ ($('Webhook5').item.json.body.sender.phone_number || '').replace(/\\D/g, '') }}", "type": "string"},
            {"id": "5", "name": "ConversationID", "value": "={{ $('Webhook5').item.json.body.conversation.id }}", "type": "number"},
            {"id": "6", "name": "ContactID", "value": "={{ $('Webhook5').item.json.body.sender.id }}", "type": "number"},
            {"id": "7", "name": "user_from", "value": "={{ $('Webhook5').item.json.body.sender.name }}", "type": "string"},
            {"id": "8", "name": "Nome", "value": "={{ $('Webhook5').item.json.body.sender.name }}", "type": "string"},
            {"id": "9", "name": "MessageID", "value": "={{ $('Webhook5').item.json.body.id }}", "type": "string"},
            {"id": "10", "name": "InboxID", "value": INBOX_ID, "type": "string"},
            {"id": "11", "name": "FunilID", "value": FUNNEL_ID, "type": "string"},
            {"id": "12", "name": "MessageType", "value": "={{ $('Webhook5').item.json.body.message_type }}", "type": "string"},
            {"id": "13", "name": "url_audio_chatwoot", "value": "={{ $('Webhook5').item.json.body.attachments?.[0]?.data_url || '' }}", "type": "string"},
            {"id": "14", "name": "url_image_chatwoot", "value": "={{ $('Webhook5').item.json.body.attachments?.[0]?.data_url || '' }}", "type": "string"},
            {"id": "15", "name": "Link do chatwoot", "value": CHATWOOT_BASE, "type": "string"},
            {"id": "16", "name": "Acoount ID", "value": ACCOUNT_ID, "type": "string"},
            {"id": "17", "name": "Conta do Chatwoot", "value": ACCOUNT_ID, "type": "string"},
            {"id": "18", "name": "Token Chatwoot", "value": "={{ $env.CHATWOOT_TOKEN }}", "type": "string"},
            {"id": "19", "name": "Token Admin Chatwoot", "value": "={{ $env.CHATWOOT_ADMIN_TOKEN }}", "type": "string"},
            {"id": "20", "name": "Email", "value": "={{ $('Webhook5').item.json.body.sender.email || '' }}", "type": "string"},
            {"id": "21", "name": "TIME-PER-CHAR", "value": "5420", "type": "string"},
            {"id": "22", "name": "Janela de Atendimento", "value": "60", "type": "string"},
            {"id": "23", "name": "fromMe", "value": "={{ $('Webhook5').item.json.body.message_type === 'outgoing' }}", "type": "boolean"},
        ]
    }
    print("   ✅ SetFieldsBasic: campos Chatwoot LNB (23 campos)")

# ============================================================
# 4. Brasilia / Brasilia3 / Data_lead — adapta pra LNB
# ============================================================
# Brasilia (lead stage)
br = find("Brasilia")
if br:
    br["name"] = "ConfigLead"
    br["parameters"]["assignments"] = {
        "assignments": [
            {"id": "1", "name": "id-funil", "value": FUNNEL_ID, "type": "string"},
            {"id": "2", "name": "funil-stage", "value": "lead", "type": "string"},
            {"id": "3", "name": "link-chatwoot", "value": CHATWOOT_BASE, "type": "string"},
            {"id": "4", "name": "token-chatwoot", "value": "={{ $env.CHATWOOT_TOKEN }}", "type": "string"},
            {"id": "5", "name": "Acoount ID", "value": ACCOUNT_ID, "type": "string"},
            {"id": "6", "name": "Conta do Chatwoot", "value": ACCOUNT_ID, "type": "string"},
        ]
    }
    print("   ✅ Brasilia → ConfigLead (stage=lead)")

br3 = find("Brasilia3")
if br3:
    br3["name"] = "ConfigInteressado"
    br3["parameters"]["assignments"] = {
        "assignments": [
            {"id": "1", "name": "id-funil", "value": FUNNEL_ID, "type": "string"},
            {"id": "2", "name": "funil-stage", "value": "interessado", "type": "string"},
            {"id": "3", "name": "link-chatwoot", "value": CHATWOOT_BASE, "type": "string"},
            {"id": "4", "name": "token-chatwoot", "value": "={{ $env.CHATWOOT_TOKEN }}", "type": "string"},
            {"id": "5", "name": "Acoount ID", "value": ACCOUNT_ID, "type": "string"},
            {"id": "6", "name": "Conta do Chatwoot", "value": ACCOUNT_ID, "type": "string"},
        ]
    }
    print("   ✅ Brasilia3 → ConfigInteressado (stage=interessado)")

dl = find("Data_lead")
if dl:
    dl["name"] = "ConfigQualificado"
    dl["parameters"]["assignments"] = {
        "assignments": [
            {"id": "1", "name": "id-funil", "value": FUNNEL_ID, "type": "string"},
            {"id": "2", "name": "funil-stage", "value": "qualificado", "type": "string"},
            {"id": "3", "name": "link-chatwoot", "value": CHATWOOT_BASE, "type": "string"},
            {"id": "4", "name": "token-chatwoot", "value": "={{ $env.CHATWOOT_TOKEN }}", "type": "string"},
            {"id": "5", "name": "Acoount ID", "value": ACCOUNT_ID, "type": "string"},
            {"id": "6", "name": "Conta do Chatwoot", "value": ACCOUNT_ID, "type": "string"},
            {"id": "7", "name": "Data de Vencimento", "value": "={{ $now.plus({ days: 10 }).toFormat('yyyy-MM-dd HH:mm:ss') }}", "type": "string"},
            {"id": "8", "name": "nome_produto", "value": "LIMPA NOME BRASIL", "type": "string"},
            {"id": "9", "name": "Valor_Consulta", "value": "19.99", "type": "string"},
            {"id": "10", "name": "Valor_Limpeza", "value": "480.01", "type": "string"},
            {"id": "11", "name": "Valor_Blindagem", "value": "29.90", "type": "string"},
            {"id": "12", "name": "external_reference", "value": "={{ $('Webhook').item.json.body.telefone || $('SetFieldsBasic').item.json.phone }}", "type": "string"},
            {"id": "13", "name": "E-mail", "value": "={{ $('Webhook').item.json.body['E-mail'] || $('SetFieldsBasic').item.json.Email }}", "type": "string"},
            {"id": "14", "name": "webhook_notification", "value": f"{LNB_BASE_URL}/api/site/mp-webhook", "type": "string"},
        ]
    }
    print("   ✅ Data_lead → ConfigQualificado (stage=qualificado)")

# ============================================================
# 5. If2 — filtro inbox 12 (Chatwoot)
# ============================================================
if2 = find("If2")
if if2:
    if2["parameters"] = {
        "conditions": {
            "options": {"caseSensitive": True, "leftValue": "", "typeValidation": "strict"},
            "conditions": [
                {
                    "id": "filter-inbox",
                    "leftValue": "={{ $('Webhook5').item.json.body.inbox.id }}",
                    "rightValue": int(INBOX_ID),
                    "operator": {"type": "number", "operation": "equals"},
                }
            ],
            "combinator": "and",
        },
        "options": {},
    }
    if2.setdefault("typeVersion", 2.2)
    print(f"   ✅ If2: inbox.id == {INBOX_ID}")

# ============================================================
# 6. FromMe-Switch — message_type == incoming
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
# 7. Tipo da Mensagem — usa attachments[0].file_type (Chatwoot)
# ============================================================
tm = find("Tipo da Mensagem")
if tm:
    tm["parameters"] = {
        "rules": {
            "values": [
                {
                    "outputKey": "Texto",
                    "conditions": {
                        "options": {"caseSensitive": True, "leftValue": "", "typeValidation": "strict"},
                        "conditions": [
                            {
                                "id": "is-text",
                                "leftValue": "={{ $('SetFieldsBasic').item.json.type }}",
                                "rightValue": "text",
                                "operator": {"type": "string", "operation": "equals"},
                            }
                        ],
                        "combinator": "and",
                    },
                    "renameOutput": True,
                },
                {
                    "outputKey": "Audio",
                    "conditions": {
                        "options": {"caseSensitive": True, "leftValue": "", "typeValidation": "strict"},
                        "conditions": [
                            {
                                "id": "is-audio",
                                "leftValue": "={{ $('SetFieldsBasic').item.json.type }}",
                                "rightValue": "audio",
                                "operator": {"type": "string", "operation": "equals"},
                            }
                        ],
                        "combinator": "and",
                    },
                    "renameOutput": True,
                },
                {
                    "outputKey": "Imagem",
                    "conditions": {
                        "options": {"caseSensitive": True, "leftValue": "", "typeValidation": "strict"},
                        "conditions": [
                            {
                                "id": "is-image",
                                "leftValue": "={{ $('SetFieldsBasic').item.json.type }}",
                                "rightValue": "image",
                                "operator": {"type": "string", "operation": "equals"},
                            }
                        ],
                        "combinator": "and",
                    },
                    "renameOutput": True,
                },
            ]
        },
        "options": {"fallbackOutput": "extra"},
    }
    print("   ✅ Tipo da Mensagem: texto/audio/imagem (Chatwoot)")

# ============================================================
# 8. SET DEFAULT MESSAGE / SET AUDIO MESSAGE / SET IMAGE MESSAGE — body.content
# ============================================================
sdm = find("SET DEFAULT MESSAGE")
if sdm:
    sdm["parameters"]["assignments"] = {
        "assignments": [
            {"id": "1", "name": "text", "value": "={{ $('SetFieldsBasic').item.json.text }}", "type": "string"},
            {"id": "2", "name": "phone", "value": "={{ $('SetFieldsBasic').item.json.phone }}", "type": "string"},
            {"id": "3", "name": "ConversationID", "value": "={{ $('SetFieldsBasic').item.json.ConversationID }}", "type": "number"},
        ]
    }
    print("   ✅ SET DEFAULT MESSAGE: usa body.content")

# Áudio: HTTP Request1 baixa attachment Chatwoot direto (data_url já é URL pública)
htp1 = find("HTTP Request1")
if htp1:
    htp1["parameters"] = {
        "method": "GET",
        "url": "={{ $('SetFieldsBasic').item.json.url_audio_chatwoot }}",
        "options": {"response": {"response": {"responseFormat": "file"}}},
    }
    htp1["onError"] = "continueRegularOutput"
    print("   ✅ HTTP Request1: download áudio Chatwoot")

# Imagem: HTTP Request2 download Chatwoot
htp2 = find("HTTP Request2")
if htp2:
    htp2["parameters"] = {
        "method": "GET",
        "url": "={{ $('SetFieldsBasic').item.json.url_image_chatwoot }}",
        "options": {"response": {"response": {"responseFormat": "file"}}},
    }
    htp2["onError"] = "continueRegularOutput"
    print("   ✅ HTTP Request2: download imagem Chatwoot")

# ============================================================
# 9. Substitui nós Evolution por Chatwoot Send
# ============================================================
EVOLUTION_NODES_TO_REPLACE = [
    "Enviar texto",
    "Enviar imagem",
    "Evolution API - HTTP Request2",
    "Evolution API - HTTP Request3",
    "SEND VIDEO",
    "Grupo Presencial12",
    "Grupo Presencial13",
]

def make_chatwoot_send_text(name, content_expr, position):
    """Cria HTTP Request Chatwoot que envia texto."""
    return {
        "name": name,
        "type": "n8n-nodes-base.httpRequest",
        "typeVersion": 4.2,
        "position": position,
        "parameters": {
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
            "jsonBody": f"={{\n  \"content\": {content_expr},\n  \"message_type\": \"outgoing\",\n  \"private\": false\n}}",
            "options": {"retry": {"maxTries": 3}},
        },
        "onError": "continueRegularOutput",
    }

# Substitui "Enviar texto" Evolution
for old_name in ["Enviar texto", "Evolution API - HTTP Request2", "Evolution API - HTTP Request3"]:
    n = find(old_name)
    if n:
        pos = n.get("position", [0, 0])
        replace_node(old_name, make_chatwoot_send_text(
            old_name,
            "{{ JSON.stringify($json.output || $json.text || '') }}",
            pos
        ))
print(f"   ✅ Evolution Send → Chatwoot Send (texto)")

# Imagem: substitui Enviar imagem por Chatwoot send imagem (attachment via external_url)
ei = find("Enviar imagem")
if ei:
    pos = ei.get("position", [0, 0])
    replace_node("Enviar imagem", {
        "name": "Enviar imagem",
        "type": "n8n-nodes-base.httpRequest",
        "typeVersion": 4.2,
        "position": pos,
        "parameters": {
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
            "jsonBody": "={\n  \"content\": \"\",\n  \"message_type\": \"outgoing\",\n  \"attachments\": [{\"external_url\": \"{{ $json.image_url || $json.url }}\"}]\n}",
            "options": {},
        },
        "onError": "continueRegularOutput",
    })
print("   ✅ Enviar imagem: Chatwoot send (external_url)")

# Deletar Grupo Presencial (não usa mais grupo)
for gp in ["Grupo Presencial12", "Grupo Presencial13", "SEND VIDEO"]:
    n = find(gp)
    if n:
        wf["nodes"].remove(n)
        if gp in wf["connections"]:
            del wf["connections"][gp]
print("   ✅ Grupos Presenciais + SEND VIDEO removidos")

# ============================================================
# 10. Tools — atualiza URLs SPV/DDG → URLs LNB Painel
# ============================================================

def update_tool(name, url, description=None, extra_params=None):
    """Atualiza URL + headers Bearer + bodyParameters $fromAI."""
    n = find(name)
    if not n:
        return False
    n["parameters"]["url"] = url
    n["parameters"]["method"] = "POST"
    n["parameters"]["sendHeaders"] = True
    n["parameters"]["headerParameters"] = {
        "parameters": [
            {"name": "Authorization", "value": "=Bearer {{ $env.N8N_SHARED_TOKEN }}"},
            {"name": "Content-Type", "value": "application/json"},
        ]
    }
    if description:
        n["parameters"]["toolDescription"] = description
    n["parameters"]["sendBody"] = True
    # Remove specifyBody:json se existir
    n["parameters"].pop("specifyBody", None)
    n["parameters"].pop("jsonBody", None)
    n["onError"] = "continueRegularOutput"
    return True

# Lead_kanban → /api/n8n/lead-status stage=Lead
ld = find("Lead_kanban")
if ld:
    ld["parameters"]["url"] = f"{LNB_API}/lead-status"
    ld["parameters"]["method"] = "POST"
    ld["parameters"]["sendHeaders"] = True
    ld["parameters"]["headerParameters"] = {
        "parameters": [
            {"name": "Authorization", "value": "=Bearer {{ $env.N8N_SHARED_TOKEN }}"},
            {"name": "Content-Type", "value": "application/json"},
        ]
    }
    ld["parameters"]["sendBody"] = True
    ld["parameters"].pop("specifyBody", None)
    ld["parameters"].pop("jsonBody", None)
    ld["parameters"]["bodyParameters"] = {
        "parameters": [
            {"name": "telefone", "value": '={{ $fromAI("telefone", "Telefone do cliente apenas números", "string") }}'},
            {"name": "stage", "value": "Lead"},
            {"name": "nome", "value": '={{ $fromAI("nome", "Nome do cliente", "string") }}'},
            {"name": "cpf", "value": '={{ $fromAI("cpf", "CPF do cliente apenas números", "string") }}'},
            {"name": "email", "value": '={{ $fromAI("email", "Email do cliente", "string") }}'},
            {"name": "conversation_id", "value": '={{ $fromAI("conversation_id", "ID da conversa Chatwoot", "number") }}'},
        ]
    }
    ld["parameters"]["toolDescription"] = "Atualiza o status do cliente no CRM para Lead (primeira interação). Use logo no início da conversa."
    ld["onError"] = "continueRegularOutput"
print("   ✅ Lead_kanban → /api/n8n/lead-status stage=Lead")

# interessado → /api/n8n/lead-status stage=Interessado
inter = find("interessado")
if inter:
    inter["parameters"]["url"] = f"{LNB_API}/lead-status"
    inter["parameters"]["method"] = "POST"
    inter["parameters"]["sendHeaders"] = True
    inter["parameters"]["headerParameters"] = {
        "parameters": [
            {"name": "Authorization", "value": "=Bearer {{ $env.N8N_SHARED_TOKEN }}"},
            {"name": "Content-Type", "value": "application/json"},
        ]
    }
    inter["parameters"]["sendBody"] = True
    inter["parameters"].pop("specifyBody", None)
    inter["parameters"].pop("jsonBody", None)
    inter["parameters"]["bodyParameters"] = {
        "parameters": [
            {"name": "telefone", "value": '={{ $fromAI("telefone", "Telefone do cliente", "string") }}'},
            {"name": "stage", "value": "Interessado"},
            {"name": "nome", "value": '={{ $fromAI("nome", "Nome do cliente", "string") }}'},
            {"name": "cpf", "value": '={{ $fromAI("cpf", "CPF apenas números", "string") }}'},
            {"name": "email", "value": '={{ $fromAI("email", "Email do cliente", "string") }}'},
            {"name": "conversation_id", "value": '={{ $fromAI("conversation_id", "ID conversa Chatwoot", "number") }}'},
        ]
    }
    inter["parameters"]["toolDescription"] = "Atualiza o status do cliente no CRM para Interessado (cliente passou os 4 dados e demonstrou interesse). Use após cliente confirmar dados."
    inter["onError"] = "continueRegularOutput"
print("   ✅ interessado → /api/n8n/lead-status stage=Interessado")

# Qualificado → /api/n8n/criar-checkout (gera link MP)
qual = find("Qualificado")
if qual:
    qual["parameters"]["url"] = f"{LNB_API}/criar-checkout"
    qual["parameters"]["method"] = "POST"
    qual["parameters"]["sendHeaders"] = True
    qual["parameters"]["headerParameters"] = {
        "parameters": [
            {"name": "Authorization", "value": "=Bearer {{ $env.N8N_SHARED_TOKEN }}"},
            {"name": "Content-Type", "value": "application/json"},
        ]
    }
    qual["parameters"]["sendBody"] = True
    qual["parameters"].pop("specifyBody", None)
    qual["parameters"].pop("jsonBody", None)
    qual["parameters"]["bodyParameters"] = {
        "parameters": [
            {"name": "telefone", "value": '={{ $fromAI("telefone", "Telefone do cliente", "string") }}'},
            {"name": "cpf", "value": '={{ $fromAI("cpf", "CPF apenas números", "string") }}'},
            {"name": "nome", "value": '={{ $fromAI("nome", "Nome completo", "string") }}'},
            {"name": "email", "value": '={{ $fromAI("email", "Email do cliente", "string") }}'},
            {"name": "tipo", "value": '={{ $fromAI("tipo", "Tipo: consulta, limpeza_desconto ou blindagem", "string") }}'},
        ]
    }
    qual["parameters"]["toolDescription"] = "Gera link de pagamento Mercado Pago. tipo='consulta' (R$ 19,99) | 'limpeza_desconto' (R$ 480,01 após consulta paga com pendência) | 'blindagem' (R$ 29,90/mês). Retorna init_point com a URL pra cliente pagar."
    qual["onError"] = "continueRegularOutput"
print("   ✅ Qualificado → /api/n8n/criar-checkout (3 tipos)")

# long_memory → /api/n8n/memory-long
lm = find("long_memory")
if lm:
    lm["parameters"]["url"] = f"{LNB_API}/memory-long"
    lm["parameters"]["method"] = "POST"
    lm["parameters"]["sendHeaders"] = True
    lm["parameters"]["headerParameters"] = {
        "parameters": [
            {"name": "Authorization", "value": "=Bearer {{ $env.N8N_SHARED_TOKEN }}"},
            {"name": "Content-Type", "value": "application/json"},
        ]
    }
    lm["parameters"]["sendBody"] = True
    lm["parameters"].pop("specifyBody", None)
    lm["parameters"].pop("jsonBody", None)
    lm["parameters"]["bodyParameters"] = {
        "parameters": [
            {"name": "telefone", "value": '={{ $fromAI("telefone", "Telefone do cliente", "string") }}'},
            {"name": "memoria", "value": '={{ $fromAI("memoria", "Markdown completo estruturado com dados do lead: nome, cpf, email, score, pendências, etapa funil, valor ofertado", "string") }}'},
        ]
    }
    lm["parameters"]["toolDescription"] = "Atualiza memória longa do lead em markdown estruturado. Use sempre ao final de uma interação importante."
    lm["onError"] = "continueRegularOutput"
print("   ✅ long_memory → /api/n8n/memory-long")

# conflito (redisTool) — mantém como Redis tool mas adiciona handoff via /api/n8n/pause-ia
cf = find("conflito")
if cf:
    # Transforma de redisTool em httpRequestTool pra chamar pause-ia
    cf["type"] = "n8n-nodes-base.httpRequestTool"
    cf["typeVersion"] = 4.2
    cf["parameters"] = {
        "toolDescription": "Marca conversa em conflito e pausa a IA — handoff humano. Use quando cliente reclamar gravemente, ameaçar, ou pedir explicitamente falar com humano.",
        "method": "POST",
        "url": f"{LNB_API}/pause-ia",
        "sendHeaders": True,
        "headerParameters": {
            "parameters": [
                {"name": "Authorization", "value": "=Bearer {{ $env.N8N_SHARED_TOKEN }}"},
                {"name": "Content-Type", "value": "application/json"},
            ]
        },
        "sendBody": True,
        "bodyParameters": {
            "parameters": [
                {"name": "telefone", "value": '={{ $fromAI("telefone", "Telefone", "string") }}'},
                {"name": "conversation_id", "value": '={{ $fromAI("conversation_id", "ID Conversa Chatwoot", "number") }}'},
                {"name": "motivo", "value": "conflito"},
            ]
        },
        "options": {},
    }
    cf["onError"] = "continueRegularOutput"
print("   ✅ conflito → /api/n8n/pause-ia (handoff humano)")

# Link de pagamento (supabaseTool) — substitui por httpRequestTool que consulta status
lp = find("Link de pagamento")
if lp:
    lp["type"] = "n8n-nodes-base.httpRequestTool"
    lp["typeVersion"] = 4.2
    lp["parameters"] = {
        "toolDescription": "Consulta status do processo do cliente: tem consulta paga? limpeza em andamento? blindagem ativa? Use quando cliente perguntar 'tá pronto?', 'como tá?', 'já foi feito?'.",
        "method": "POST",
        "url": f"{LNB_API}/status-processo",
        "sendHeaders": True,
        "headerParameters": {
            "parameters": [
                {"name": "Authorization", "value": "=Bearer {{ $env.N8N_SHARED_TOKEN }}"},
                {"name": "Content-Type", "value": "application/json"},
            ]
        },
        "sendBody": True,
        "bodyParameters": {
            "parameters": [
                {"name": "telefone", "value": '={{ $fromAI("telefone", "Telefone do cliente", "string") }}'},
                {"name": "cpf", "value": '={{ $fromAI("cpf", "CPF apenas números", "string") }}'},
            ]
        },
        "options": {},
    }
    lp["onError"] = "continueRegularOutput"
    lp["name"] = "status_processo"  # renomeia
print("   ✅ Link de pagamento → status_processo (READ ONLY)")

# ============================================================
# 11. Tools NOVAS pra LNB (não existiam no original)
# ============================================================
def make_tool(name, description, url, params, position):
    return {
        "name": name,
        "type": "n8n-nodes-base.httpRequestTool",
        "typeVersion": 4.2,
        "position": position,
        "parameters": {
            "toolDescription": description,
            "method": "POST",
            "url": url,
            "sendHeaders": True,
            "headerParameters": {
                "parameters": [
                    {"name": "Authorization", "value": "=Bearer {{ $env.N8N_SHARED_TOKEN }}"},
                    {"name": "Content-Type", "value": "application/json"},
                ]
            },
            "sendBody": True,
            "bodyParameters": {
                "parameters": params,
            },
            "options": {},
        },
        "onError": "continueRegularOutput",
    }

# blindagem_cadastro
ai_agent1 = find("AI Agent1")
base_x = ai_agent1["position"][0] if ai_agent1 else 0
base_y = (ai_agent1["position"][1] + 400) if ai_agent1 else 1500

replace_node("blindagem_cadastro", make_tool(
    "blindagem_cadastro",
    "Cadastra blindagem mensal R$ 29,90/mês. Use APENAS quando consulta retornou nome LIMPO E cliente aceitou contratar a blindagem.",
    f"{LNB_API}/blindagem-cadastro",
    [
        {"name": "telefone", "value": '={{ $fromAI("telefone", "Telefone do cliente", "string") }}'},
        {"name": "cpf", "value": '={{ $fromAI("cpf", "CPF apenas números", "string") }}'},
        {"name": "nome", "value": '={{ $fromAI("nome", "Nome completo", "string") }}'},
        {"name": "email", "value": '={{ $fromAI("email", "Email", "string") }}'},
        {"name": "plano", "value": '={{ $fromAI("plano", "mensal ou anual", "string") }}'},
    ],
    [base_x, base_y]
))

replace_node("aplicar_label", make_tool(
    "aplicar_label",
    "Aplica etiquetas (labels) na conversa Chatwoot. Contextos: interessado_consulta, pago_consulta, consulta_resultado_com_pendencia/sem_pendencia, interessado_limpeza, pago_limpeza, interessado_blindagem, pago_blindagem, conflito, vip.",
    f"{LNB_API}/aplicar-label",
    [
        {"name": "telefone", "value": '={{ $fromAI("telefone", "Telefone", "string") }}'},
        {"name": "contexto", "value": '={{ $fromAI("contexto", "Contexto da label", "string") }}'},
        {"name": "score", "value": '={{ $fromAI("score", "Score de crédito (opcional)", "number") }}'},
        {"name": "conversation_id", "value": '={{ $fromAI("conversation_id", "ID Conversa", "number") }}'},
    ],
    [base_x + 200, base_y]
))

replace_node("pausa_ia", make_tool(
    "pausa_ia",
    "Pausa a IA pra essa conversa (handoff humano). Use quando cliente pedir explicitamente falar com humano OU caso de conflito.",
    f"{LNB_API}/pause-ia",
    [
        {"name": "telefone", "value": '={{ $fromAI("telefone", "Telefone", "string") }}'},
        {"name": "conversation_id", "value": '={{ $fromAI("conversation_id", "ID Conversa", "number") }}'},
        {"name": "motivo", "value": '={{ $fromAI("motivo", "cliente_pediu_humano, conflito ou outro", "string") }}'},
    ],
    [base_x + 400, base_y]
))
print("   ✅ Tools novas: blindagem_cadastro, aplicar_label, pausa_ia")

# Conecta novas tools ao AI Agent1 (Orquestrador)
def ensure_ai_conn(src, dst, ai_type):
    if src not in wf["connections"]:
        wf["connections"][src] = {}
    if ai_type not in wf["connections"][src]:
        wf["connections"][src][ai_type] = [[]]
    # Não duplica
    for c in wf["connections"][src][ai_type][0]:
        if c["node"] == dst:
            return
    wf["connections"][src][ai_type][0].append({
        "node": dst,
        "type": ai_type,
        "index": 0,
    })

for tool in ["blindagem_cadastro", "aplicar_label", "pausa_ia", "status_processo"]:
    ensure_ai_conn(tool, "AI Agent1", "ai_tool")

# ============================================================
# 12. NOVO: Sync Conversation Painel (após SetFieldsBasic)
# ============================================================
sync_conv = {
    "name": "Sync Conversation Painel",
    "type": "n8n-nodes-base.httpRequest",
    "typeVersion": 4.2,
    "position": [sfb["position"][0] + 200, sfb["position"][1] - 200] if sfb else [0, 0],
    "parameters": {
        "method": "POST",
        "url": f"{LNB_API}/sync-conversation",
        "sendHeaders": True,
        "headerParameters": {
            "parameters": [
                {"name": "Authorization", "value": "=Bearer {{ $env.N8N_SHARED_TOKEN }}"},
                {"name": "Content-Type", "value": "application/json"},
            ]
        },
        "sendBody": True,
        "specifyBody": "json",
        "jsonBody": "={\n  \"telefone\": \"{{ $('SetFieldsBasic').item.json.phone }}\",\n  \"conversation_id\": {{ $('SetFieldsBasic').item.json.ConversationID }},\n  \"content\": {{ JSON.stringify(($('SetFieldsBasic').item.json.text || '').slice(0,500)) }},\n  \"message_type\": \"{{ $('SetFieldsBasic').item.json.MessageType }}\",\n  \"attachment_type\": \"{{ $('SetFieldsBasic').item.json.type }}\"\n}",
        "options": {},
    },
    "onError": "continueRegularOutput",
}
replace_node("Sync Conversation Painel", sync_conv)

# ============================================================
# 13. NOVO: Check IA Pause (antes da Maia)
# ============================================================
check_pause = {
    "name": "Check IA Pause",
    "type": "n8n-nodes-base.httpRequest",
    "typeVersion": 4.2,
    "position": [(find("FromMe-Switch")["position"][0] + 200) if find("FromMe-Switch") else 0, (find("FromMe-Switch")["position"][1] - 200) if find("FromMe-Switch") else 0],
    "parameters": {
        "method": "POST",
        "url": f"{LNB_API}/check-ia-pause",
        "sendHeaders": True,
        "headerParameters": {
            "parameters": [
                {"name": "Authorization", "value": "=Bearer {{ $env.N8N_SHARED_TOKEN }}"},
                {"name": "Content-Type", "value": "application/json"},
            ]
        },
        "sendBody": True,
        "specifyBody": "json",
        "jsonBody": "={ \"telefone\": \"{{ $('SetFieldsBasic').item.json.phone }}\" }",
        "options": {},
    },
    "onError": "continueRegularOutput",
}
replace_node("Check IA Pause", check_pause)

ia_pausada_if = {
    "name": "IA Está Pausada?",
    "type": "n8n-nodes-base.if",
    "typeVersion": 2.2,
    "position": [check_pause["position"][0] + 200, check_pause["position"][1]],
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
replace_node("IA Está Pausada?", ia_pausada_if)
print("   ✅ NOVOS: Sync Conversation Painel + Check IA Pause + IA Está Pausada?")

# ============================================================
# 14. Conecta Sync + Check Pause no main path
# ============================================================
# Limpa antigas: SetFieldsBasic→FromMe-Switch e FromMe-Switch→If2
def remove_conn(src, dst):
    if src in wf["connections"] and "main" in wf["connections"][src]:
        for arr in wf["connections"][src]["main"]:
            arr[:] = [c for c in arr if c["node"] != dst]

# Original: SetFieldsBasic → FromMe-Switch → If2
remove_conn("SetFieldsBasic", "FromMe-Switch")
remove_conn("FromMe-Switch", "If2")
remove_conn("If", "SetFieldsBasic")  # If → SetFieldsBasic original

# Novo: If → SetFieldsBasic → Sync Conversation Painel → FromMe-Switch → Check IA Pause → IA Está Pausada?
# (Estou usando o If antigo que vinha após Webhook5, mas substituindo por If2 que filtra inbox 12)

# Webhook5 → If2 (inbox 12)
remove_conn("Webhook5", "If")
add_conn("Webhook5", "If2")
# If2 [true] → SetFieldsBasic
add_conn("If2", "SetFieldsBasic", src_idx=0)
# SetFieldsBasic → Sync Conversation Painel
add_conn("SetFieldsBasic", "Sync Conversation Painel")
# Sync → FromMe-Switch
add_conn("Sync Conversation Painel", "FromMe-Switch")
# FromMe-Switch [incoming] → Check IA Pause
add_conn("FromMe-Switch", "Check IA Pause", src_idx=0)
# Check IA Pause → IA Está Pausada?
add_conn("Check IA Pause", "IA Está Pausada?")
# IA Está Pausada? [true] → FimFluxo
if find("FimFluxo"):
    add_conn("IA Está Pausada?", "FimFluxo", src_idx=0)
# IA Está Pausada? [false] → GET TIMEOUT1 (continua fluxo normal)
if find("GET TIMEOUT1"):
    add_conn("IA Está Pausada?", "GET TIMEOUT1", src_idx=1)

print("   ✅ Main path adaptado: Webhook5→If2→SetFields→Sync→FromMe→CheckPause→...")

# ============================================================
# 15. Webhook3 (lead-lnb): adapta pra /api/n8n/lead-status stage=Lead
# ============================================================
# Webhook3 → Brasilia/ConfigLead → Busca contato8 → ... → Atualizar Kanban
# Vamos simplificar: Webhook3 → HTTP Request pra lead-status → Respond
wh3 = find("Webhook3")
if wh3:
    wh3["parameters"]["path"] = "lnb-tool-lead"
    wh3["parameters"]["httpMethod"] = "POST"
    wh3["parameters"]["responseMode"] = "responseNode"

# Cria nó de chamada
wh3_call = {
    "name": "Lead Tool Action",
    "type": "n8n-nodes-base.httpRequest",
    "typeVersion": 4.2,
    "position": [(wh3["position"][0] + 200) if wh3 else 0, wh3["position"][1] if wh3 else 0],
    "parameters": {
        "method": "POST",
        "url": f"{LNB_API}/lead-status",
        "sendHeaders": True,
        "headerParameters": {
            "parameters": [
                {"name": "Authorization", "value": "=Bearer {{ $env.N8N_SHARED_TOKEN }}"},
                {"name": "Content-Type", "value": "application/json"},
            ]
        },
        "sendBody": True,
        "specifyBody": "json",
        "jsonBody": "={\n  \"telefone\": \"{{ $json.body.telefone }}\",\n  \"stage\": \"Lead\",\n  \"nome\": \"{{ $json.body.nome }}\",\n  \"cpf\": \"{{ $json.body.cpf }}\",\n  \"email\": \"{{ $json.body['E-mail'] || $json.body.email }}\",\n  \"conversation_id\": {{ $json.body.conversation_id || 'null' }}\n}",
        "options": {},
    },
    "onError": "continueRegularOutput",
}
replace_node("Lead Tool Action", wh3_call)

# Limpa cadeia antiga Webhook3
remove_conn("Webhook3", "Brasilia")
remove_conn("Webhook3", "ConfigLead")  # caso ja renomeado
add_conn("Webhook3", "Lead Tool Action")
add_conn("Lead Tool Action", "Respond to Webhook3")

# ============================================================
# 16. Webhook4 (int-lnb): adapta pra /api/n8n/lead-status stage=Interessado
# ============================================================
wh4 = find("Webhook4")
if wh4:
    wh4["parameters"]["path"] = "lnb-tool-interessado"
    wh4["parameters"]["httpMethod"] = "POST"
    wh4["parameters"]["responseMode"] = "responseNode"

wh4_call = {
    "name": "Interessado Tool Action",
    "type": "n8n-nodes-base.httpRequest",
    "typeVersion": 4.2,
    "position": [(wh4["position"][0] + 200) if wh4 else 0, wh4["position"][1] if wh4 else 0],
    "parameters": {
        "method": "POST",
        "url": f"{LNB_API}/lead-status",
        "sendHeaders": True,
        "headerParameters": {
            "parameters": [
                {"name": "Authorization", "value": "=Bearer {{ $env.N8N_SHARED_TOKEN }}"},
                {"name": "Content-Type", "value": "application/json"},
            ]
        },
        "sendBody": True,
        "specifyBody": "json",
        "jsonBody": "={\n  \"telefone\": \"{{ $json.body.telefone }}\",\n  \"stage\": \"Interessado\",\n  \"nome\": \"{{ $json.body.nome }}\",\n  \"cpf\": \"{{ $json.body.cpf }}\",\n  \"email\": \"{{ $json.body['E-mail'] || $json.body.email }}\",\n  \"conversation_id\": {{ $json.body.conversation_id || 'null' }}\n}",
        "options": {},
    },
    "onError": "continueRegularOutput",
}
replace_node("Interessado Tool Action", wh4_call)

remove_conn("Webhook4", "Brasilia3")
remove_conn("Webhook4", "ConfigInteressado")
add_conn("Webhook4", "Interessado Tool Action")
add_conn("Interessado Tool Action", "Respond to Webhook4")

# ============================================================
# 17. Webhook (asaas-registro-lnb): adapta pra /api/n8n/criar-checkout
# ============================================================
wh = find("Webhook")
if wh:
    wh["parameters"]["path"] = "lnb-tool-checkout"
    wh["parameters"]["httpMethod"] = "POST"
    wh["parameters"]["responseMode"] = "responseNode"

wh_call = {
    "name": "Checkout Tool Action",
    "type": "n8n-nodes-base.httpRequest",
    "typeVersion": 4.2,
    "position": [(wh["position"][0] + 200) if wh else 0, wh["position"][1] if wh else 0],
    "parameters": {
        "method": "POST",
        "url": f"{LNB_API}/criar-checkout",
        "sendHeaders": True,
        "headerParameters": {
            "parameters": [
                {"name": "Authorization", "value": "=Bearer {{ $env.N8N_SHARED_TOKEN }}"},
                {"name": "Content-Type", "value": "application/json"},
            ]
        },
        "sendBody": True,
        "specifyBody": "json",
        "jsonBody": "={\n  \"telefone\": \"{{ $json.body.telefone }}\",\n  \"cpf\": \"{{ $json.body.cpf }}\",\n  \"nome\": \"{{ $json.body.nome }}\",\n  \"email\": \"{{ $json.body['E-mail'] || $json.body.email }}\",\n  \"tipo\": \"{{ $json.body.tipo || 'consulta' }}\"\n}",
        "options": {},
    },
    "onError": "continueRegularOutput",
}
replace_node("Checkout Tool Action", wh_call)

remove_conn("Webhook", "Supabase11")
add_conn("Webhook", "Checkout Tool Action")
add_conn("Checkout Tool Action", "Respond to Webhook")

# ============================================================
# 18. Webhook6 (long_memory) — preserva cadeia Memory Long1 interna
# (já está estruturada: Webhook6 → Edit Fields1 → Redis → Memory Long1 → Redis1 → Redis2 → Respond5)
# Só precisa garantir que Memory Long1 grave no painel também
# ============================================================
ef1 = find("Edit Fields1")
if ef1:
    ef1["parameters"]["assignments"] = {
        "assignments": [
            {"id": "1", "name": "telefone", "value": "={{ $json.body.telefone }}", "type": "string"},
            {"id": "2", "name": "long_memory", "value": "={{ $json.body.long_memory || $json.body.memoria || '' }}", "type": "string"},
            {"id": "3", "name": "data", "value": "={{ $now.toISO() }}", "type": "string"},
        ]
    }
    print("   ✅ Edit Fields1: campos LNB Memory Long")

# Sync com painel após Memory Long1
memory_sync = {
    "name": "Memory Long Sync Painel",
    "type": "n8n-nodes-base.httpRequest",
    "typeVersion": 4.2,
    "position": [(find("Memory Long1")["position"][0] + 200) if find("Memory Long1") else 0, (find("Memory Long1")["position"][1] + 200) if find("Memory Long1") else 0],
    "parameters": {
        "method": "POST",
        "url": f"{LNB_API}/memory-long",
        "sendHeaders": True,
        "headerParameters": {
            "parameters": [
                {"name": "Authorization", "value": "=Bearer {{ $env.N8N_SHARED_TOKEN }}"},
                {"name": "Content-Type", "value": "application/json"},
            ]
        },
        "sendBody": True,
        "specifyBody": "json",
        "jsonBody": "={\n  \"telefone\": \"{{ $('Edit Fields1').item.json.telefone }}\",\n  \"memoria\": {{ JSON.stringify($('Memory Long1').item.json.output || $('Memory Long1').item.json.text || '') }}\n}",
        "options": {},
    },
    "onError": "continueRegularOutput",
}
replace_node("Memory Long Sync Painel", memory_sync)

# Memory Long1 → Memory Long Sync Painel → (continua cadeia original)
if "Memory Long1" in wf["connections"] and "main" in wf["connections"]["Memory Long1"]:
    # Inserir Sync no meio da cadeia
    pass  # Mantém cadeia original

# ============================================================
# 19. Webhook7/Webhook8 — Pause/Reset
# Webhook7 → SetFieldsBasic1 → STOP AND SET TIMEOUT (pause IA)
# Webhook8 → SetFieldsBasic2 → DELETE Traplist (reset trap)
# Adaptar SetFieldsBasic1 e SetFieldsBasic2 + adicionar chamada pro painel
# ============================================================
sfb1 = find("SetFieldsBasic1")
if sfb1:
    sfb1["parameters"]["assignments"] = {
        "assignments": [
            {"id": "1", "name": "phone", "value": "={{ ($json.body.telefone || $json.body.phone || '').replace(/\\D/g, '') }}", "type": "string"},
            {"id": "2", "name": "ConversationID", "value": "={{ $json.body.conversation_id || $json.body.meta?.sender?.id || '' }}", "type": "string"},
            {"id": "3", "name": "Janela de Atendimento", "value": "43800", "type": "string"},
        ]
    }
    print("   ✅ SetFieldsBasic1: campos pause IA")

# Adicionar chamada ao painel pra pause
pause_action = {
    "name": "Pause IA Painel",
    "type": "n8n-nodes-base.httpRequest",
    "typeVersion": 4.2,
    "position": [(find("STOP AND SET TIMEOUT")["position"][0] + 200) if find("STOP AND SET TIMEOUT") else 0, (find("STOP AND SET TIMEOUT")["position"][1]) if find("STOP AND SET TIMEOUT") else 0],
    "parameters": {
        "method": "POST",
        "url": f"{LNB_API}/pause-ia",
        "sendHeaders": True,
        "headerParameters": {
            "parameters": [
                {"name": "Authorization", "value": "=Bearer {{ $env.N8N_SHARED_TOKEN }}"},
                {"name": "Content-Type", "value": "application/json"},
            ]
        },
        "sendBody": True,
        "specifyBody": "json",
        "jsonBody": "={\n  \"telefone\": \"{{ $('SetFieldsBasic1').item.json.phone }}\",\n  \"conversation_id\": {{ $('SetFieldsBasic1').item.json.ConversationID || 'null' }},\n  \"motivo\": \"webhook_externo\"\n}",
        "options": {},
    },
    "onError": "continueRegularOutput",
}
replace_node("Pause IA Painel", pause_action)

# STOP AND SET TIMEOUT → Pause IA Painel → Respond
if find("STOP AND SET TIMEOUT") and find("Pause IA Painel"):
    add_conn("STOP AND SET TIMEOUT", "Pause IA Painel")
    # Adiciona Respond se não tiver
    pause_resp = {
        "name": "Respond Pause",
        "type": "n8n-nodes-base.respondToWebhook",
        "typeVersion": 1.1,
        "position": [(find("Pause IA Painel")["position"][0] + 200), find("Pause IA Painel")["position"][1]],
        "parameters": {
            "respondWith": "json",
            "responseBody": "={\"status\":\"ok\",\"action\":\"paused\"}",
            "options": {},
        },
    }
    replace_node("Respond Pause", pause_resp)
    add_conn("Pause IA Painel", "Respond Pause")

# Webhook8 → reset trap (apenas executa DELETE Traplist + Respond)
wh8 = find("Webhook8")
if wh8:
    wh8["parameters"]["responseMode"] = "responseNode"
sfb2 = find("SetFieldsBasic2")
if sfb2:
    sfb2["parameters"]["assignments"] = {
        "assignments": [
            {"id": "1", "name": "phone", "value": "={{ ($json.body.telefone || $json.body.phone || '').replace(/\\D/g, '') }}", "type": "string"},
            {"id": "2", "name": "ConversationID", "value": "={{ $json.body.conversation_id || '' }}", "type": "string"},
        ]
    }
    print("   ✅ SetFieldsBasic2: campos reset trap")

# Adicionar chamada pra start-ia (reset IA)
start_action = {
    "name": "Start IA Painel",
    "type": "n8n-nodes-base.httpRequest",
    "typeVersion": 4.2,
    "position": [(find("DELETE Traplist")["position"][0] + 200) if find("DELETE Traplist") else 0, (find("DELETE Traplist")["position"][1]) if find("DELETE Traplist") else 0],
    "parameters": {
        "method": "POST",
        "url": f"{LNB_API}/start-ia",
        "sendHeaders": True,
        "headerParameters": {
            "parameters": [
                {"name": "Authorization", "value": "=Bearer {{ $env.N8N_SHARED_TOKEN }}"},
                {"name": "Content-Type", "value": "application/json"},
            ]
        },
        "sendBody": True,
        "specifyBody": "json",
        "jsonBody": "={\n  \"telefone\": \"{{ $('SetFieldsBasic2').item.json.phone }}\",\n  \"conversation_id\": {{ $('SetFieldsBasic2').item.json.ConversationID || 'null' }}\n}",
        "options": {},
    },
    "onError": "continueRegularOutput",
}
replace_node("Start IA Painel", start_action)

if find("DELETE Traplist") and find("Start IA Painel"):
    add_conn("DELETE Traplist", "Start IA Painel")
    start_resp = {
        "name": "Respond Start",
        "type": "n8n-nodes-base.respondToWebhook",
        "typeVersion": 1.1,
        "position": [(find("Start IA Painel")["position"][0] + 200), find("Start IA Painel")["position"][1]],
        "parameters": {
            "respondWith": "json",
            "responseBody": "={\"status\":\"ok\",\"action\":\"started\"}",
            "options": {},
        },
    }
    replace_node("Respond Start", start_resp)
    add_conn("Start IA Painel", "Respond Start")

print("   ✅ Webhook7/8 adaptados: pause-ia + start-ia + cadeias")

# ============================================================
# 20. Substitui Supabase credentials SPV → LNB Oficial
# ============================================================
sup_count = 0
for n in wf["nodes"]:
    if n.get("type") in ("n8n-nodes-base.supabase", "n8n-nodes-base.supabaseTool"):
        n["credentials"] = {
            "supabaseApi": {"id": SUPABASE_CRED_ID, "name": SUPABASE_CRED_NAME}
        }
        sup_count += 1
print(f"   ✅ {sup_count} nós Supabase com cred LNB Oficial Account")

# ============================================================
# 21. Substitui Gemini/OpenAI credentials → Gemini LNB
# Apenas Gemini é nosso modelo, OpenAI vamos desabilitar e substituir por Gemini
# ============================================================
gemini_count = 0
for n in wf["nodes"]:
    t = n.get("type", "")
    if "lmChatGoogleGemini" in t or "googleGemini" in t:
        n["credentials"] = {"googlePalmApi": {"id": GEMINI_CRED_ID, "name": GEMINI_CRED_NAME}}
        gemini_count += 1
    elif "lmChatOpenAi" in t or t == "n8n-nodes-base.openAi":
        # Substitui OpenAI por Gemini (consolida modelos)
        n["type"] = "@n8n/n8n-nodes-langchain.lmChatGoogleGemini"
        n["typeVersion"] = 1
        n["parameters"] = {"modelName": "models/gemini-2.0-flash-exp", "options": {}}
        n["credentials"] = {"googlePalmApi": {"id": GEMINI_CRED_ID, "name": GEMINI_CRED_NAME}}
        gemini_count += 1
print(f"   ✅ {gemini_count} modelos AI usando Gemini LNB cred")

# Redis credentials
redis_count = 0
for n in wf["nodes"]:
    if n.get("type") in ("n8n-nodes-base.redis", "n8n-nodes-base.redisTool"):
        n["credentials"] = {"redis": {"id": REDIS_CRED_ID, "name": REDIS_CRED_NAME}}
        redis_count += 1
print(f"   ✅ {redis_count} nós Redis com cred Redistest")

# ============================================================
# 22. Prompts AI Agent (Maia) + AI Agent1 (Orquestrador) + Memory Long1
# ============================================================
MAIA_PROMPT = """=Você é a *Maia*, atendente da *Limpa Nome Brazil (LNB)*. Tem 22 anos, fala português brasileiro de forma natural, empática e persuasiva. Seu objetivo principal é converter clientes em fechamento.

## Sobre a LNB
LNB é especialista em limpeza, negociação e blindagem de nome. Atende todo o Brasil de forma 100% digital. Mais de 10 mil nomes limpos.

## 3 produtos
1. **Consulta CPF** — R$ 19,99 (gateway obrigatório, primeiro passo SEMPRE)
   - Score, pendências, credores, valores
   - PDF detalhado por email
2. **Limpeza + Blindagem 12m** — R$ 480,01 (desconto da consulta já aplicado)
   - Remove negativações SEM quitar dívida
   - Até 20 dias úteis
   - Blindagem 12 meses incluída
3. **Blindagem mensal** — R$ 29,90/mês
   - Monitora CPF 24/7
   - Apenas para quem JÁ tem nome limpo

## REGRA DE OURO (NUNCA QUEBRAR)
Cliente NUNCA contrata Limpeza sem ter pago Consulta E ter pendência confirmada.

## Fluxo de venda

### 1ª mensagem do cliente
Apresenta-se, pede *Nome completo*, *CPF*, *Data de nascimento* e *E-mail*.

### Após coletar 4 dados
Confirma com empatia, pergunta o motivo (dificuldade em crédito, financiamento, etc), depois oferece consulta.

### Oferta da consulta R$ 19,99
Explica: análise nos órgãos oficiais (Serasa, SPC, Boa Vista), score, pendências, valores. PDF por email. R$ 19,99 vira desconto se fechar limpeza.

### Resultado consulta — TEM pendência
Apresenta consequências (crédito negado, juros altos, financiamento bloqueado). Oferece limpeza R$ 480,01 SEM precisar quitar dívida + blindagem incluída.

### Resultado consulta — Nome LIMPO
Parabeniza. Oferece blindagem R$ 29,90/mês.

### Pós-venda
Orienta: consultor entra em contato em horas, painel de acompanhamento online, até 20 dias úteis, documento de confirmação ao final.

## Estilo das mensagens
- Use *asteriscos únicos* pra destacar (formato WhatsApp)
- Mensagens entre 200-500 caracteres
- Termine sempre com pergunta para próximo passo
- Demonstre empatia com a situação do cliente
- NÃO repetir saudação se já houve conversa anterior

## Quebra de objeções
| Objeção | Resposta |
|---|---|
| "É caro" | Compare custo de continuar com nome sujo: juros altos, crédito negado, oportunidades perdidas |
| "Preciso pagar a dívida?" | NÃO. LNB remove negativação SEM quitar |
| "Demora?" | Até 20 dias úteis, com acompanhamento em tempo real |
| "É seguro?" | +10 mil nomes limpos, 100% digital, contrato digital |
| "Como acompanho?" | Painel online + atualizações por WhatsApp e email |
| "E se voltar a sujar?" | Blindagem de Nome incluída monitora e alerta |

## Conflito grave
Se cliente reclamar gravemente, ameaçar, OU pedir explicitamente falar com humano, use a tool `conflito` (chama pausa_ia automaticamente).

## NUNCA
- Mencionar IDs internos, tools ou processos técnicos
- Oferecer descontos além dos R$ 19,99 da consulta
- Enviar link sem confirmar via tool
- Dizer que precisa quitar a dívida
- Repetir saudação se já teve conversa

## Dados da conversa
- Telefone: {{ $('SetFieldsBasic').item.json.phone }}
- Conversation ID: {{ $('SetFieldsBasic').item.json.ConversationID }}
- Nome: {{ $('SetFieldsBasic').item.json.user_from }}

Você está recebendo a última mensagem do cliente E o contexto agregado. Responda APENAS o texto pra mandar ao cliente, sem prefixos, sem JSON."""

ORQUESTRADOR_PROMPT = """=Você é a inteligência interna da LNB. Sua função é tratar informações internamente e chamar tools no momento certo para a Maia conseguir responder o cliente com dados precisos.

## Sequência obrigatória
1. Sempre acionar `long_memory` ao final de qualquer ação para registrar contexto
2. Nunca passar link de pagamento sem o cliente ter confirmado o valor do serviço

## Quando chamar cada tool

### `Lead_kanban`
- Logo na 1ª interação do cliente (move pra stage Lead)

### `interessado`
- Quando cliente passou os 4 dados E demonstrou interesse (move pra stage Interessado)
- Também chama `aplicar_label` com contexto=interessado_consulta

### `Qualificado` (cria link MP)
- Cliente aceitou pagar uma das ofertas (consulta, limpeza ou blindagem)
- Passa tipo=consulta, limpeza_desconto ou blindagem
- Retorna init_point que você deve enviar pra cliente
- Move cliente pra stage Qualificado

### `status_processo`
- Cliente perguntou "tá pronto?", "como está?", "já foi feito?"
- Retorna texto resumo do estado atual

### `aplicar_label`
- A cada mudança de fase, marca etiqueta no Chatwoot
- Contextos: interessado_consulta, pago_consulta, consulta_resultado_com_pendencia/sem_pendencia, interessado_limpeza, pago_limpeza, interessado_blindagem, pago_blindagem, conflito, vip

### `blindagem_cadastro`
- Cliente nome limpo + aceitou blindagem mensal

### `conflito` / `pausa_ia`
- Cliente pediu humano OU conflito grave

### `long_memory`
- SEMPRE ao final, registra resumo estruturado markdown

## Etapa final
Após processar com tools, retorne o contexto consolidado pra Maia usar na resposta ao cliente. Não escreva mensagem direta — só o contexto que a Maia vai usar.

## Dados conversa
- Telefone: {{ $('SetFieldsBasic').item.json.phone }}
- Conversation ID: {{ $('SetFieldsBasic').item.json.ConversationID }}
- Nome: {{ $('SetFieldsBasic').item.json.user_from }}
- Última mensagem: {{ $('SetFieldsBasic').item.json.text }}"""

MEMORY_LONG_PROMPT = """=Você é uma IA especialista em organizar a memória sobre o lead LNB. Recebe o que tinha + o que tem de novo. Output: markdown organizado, resumido, sem perder essenciais.

## Campos a memorizar
- Quando começou a conversa
- Nome completo
- CPF
- Data de nascimento
- Email
- Telefone
- Tem pendência (sim/não/desconhecido)
- Score de crédito
- Valor total de dívidas
- Credores principais
- Status pagamento consulta
- Status pagamento limpeza
- Blindagem ativa (sim/não)
- Último serviço ofertado
- Etapa do funil (Lead / Interessado / Qualificado / Fechado / Perdido)
- Observações relevantes

Não adicione conversas. Só dados estruturados.

NUNCA mencionar veículos, placa, vistoria, FIPE — não é desse produto.

Output: APENAS o markdown estruturado, sem comentários adicionais."""

# Aplica prompts
ai_agent_maia = find("AI Agent")
if ai_agent_maia:
    ai_agent_maia["parameters"]["promptType"] = "define"
    ai_agent_maia["parameters"]["options"] = ai_agent_maia["parameters"].get("options", {})
    ai_agent_maia["parameters"]["options"]["systemMessage"] = MAIA_PROMPT
    print("   ✅ AI Agent (Maia) prompt LNB completo")

if ai_agent1:
    ai_agent1["parameters"]["promptType"] = "define"
    ai_agent1["parameters"]["options"] = ai_agent1["parameters"].get("options", {})
    ai_agent1["parameters"]["options"]["systemMessage"] = ORQUESTRADOR_PROMPT
    print("   ✅ AI Agent1 (Orquestrador) prompt LNB completo")

ml1 = find("Memory Long1")
if ml1:
    ml1["parameters"]["promptType"] = "define"
    ml1["parameters"]["options"] = ml1["parameters"].get("options", {})
    ml1["parameters"]["options"]["systemMessage"] = MEMORY_LONG_PROMPT
    print("   ✅ Memory Long1 prompt LNB")

# ============================================================
# 23. Garantir onError em nós críticos
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
err_fixed = 0
for n in wf["nodes"]:
    if n.get("type") in critical_types and not n.get("disabled"):
        if n.get("onError") != "continueRegularOutput":
            n["onError"] = "continueRegularOutput"
            err_fixed += 1
print(f"   ✅ onError continueRegularOutput aplicado em {err_fixed} nós adicionais")

# ============================================================
# 24. Desabilita nós residuais que não fazem sentido
# ============================================================
# Mantém o resto da estrutura intacta — apenas garante que nós que apontavam pra URLs SPV antigas não causam erro

# ============================================================
# 25. Webhook5 fix (caso tenha vindo path do v06 errado)
# ============================================================
wh5 = find("Webhook5")
if wh5:
    wh5["parameters"]["path"] = WEBHOOK_PATH
    wh5["parameters"]["responseMode"] = "responseNode"

# ============================================================
# 26. Settings finais
# ============================================================
wf["name"] = "Multi Agentes LNB v10"
wf["active"] = False
wf.setdefault("settings", {})["executionOrder"] = "v1"

# ============================================================
# 27. Salva
# ============================================================
with open(OUT_DOWNLOADS, "w") as f:
    json.dump(wf, f, indent=2, ensure_ascii=False)
with open(OUT_REPO, "w") as f:
    json.dump(wf, f, indent=2, ensure_ascii=False)

print(f"\n📦 SALVO:")
print(f"   {OUT_DOWNLOADS} ({OUT_DOWNLOADS.stat().st_size // 1024}KB)")
print(f"   {OUT_REPO}")
print(f"   Nós: {len(wf['nodes'])}")
print(f"   Conexões: {len(wf['connections'])}")
