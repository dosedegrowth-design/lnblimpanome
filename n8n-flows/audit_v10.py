#!/usr/bin/env python3
"""Auditoria v10 — checks de estrutura DUAL AI + 7 webhooks + adaptação LNB"""
import json
from pathlib import Path
from collections import deque

with open("/Users/lucascassiano/Downloads/Multi Agentes LNB v10.json") as f:
    wf = json.load(f)

nodes = wf["nodes"]
conns = wf["connections"]

def find(name):
    return next((n for n in nodes if n["name"] == name), None)

def reachable(start, target, max_depth=40):
    queue = deque([(start, 0)])
    visited = {start}
    while queue:
        name, depth = queue.popleft()
        if name == target: return True
        if depth > max_depth: continue
        if name in conns and "main" in conns[name]:
            for arr in conns[name]["main"]:
                for c in arr:
                    nxt = c["node"]
                    if nxt not in visited:
                        visited.add(nxt)
                        queue.append((nxt, depth + 1))
    return False

def ai_inputs(target):
    count = 0
    detail = {}
    for src, types in conns.items():
        for tname, arrs in types.items():
            if tname.startswith("ai_"):
                for arr in arrs:
                    for c in arr:
                        if c["node"] == target:
                            count += 1
                            detail[tname] = detail.get(tname, 0) + 1
    return count, detail

checks = []

# === ESTRUTURA BASE ===
checks.append(("01. Webhook5 existe", find("Webhook5") is not None))
wh5 = find("Webhook5")
checks.append(("02. Webhook5 path correto", wh5 and wh5["parameters"].get("path") == "6ef87fae-3202-4562-abe3-f1386d6d2bc5"))

checks.append(("03. If2 existe", find("If2") is not None))
checks.append(("04. SetFieldsBasic existe", find("SetFieldsBasic") is not None))

# Verificar Chatwoot Account 11 no SetFieldsBasic
sfb = find("SetFieldsBasic")
sfb_str = json.dumps(sfb["parameters"]) if sfb else ""
checks.append(("05. SetFieldsBasic com Account 11", '"11"' in sfb_str))
checks.append(("06. SetFieldsBasic com Inbox 12", '"12"' in sfb_str))
checks.append(("07. SetFieldsBasic com AMBOS Acoount ID + Conta do Chatwoot", "Acoount ID" in sfb_str and "Conta do Chatwoot" in sfb_str))
checks.append(("08. SetFieldsBasic usa body.content (não Evolution)", "body.content" in sfb_str))
checks.append(("09. SetFieldsBasic SEM evolution_instance", "evolution_instance" not in sfb_str))

# === DUAL AI AGENT ===
maia = find("AI Agent")
orq = find("AI Agent1")
checks.append(("10. AI Agent (Maia) existe", maia is not None))
checks.append(("11. AI Agent1 (Orquestrador) existe", orq is not None))

# Pipeline Orquestrador → Maia (alcançável via main)
checks.append(("12. Pipeline: AI Agent1 → AI Agent (Orquestrador antes da Maia)", reachable("AI Agent1", "AI Agent")))

# AI Agent1 (Orquestrador) recebe tools
orq_count, orq_detail = ai_inputs("AI Agent1")
checks.append((f"13. AI Agent1 recebe ≥8 conexões AI ({orq_count})", orq_count >= 8))

# AI Agent (Maia) recebe model + memory + conflito tool
maia_count, maia_detail = ai_inputs("AI Agent")
checks.append((f"14. AI Agent (Maia) recebe ≥3 conexões AI ({maia_count})", maia_count >= 3))

# === 7 WEBHOOKS ===
expected_webhooks = ["Webhook", "Webhook3", "Webhook4", "Webhook5", "Webhook6", "Webhook7", "Webhook8"]
wh_count = sum(1 for w in expected_webhooks if find(w))
checks.append((f"15. 7 webhooks preservados ({wh_count}/7)", wh_count == 7))

# === MAIA PROMPT 100% LNB ===
maia_prompt = ""
if maia:
    maia_prompt = maia["parameters"].get("options", {}).get("systemMessage", "")
checks.append(("16. Maia prompt menciona LNB / Limpa Nome", "lnb" in maia_prompt.lower() or "limpa nome" in maia_prompt.lower()))
checks.append(("17. Maia prompt SEM placa/vistoria/FIPE", not any(w in maia_prompt.lower() for w in ["placa", "vistoria", "fipe", "matriz", "soffia"])))

