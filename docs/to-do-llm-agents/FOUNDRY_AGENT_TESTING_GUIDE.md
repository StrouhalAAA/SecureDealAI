# Acting Method Parser - Testování v Microsoft Foundry

> **Status**: 📋 GUIDE
> **Created**: 2026-01-26
> **Purpose**: Krok za krokem jak otestovat agenta v Microsoft Foundry

---

## Obsah

1. [Přehled platformy](#1-přehled-platformy)
2. [Předpoklady](#2-předpoklady)
3. [Krok za krokem: Vytvoření projektu](#3-vytvoření-projektu)
4. [Krok za krokem: Nasazení modelu](#4-nasazení-modelu)
5. [Krok za krokem: Vytvoření agenta](#5-vytvoření-agenta)
6. [Krok za krokem: Testování v Playground](#6-testování-v-playground)
7. [Přechod na SDK](#7-přechod-na-sdk)
8. [Portal vs SDK srovnání](#8-portal-vs-sdk-srovnání)
9. [Čištění zdrojů](#9-čištění-zdrojů)
10. [Reference](#10-reference)

---

## 1. Přehled platformy

### Co je Microsoft Foundry?

Microsoft Foundry je AI platforma pro vývoj a nasazení AI agentů. Klíčové vlastnosti:

- **70,000+ zákazníků** již používá platformu
- **100 bilionů tokenů** zpracovaných za čtvrtletí
- **Modely**: Azure OpenAI, Anthropic Claude, Meta Llama, Mistral, DeepSeek

### Dostupné Playgrounds

| Playground | Účel |
|------------|------|
| **Agents** | Testování AI agentů bez kódu |
| **Chat** | Testování chat modelů |
| **Model** | Porovnání až 3 modelů najednou |
| **Audio** | Text-to-speech, transkripce |

Pro náš Acting Method Parser použijeme **Agents Playground**.

---

## 2. Předpoklady

### Požadavky

| Položka | Požadavek |
|---------|-----------|
| **Azure účet** | Aktivní subscription |
| **Role** | Owner nebo Contributor na subscription |
| **Prohlížeč** | Moderní (Chrome, Edge, Firefox) |

### Vytvoření Azure účtu (pokud nemáte)

1. Jdi na [azure.microsoft.com/free](https://azure.microsoft.com/free)
2. Klik **Start free**
3. Přihlaš se Microsoft účtem
4. Zadej platební údaje (pro ověření, free tier nestojí nic)
5. Získáš **$200 kredit** na 30 dní

---

## 3. Vytvoření projektu

### Krok 3.1: Otevři Foundry Portal

```
URL: https://ai.azure.com
```

1. Otevři prohlížeč
2. Jdi na **ai.azure.com**
3. Přihlaš se Azure účtem

### Krok 3.2: Vytvoř nový projekt

1. Na hlavní stránce klikni **+ Create new**
2. Vyber **Microsoft Foundry resource**
3. Klikni **Next**

### Krok 3.3: Konfigurace projektu

| Pole | Hodnota |
|------|---------|
| **Project name** | `securedeal-acting-method-parser` |
| **Region** | West Europe (nebo nejbližší) |
| **Resource group** | Vytvoř nový nebo vyber existující |

4. Klikni **Create**
5. **Počkej 3-5 minut** na provisioning

### Co se vytvoří automaticky

- ✅ Foundry account
- ✅ Project (child resource)
- ✅ GPT-4o model deployment
- ✅ Výchozí agent
- ✅ Přístup do Playground

---

## 4. Nasazení modelu

### Krok 4.1: Přejdi do Models

1. V levém panelu klikni **My assets**
2. Vyber **Models + endpoints**
3. Klikni na záložku **Model deployments**

### Krok 4.2: Nasaď model

1. Klikni **+ Deploy model**
2. Vyber **Deploy base model**
3. Vyhledej model:

| Pro testování | Pro produkci |
|---------------|--------------|
| `gpt-4o-mini` (levnější) | `gpt-4o` nebo `claude-haiku` |

4. Vyber model a klikni **Confirm**
5. Počkej na deployment (1-2 minuty)

### Dostupné modely v Foundry

```
Azure OpenAI:
├── gpt-4o (nejnovější)
├── gpt-4o-mini (levnější)
├── gpt-4
└── gpt-3.5-turbo

Anthropic:
├── claude-sonnet-4
├── claude-opus-4
└── claude-haiku-4

Meta:
└── llama-3.x

Mistral:
└── mistral-large
```

---

## 5. Vytvoření agenta

### Krok 5.1: Přejdi do Agents

1. V levém panelu klikni **Build & Customize**
2. Vyber **Agents**
3. Klikni **+ Create agent**

### Krok 5.2: Základní nastavení

| Pole | Hodnota |
|------|---------|
| **Agent name** | `acting-method-parser` |
| **Model deployment** | Vyber tvůj deployment (gpt-4o-mini) |

### Krok 5.3: Instructions (System Prompt)

Do pole **Instructions** vlož:

```markdown
# Acting Method Parser Agent

Jsi specializovaný parser pro české texty "způsob jednání" z obchodního rejstříku.

## Tvůj úkol
Převeď vstupní český právní text na strukturovaný JSON.

## Výstupní formát
{
  "canActAlone": boolean,
  "actorType": "any_director" | "chairman_only" | "specific_role",
  "jointAction": {
    "minimumActors": number,
    "requiredRoles": string[] | null
  } | null,
  "procuratorCanSign": boolean,
  "confidence": number (0.0-1.0),
  "interpretation": "stručné vysvětlení v češtině"
}

## Slovník
Samostatně/sám/jednotlivě → canActAlone: true
Společně/ve dvou/alespoň dva → canActAlone: false
Jednatel → director
Předseda → chairman
Prokurista → procurator

## Pravidla
1. Pokud text říká "samostatně" nebo "sám" → canActAlone: true
2. Pokud vyžaduje "dva" nebo "společně" → canActAlone: false + jointAction
3. Nastav confidence podle jasnosti textu:
   - Jasný jednoduchý text: 0.95-1.0
   - S rolemi: 0.90-0.95
   - Podmíněný: 0.85-0.92
   - Nejasný: pod 0.70

## Příklad
Vstup: "Jednatelé zastupují společnost v plném rozsahu samostatně."
Výstup:
{
  "canActAlone": true,
  "actorType": "any_director",
  "jointAction": null,
  "procuratorCanSign": false,
  "confidence": 0.98,
  "interpretation": "Každý jednatel může jednat samostatně."
}
```

4. Klikni **Save** nebo **Create**

---

## 6. Testování v Playground

### Krok 6.1: Otevři Playground

1. Po vytvoření agenta klikni **Try in playground**
2. Nebo jdi do **Agents** → vyber agenta → **Open in playground**

### Krok 6.2: Testovací data

Zkopíruj a vlož tyto reálné příklady z ARES:

#### Test 1: Jednoduchý samostatný

```
Jednatelé zastupují společnost v plném rozsahu samostatně.
```

**Očekávaný výstup:**
```json
{
  "canActAlone": true,
  "actorType": "any_director",
  "jointAction": null,
  "confidence": 0.98
}
```

#### Test 2: Společné jednání

```
Společnost zastupují vždy 2 (dva) jednatelé společně.
```

**Očekávaný výstup:**
```json
{
  "canActAlone": false,
  "actorType": "any_director",
  "jointAction": {
    "minimumActors": 2
  },
  "confidence": 0.97
}
```

#### Test 3: Podle role

```
Společnost zastupuje samostatně předseda představenstva nebo společně dva členové představenstva.
```

**Očekávaný výstup:**
```json
{
  "canActAlone": true,
  "actorType": "chairman_only",
  "jointAction": {
    "minimumActors": 2,
    "requiredRoles": ["board_member"]
  },
  "confidence": 0.94
}
```

#### Test 4: S prokuristou

```
Podepisování za společnost se děje tak, že k vytištěné nebo napsané obchodní firmě společnosti připojí svůj podpis jednatel nebo prokurista.
```

**Očekávaný výstup:**
```json
{
  "canActAlone": true,
  "actorType": "any_director",
  "procuratorCanSign": true,
  "confidence": 0.95
}
```

#### Test 5: Podmíněný (komplexní)

```
Za společnost jedná každý jednatel. Pro právní jednání, kterým společnost nabývá nemovité věci nebo kterým společnost věci nemovité zcizuje, zavazuje nebo zatěžuje, a pro právní jednání přesahující částku 5.000.000,- Kč jednají vždy alespoň dva jednatelé společně.
```

**Očekávaný výstup:**
```json
{
  "canActAlone": true,
  "actorType": "any_director",
  "conditions": {
    "amountThreshold": 5000000,
    "transactionTypes": ["real_estate"]
  },
  "confidence": 0.88
}
```

### Krok 6.3: Vyhodnocení výsledků

| Metrika | Cíl |
|---------|-----|
| Správný `canActAlone` | 100% |
| Správný `jointAction.minimumActors` | 100% |
| Confidence kalibrovaná | ±10% |
| JSON validní | 100% |

### Krok 6.4: Iterace promptu

Pokud výsledky nejsou správné:

1. Uprav **Instructions** v nastavení agenta
2. Přidej více příkladů do promptu
3. Zpřesni slovník
4. Testuj znovu

---

## 7. Přechod na SDK

### Kdy přejít na SDK?

| Situace | Doporučení |
|---------|------------|
| Prompt funguje v Playground | ✅ Přejdi na SDK |
| Potřebuješ JSON schema enforcement | ✅ SDK |
| Potřebuješ Claude místo GPT | ✅ SDK |
| Integrace s Edge Function | ✅ SDK |

### Krok 7.1: Export kódu z Playground

1. V Playground klikni **View code**
2. Vyber jazyk (Python/C#/TypeScript)
3. Klikni **Open in VS Code** nebo zkopíruj kód

### Krok 7.2: Ukázkový Python kód

```python
from azure.ai.projects import AIProjectClient
from azure.identity import DefaultAzureCredential
import json

# Připojení
client = AIProjectClient(
    credential=DefaultAzureCredential(),
    endpoint="https://<your-resource>.services.ai.azure.com/api/projects/<project>"
)

# Agent ID z portálu
AGENT_ID = "asst_xxxxxxxxxxxx"

def parse_acting_method(zpusob_jednani: str) -> dict:
    """Parsuje způsob jednání na strukturované pravidlo."""

    # Vytvoř thread
    thread = client.agents.threads.create()

    # Pošli zprávu
    client.agents.messages.create(
        thread_id=thread.id,
        role="user",
        content=zpusob_jednani
    )

    # Spusť agenta
    run = client.agents.runs.create_and_wait(
        thread_id=thread.id,
        agent_id=AGENT_ID
    )

    # Získej odpověď
    messages = client.agents.messages.list(thread_id=thread.id)
    response = messages.data[0].content[0].text.value

    return json.loads(response)

# Test
result = parse_acting_method(
    "Jednatelé zastupují společnost v plném rozsahu samostatně."
)
print(json.dumps(result, indent=2, ensure_ascii=False))
```

---

## 8. Portal vs SDK srovnání

### Detailní srovnání

| Aspekt | Portal | SDK |
|--------|--------|-----|
| **Setup time** | 5 minut | 30+ minut |
| **Instalace** | Žádná | Python/Node packages |
| **Testování** | Vizuální chat | Psaní testů |
| **Instructions edit** | GUI | Kód |
| **Model selection** | Dropdown | Parametr |
| **JSON enforcement** | ❌ | ✅ `response_format` |
| **Claude modely** | Omezené | ✅ Plné |
| **Function calling** | Omezené | ✅ Plné |
| **Verzování** | ❌ | ✅ Git |
| **CI/CD** | ❌ | ✅ |
| **Monitoring** | Základní | Application Insights |
| **Cena za vývoj** | Jen API calls | + čas developera |

### Kdy co použít

```
PORTAL (ai.azure.com)
├── ✅ Prototypování promptu
├── ✅ Quick testing
├── ✅ Demo pro stakeholdery
├── ✅ Učení se platformy
└── ❌ Produkce

SDK (Python/TypeScript)
├── ✅ Produkční nasazení
├── ✅ Integrace s aplikací
├── ✅ Automatizované testy
├── ✅ CI/CD pipeline
└── ✅ Monitoring & alerting
```

### Doporučený workflow

```
1. PORTAL: Vytvoř projekt a agenta
           ↓
2. PORTAL: Iteruj prompt v Playground
           ↓
3. PORTAL: Validuj na testovacích datech
           ↓
4. PORTAL: "View code" → export
           ↓
5. SDK: Implementuj v kódu
           ↓
6. SDK: Přidej caching, error handling
           ↓
7. SDK: Nasaď do Supabase Edge Function
```

---

## 9. Čištění zdrojů

### Důležité: Vyhnout se nákladům

Po testování smaž resources:

1. Jdi na **portal.azure.com**
2. Najdi svou **Resource group**
3. Klikni **Delete resource group**
4. Zadej název pro potvrzení
5. Klikni **Delete**

### Co se smaže

- Foundry account
- Projekt
- Model deployments
- Agents
- Veškerá data

---

## 10. Reference

### Oficiální dokumentace

| Zdroj | URL |
|-------|-----|
| **Foundry Portal** | [ai.azure.com](https://ai.azure.com) |
| **Agents Quickstart** | [learn.microsoft.com/azure/ai-foundry/agents/quickstart](https://learn.microsoft.com/en-us/azure/ai-foundry/agents/quickstart) |
| **Playgrounds Overview** | [learn.microsoft.com/azure/ai-foundry/concepts/concept-playgrounds](https://learn.microsoft.com/en-us/azure/ai-foundry/concepts/concept-playgrounds) |
| **SDK Overview** | [learn.microsoft.com/azure/ai-foundry/how-to/develop/sdk-overview](https://learn.microsoft.com/en-us/azure/ai-foundry/how-to/develop/sdk-overview) |
| **Step-by-Step Tutorial** | [Microsoft Tech Community](https://techcommunity.microsoft.com/blog/educatordeveloperblog/step-by-step-tutorial-building-an-ai-agent-using-azure-ai-foundry/4386122) |

### Další zdroje

| Zdroj | URL |
|-------|-----|
| **Agent Framework** | [azure.microsoft.com/blog/introducing-microsoft-agent-framework](https://azure.microsoft.com/en-us/blog/introducing-microsoft-agent-framework/) |
| **Foundry Product Page** | [azure.microsoft.com/products/ai-foundry](https://azure.microsoft.com/en-us/products/ai-foundry) |
| **GitHub Samples** | [github.com/Azure-Samples/get-started-with-ai-agents](https://github.com/Azure-Samples/get-started-with-ai-agents) |
| **Workshop** | [microsoft.github.io/build-your-first-agent-with-azure-ai-agent-service-workshop](https://microsoft.github.io/build-your-first-agent-with-azure-ai-agent-service-workshop/) |

### SecureDeal dokumenty

| Dokument | Popis |
|----------|-------|
| [ACTING_METHOD_PARSER_AGENT.md](./ACTING_METHOD_PARSER_AGENT.md) | Detailní specifikace agenta |
| [ACTING_METHOD_PARSER_FOUNDRY.md](./ACTING_METHOD_PARSER_FOUNDRY.md) | Foundry implementace overview |
| [LLM_AGENTS_ARCHITECTURE_OVERVIEW.md](./LLM_AGENTS_ARCHITECTURE_OVERVIEW.md) | Celková architektura |

---

## Checklist pro testování

```
□ Azure účet vytvořen
□ Foundry projekt vytvořen
□ Model nasazen (gpt-4o-mini)
□ Agent vytvořen s instructions
□ Test 1: Samostatný jednatel ✓
□ Test 2: Společné jednání ✓
□ Test 3: Podle role ✓
□ Test 4: S prokuristou ✓
□ Test 5: Podmíněný ✓
□ JSON výstup validní
□ Confidence správně kalibrovaná
□ Připraven na přechod do SDK
```

---

*Vytvořeno: 2026-01-26*
*Autor: SecureDeal AI Team*
