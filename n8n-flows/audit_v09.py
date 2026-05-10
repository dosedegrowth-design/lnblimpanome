#!/usr/bin/env python3
"""Auditoria completa v09 — 30+ checks"""
import json
from pathlib import Path

with open("/Users/lucascassiano/Downloads/Multi Agentes LNB v09.json") as f:
    wf = json.load(f)

nodes = wf["nodes"]
conns = wf["connections"]
checks = []

def find(name):
    return next((n for n in nodes if n["name"] == name), None)

# 1-3. Webhook5
wh5 = find("Webhook5")
checks.append(("01. Webhook5 existe", wh5 is not None))
checks.append(("02. Webhook5 path correto", wh5 and wh5["parameters"].get("path") == "6ef87fae-3202-4562-abe3-f1386d6d2bc5"))
checks.append(("03. Webhook5 responseMode=responseNode", wh5 and wh5["parameters"].get("responseMode") == "responseNode"))

# 4. If2 inbox 12
if2 = find("If2")
if2_str = json.dumps(if2["parameters"]) if if2 else ""
checks.append(("04. If2 filtra inbox.id == 12", "12" in if2_str and "inbox" in if2_str.lower()))

# 5. SetFieldsBasic
sfb = find("SetFieldsBasic")
sfb_str = json.dumps(sfb["parameters"]) if sfb else ""
checks.append(("05. SetFieldsBasic existe", sfb is not None))
checks.append(("06. SetFieldsBasic tem AMBOS Acoount ID + Conta do Chatwoot", "Acoount ID" in sfb_str and "Conta do Chatwoot" in sfb_str))
checks.append(("07. SetFieldsBasic tem Token Admin", "Token Admin Chatwoot" in sfb_str))
checks.append(("08. SetFieldsBasic tem MessageType", "MessageType" in sfb_str))

# 9. Sync Conversation Painel
sync = find("Sync Conversation Painel")
checks.append(("09. NOVO Sync Conversation Painel existe", sync is not None))
checks.append(("10. Sync usa /api/n8n/sync-conversation", sync and "sync-conversation" in json.dumps(sync["parameters"])))

# 11. Check IA Pause
cp = find("Check IA Pause")
checks.append(("11. Check IA Pause existe", cp is not None))
ia_if = find("IA Está Pausada?")
checks.append(("12. IA Está Pausada? existe", ia_if is not None))

# 13. Mover Lead Auto
ml = find("Mover Lead (Auto)")
checks.append(("13. Mover Lead Auto → lead-status", ml and "lead-status" in json.dumps(ml["parameters"])))
checks.append(("14. Mover Lead Auto Bearer auth", ml and "Bearer" in json.dumps(ml["parameters"])))

# 15. Maia prompt
maia = find("AI Agent")
maia_prompt = json.dumps(maia["parameters"]).lower() if maia else ""
checks.append(("15. AI Agent (Maia) existe", maia is not None))
checks.append(("16. Maia prompt 100% LNB", "limpa nome brazil" in maia_prompt or "lnb" in maia_prompt))
checks.append(("17. Maia SEM placa/vistoria/FIPE", not any(w in maia_prompt for w in ["placa", "vistoria", "fipe", "matriz", "soffia"])))

# 18-25. Tools LNB (8)
tool_names = ["lead_status", "gerar_cobranca_consulta", "gerar_cobranca_limpeza",
              "blindagem_cadastro", "memory_long", "aplicar_label", "status_processo", "pausa_ia"]
tools_ok = 0
tools_with_fromAI = 0
tools_with_bearer = 0
tools_with_lnb_url = 0
for tn in tool_names:
    t = find(tn)
    if t:
        tools_ok += 1
        ts = json.dumps(t["parameters"])
        if "$fromAI" in ts: tools_with_fromAI += 1
        if "Bearer" in ts: tools_with_bearer += 1
        if "limpanomebrazil.com.br" in ts: tools_with_lnb_url += 1

checks.append((f"18. 8 tools LNB ({tools_ok}/8)", tools_ok == 8))
checks.append((f"19. Tools com $fromAI ({tools_with_fromAI}/8)", tools_with_fromAI >= 7))  # gerar_cobranca_* tem 1 fixed
checks.append((f"20. Tools com Bearer ({tools_with_bearer}/8)", tools_with_bearer == 8))
checks.append((f"21. Tools com URL LNB ({tools_with_lnb_url}/8)", tools_with_lnb_url == 8))

# 22. Tools com bodyParameters (NUNCA specifyBody:json)
tools_specify_json = sum(1 for tn in tool_names if find(tn) and find(tn)["parameters"].get("specifyBody") == "json")
checks.append(("22. Tools usam bodyParameters (não specifyBody:json)", tools_specify_json == 0))

# 23. Tools conectadas ao AI Agent (ai_tool)
maia_tools = 0
for src, types in conns.items():
    if src in tool_names and "ai_tool" in types:
        for arr in types["ai_tool"]:
            for c in arr:
                if c["node"] == "AI Agent":
                    maia_tools += 1
checks.append((f"23. Tools conectadas a Maia ({maia_tools}/8)", maia_tools == 8))

# 24. Memory Short → AI Agent
ms_conn = "Memory Short" in conns and "ai_memory" in conns.get("Memory Short", {})
checks.append(("24. Memory Short → AI Agent (ai_memory)", ms_conn))