orq_prompt = ""
if orq:
    orq_prompt = orq["parameters"].get("options", {}).get("systemMessage", "")
checks.append(("18. Orquestrador prompt menciona Lead_kanban/Qualificado", "lead_kanban" in orq_prompt.lower() or "qualificado" in orq_prompt.lower()))

# === TOOLS LNB ===
expected_tools = ["Lead_kanban", "interessado", "Qualificado", "long_memory", "blindagem_cadastro", "aplicar_label", "pausa_ia", "status_processo", "conflito", "Think"]
tools_found = sum(1 for t in expected_tools if find(t))
checks.append((f"19. Tools LNB ({tools_found}/{len(expected_tools)})", tools_found >= 9))

# Tools com URL LNB
tools_with_lnb = 0
tools_with_bearer = 0
tools_with_fromai = 0
for tn in expected_tools:
    t = find(tn)
    if t and t.get("type") == "n8n-nodes-base.httpRequestTool":
        ts = json.dumps(t["parameters"])
        if "limpanomebrazil.com.br" in ts: tools_with_lnb += 1
        if "Bearer" in ts: tools_with_bearer += 1
        if "$fromAI" in ts: tools_with_fromai += 1

checks.append((f"20. Tools com URL LNB ({tools_with_lnb})", tools_with_lnb >= 6))
checks.append((f"21. Tools com Bearer ({tools_with_bearer})", tools_with_bearer >= 6))
checks.append((f"22. Tools com $fromAI ({tools_with_fromai})", tools_with_fromai >= 6))

# === ÁUDIO + IMAGEM PRESERVADOS ===
audio_chain_ok = all(find(n) for n in ["SET AUDIO BASE64", "CONVERT TO MP3", "SET AUDIO MESSAGE"])
checks.append(("23. Cadeia áudio preservada (BASE64 + CONVERT MP3 + MESSAGE)", audio_chain_ok))

image_chain_ok = all(find(n) for n in ["SET IMAGE BASE64", "CONVERT TO JPG", "SET IMAGE MESSAGE"])
checks.append(("24. Cadeia imagem preservada (BASE64 + CONVERT JPG + MESSAGE)", image_chain_ok))

# === MEMORY COMPONENTS ===
memory_short = find("Memory Short")
memory_short1 = find("Memory Short1")
checks.append(("25. Memory Short (Maia) existe", memory_short is not None))
checks.append(("26. Memory Short1 (Orquestrador) existe", memory_short1 is not None))

# === SUPABASE COM CRED LNB ===
sup_count = 0
sup_with_lnb_cred = 0
for n in nodes:
    if n.get("type") in ("n8n-nodes-base.supabase", "n8n-nodes-base.supabaseTool"):
        sup_count += 1
        creds = n.get("credentials", {})
        for v in creds.values():
            if isinstance(v, dict) and v.get("id") == "OXGFVzeBXWTyLQWp":
                sup_with_lnb_cred += 1
                break
checks.append((f"27. ≥10 nós Supabase ({sup_count})", sup_count >= 10))
checks.append((f"28. Supabase com cred LNB ({sup_with_lnb_cred}/{sup_count})", sup_with_lnb_cred == sup_count))

# === GEMINI CRED LNB ===
gemini_count = 0
gemini_with_lnb = 0
for n in nodes:
    t = n.get("type", "")
    if "lmChatGoogleGemini" in t or "googleGemini" in t:
        gemini_count += 1
        creds = n.get("credentials", {})
        for v in creds.values():
            if isinstance(v, dict) and v.get("id") == "YMZPVHkbJQW9giMq":
                gemini_with_lnb += 1
                break
checks.append((f"29. Gemini com cred LNB Limpa Nome ({gemini_with_lnb}/{gemini_count})", gemini_with_lnb == gemini_count and gemini_count >= 3))

# === SYNC PAINEL + CHECK IA PAUSE (NOVO) ===
sync = find("Sync Conversation Painel")
checks.append(("30. NOVO: Sync Conversation Painel existe", sync is not None))
checks.append(("31. Sync chama /api/n8n/sync-conversation", sync and "sync-conversation" in json.dumps(sync["parameters"])))

check_pause = find("Check IA Pause")
checks.append(("32. NOVO: Check IA Pause existe", check_pause is not None))
checks.append(("33. NOVO: IA Está Pausada? existe", find("IA Está Pausada?") is not None))

# === CADEIA MAIN PATH ===
checks.append(("34. Webhook5 → AI Agent1 (Orquestrador)", reachable("Webhook5", "AI Agent1")))
checks.append(("35. Webhook5 → AI Agent (Maia)", reachable("Webhook5", "AI Agent")))
checks.append(("36. Webhook5 → Sync Conversation Painel", reachable("Webhook5", "Sync Conversation Painel")))
checks.append(("37. Webhook5 → Check IA Pause", reachable("Webhook5", "Check IA Pause")))

# === EVOLUTION REMOVIDO ===
ev_nodes = [n for n in nodes if "evolution" in n.get("type", "").lower()]
checks.append((f"38. Sem nós Evolution ({len(ev_nodes)})", len(ev_nodes) == 0))

# Sem URLs Evolution residuais
ev_urls = 0
for n in nodes:
    s = json.dumps(n.get("parameters", {}))
    if "evolution" in s.lower() and "evolutionapi" not in s.lower():
        # Falsos positivos: ev_count++ só se for URL Evolution real
        if "giantkangaroo-evolution" in s or "conect.dosedegrowth.cloud" in s:
            ev_urls += 1
checks.append((f"39. Sem URLs Evolution residuais ({ev_urls})", ev_urls == 0))

# Sem URLs SPV (go.dosedegrowth.cloud sem ser webhook.dosedegrowth.cloud que é o n8n público)
spv_urls = 0
for n in nodes:
    s = json.dumps(n.get("parameters", {}))
    if "go.dosedegrowth.cloud" in s and "limpanomebrazil" not in s:
        spv_urls += 1
checks.append((f"40. Sem URLs SPV residuais ({spv_urls})", spv_urls == 0))

# === RESPOND TO WEBHOOK ===
respond_count = sum(1 for n in nodes if n.get("type") == "n8n-nodes-base.respondToWebhook")
checks.append((f"41. Respond to Webhook ≥4 ({respond_count})", respond_count >= 4))

# === onError em nós críticos ===
critical_types = ("n8n-nodes-base.httpRequest", "n8n-nodes-base.httpRequestTool",
                  "n8n-nodes-base.redis", "n8n-nodes-base.supabase",
                  "n8n-nodes-base.set", "n8n-nodes-base.if", "n8n-nodes-base.switch")
critical_nodes = [n for n in nodes if n.get("type") in critical_types and not n.get("disabled")]
err_ok = sum(1 for n in critical_nodes if n.get("onError") == "continueRegularOutput")
checks.append((f"42. onError continueRegularOutput ({err_ok}/{len(critical_nodes)})", err_ok >= len(critical_nodes) * 0.85))

# === STICKY NOTES (documentação) ===
stickies = [n for n in nodes if n.get("type") == "n8n-nodes-base.stickyNote"]
checks.append((f"43. Sticky Notes ≥15 ({len(stickies)})", len(stickies) >= 15))

# === CONVERT NODES (binário) ===
convert_nodes = [n for n in nodes if n.get("type") == "n8n-nodes-base.convertToFile"]
checks.append((f"44. Convert nodes (binário) ≥2 ({len(convert_nodes)})", len(convert_nodes) >= 2))

# === Trace tools conectadas ao Orquestrador ===
orq_tools = set()
for src, types in conns.items():
    if "ai_tool" in types:
        for arr in types["ai_tool"]:
            for c in arr:
                if c["node"] == "AI Agent1":
                    orq_tools.add(src)
checks.append((f"45. Tools no Orquestrador: {sorted(orq_tools)}", len(orq_tools) >= 7))

# Print
print(f"\n{'='*70}")
print(f"AUDITORIA Multi Agentes LNB v10 (estrutura canônica)")
print(f"{'='*70}")
print(f"Total nós: {len(nodes)}")
print(f"Total conexões: {len(conns)}")
print(f"\nChecks:")
ok = 0
for name, passed in checks:
    icon = "✅" if passed else "❌"
    print(f"  {icon} {name}")
    if passed: ok += 1
print(f"\n{'='*70}")
print(f"RESULTADO: {ok}/{len(checks)} OK ({ok*100//len(checks)}%)")
print(f"{'='*70}")
if ok < len(checks):
    print("\n⚠️ FALHAS:")
    for name, passed in checks:
        if not passed:
            print(f"  ❌ {name}")