# 25. Gemini Model → AI Agent
gemini_conn = "Google Gemini Chat Model" in conns and "ai_languageModel" in conns.get("Google Gemini Chat Model", {})
checks.append(("25. Google Gemini Chat Model → AI Agent (ai_languageModel)", gemini_conn))

# 26. Gemini cred LNB
gemini_node = find("Google Gemini Chat Model")
cred_ok = False
if gemini_node:
    creds = gemini_node.get("credentials", {})
    for v in creds.values():
        if isinstance(v, dict) and v.get("id") == "YMZPVHkbJQW9giMq":
            cred_ok = True
checks.append(("26. Gemini cred LNB Limpa Nome (id correto)", cred_ok))

# 27. 5 Configs Kanban
configs = ["ConfigLead", "ConfigInteressado", "ConfigQualificado", "ConfigFechado", "ConfigPerdido"]
configs_ok = sum(1 for c in configs if find(c))
checks.append((f"27. 5 Configs Kanban ({configs_ok}/5)", configs_ok == 5))

# 28. Configs com AMBOS campos Acoount ID
configs_both = 0
for c in configs:
    n = find(c)
    if n:
        s = json.dumps(n["parameters"])
        if "Acoount ID" in s and "Conta do Chatwoot" in s:
            configs_both += 1
checks.append((f"28. Configs com AMBOS Acoount ID + Conta do Chatwoot ({configs_both}/5)", configs_both == 5))

# 29. Envia Texto retry 3x
et = find("Envia Texto")
checks.append(("29. Envia Texto retry maxTries=3", et and et["parameters"].get("options", {}).get("retry", {}).get("maxTries") == 3))

# 30. Respond to Webhook body fixo
respond = [n for n in nodes if n.get("type") == "n8n-nodes-base.respondToWebhook"]
checks.append((f"30. Respond to Webhook ≥1 ({len(respond)})", len(respond) >= 1))

# 31. onError em nós críticos
critical_types = ("n8n-nodes-base.httpRequest", "n8n-nodes-base.httpRequestTool",
                  "n8n-nodes-base.redis", "n8n-nodes-base.set", "n8n-nodes-base.if",
                  "n8n-nodes-base.switch")
critical_nodes = [n for n in nodes if n.get("type") in critical_types]
on_err_ok = sum(1 for n in critical_nodes if n.get("onError") == "continueRegularOutput")
checks.append((f"31. onError continueRegularOutput ({on_err_ok}/{len(critical_nodes)})", on_err_ok >= len(critical_nodes) * 0.7))

# 32. Webhooks auxiliares
pause_wh = find("Pause IA Webhook")
start_wh = find("Start IA Webhook")
checks.append(("32. Webhook lnb-pause-ia existe", pause_wh and pause_wh["parameters"].get("path") == "lnb-pause-ia"))
checks.append(("33. Webhook lnb-start-ia existe", start_wh and start_wh["parameters"].get("path") == "lnb-start-ia"))

# 34. Sticky Notes documentação
stickies = [n for n in nodes if n.get("type") == "n8n-nodes-base.stickyNote"]
checks.append((f"34. Sticky Notes ≥9 ({len(stickies)})", len(stickies) >= 9))

# 35. Cadeia main path
def trace_chain(start, target, max_depth=30):
    """BFS pra alcançabilidade real do nó target"""
    from collections import deque
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

checks.append(("35. Webhook5 → AI Agent (cadeia íntegra)", trace_chain("Webhook5", "AI Agent")))
checks.append(("36. AI Agent → Envia Texto", trace_chain("AI Agent", "Envia Texto")))
checks.append(("37. Envia Texto → Respond to Webhook", trace_chain("Envia Texto", "Respond to Webhook")))
checks.append(("38. Webhook5 → Sync Conversation Painel", trace_chain("Webhook5", "Sync Conversation Painel")))
checks.append(("39. Webhook5 → Check IA Pause", trace_chain("Webhook5", "Check IA Pause")))

# 40. AI Agent recebe ai_* connections (model + memory + tools = 10+)
ai_inputs = 0
for src, types in conns.items():
    for tname, arrs in types.items():
        if tname.startswith("ai_"):
            for arr in arrs:
                for c in arr:
                    if c["node"] == "AI Agent":
                        ai_inputs += 1
checks.append((f"40. AI Agent recebe ≥10 conexões AI ({ai_inputs})", ai_inputs >= 10))

# 41. Não tem nó disabled lixo
disabled = [n["name"] for n in nodes if n.get("disabled")]
checks.append((f"41. Sem nós disabled lixo ({len(disabled)})", len(disabled) == 0))

# 42. URLs apontam pra LNB (não SPV)
spv_urls = []
for n in nodes:
    s = json.dumps(n.get("parameters", {}))
    if "go.dosedegrowth.cloud" in s or "matriz" in s.lower() and "matriz" not in n["name"].lower():
        if "limpanomebrazil" not in s:
            spv_urls.append(n["name"])
checks.append((f"42. Sem URLs SPV residuais ({len(spv_urls)})", len(spv_urls) == 0))

# Print
print(f"\n{'='*70}")
print(f"AUDITORIA Multi Agentes LNB v09")
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
