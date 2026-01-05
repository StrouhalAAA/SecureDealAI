# Proč nelze srovnávat Claude Code s GitHub Copilot

> **Klíčové sdělení**: GitHub Copilot a Claude Code nejsou konkurenční nástroje. Jsou to **fundamentálně odlišné kategorie** - jako srovnávat kalkulačku s účetním.

---

## TL;DR

| | GitHub Copilot | Claude Code |
|---|----------------|-------------|
| **Co to je** | Autocomplete na steroidech | Autonomní agent |
| **Metafora** | Chytrý našeptávač | Junior developer |
| **Kdo píše kód** | Člověk (Copilot navrhuje) | Agent (člověk reviewuje) |
| **Kdo spouští příkazy** | Člověk | Agent |
| **Může pracovat sám** | ❌ Ne | ✅ Ano |

---

## 1. Fundamentální rozdíl: Asistent vs Agent

### GitHub Copilot = Asistent

Copilot je **reaktivní nástroj**. Čeká, až člověk něco napíše, a pak navrhuje dokončení.

```
Člověk píše: function calculate
Copilot navrhuje: Total(items) { return items.reduce((sum, item) => sum + item.price, 0); }
Člověk: [Tab] nebo [Esc]
```

**Copilot NIKDY**:
- Sám neotevře soubor
- Sám nezačne psát
- Sám nespustí test
- Sám neopraví chybu
- Sám necommitne změnu

### Claude Code = Agent

Claude Code je **proaktivní agent**. Dostane úkol a sám ho vykoná.

```
Člověk: "Implementuj REST API pro správu pravidel podle plánu v docs/plan.md"
Claude Code:
  1. Čte plán
  2. Vytváří soubory
  3. Píše kód
  4. Spouští testy
  5. Opravuje chyby
  6. Commituje
  7. Reportuje výsledek
```

---

## 2. Co GitHub Copilot NEUMÍ (a nikdy nebude)

### 2.1 Nemá přístup k terminálu

```
❌ npm install
❌ git commit
❌ docker build
❌ supabase deploy
❌ pytest
```

**Proč?** Copilot běží jako extension v IDE. Nemá shell access. Nemůže spouštět příkazy.

### 2.2 Nemůže reagovat na výsledky

```
Copilot navrhne kód → Člověk acceptne → Kód má bug
                                         ↓
                     Copilot NEVÍ, že je bug
                     Copilot NEVIDÍ error message
                     Copilot NEMŮŽE opravit
```

**Claude Code**:
```
Agent napíše kód → Spustí test → Test selže → Agent vidí error → Agent opraví → Test projde
```

### 2.3 Nemůže orchestrovat workflow

Copilot nezná koncept "úkolu" nebo "plánu". Vidí pouze:
- Aktuální soubor
- Okolní kontext
- Co člověk právě píše

**Copilot NEVÍ**:
- Že existují další soubory k úpravě
- Že úkol má 7 kroků
- Že krok 3 závisí na kroku 2
- Že po kódu má přijít test

### 2.4 Nemůže pracovat bez člověka

| Akce | Copilot | Claude Code |
|------|---------|-------------|
| Otevřít soubor | ❌ Člověk musí | ✅ Agent sám |
| Napsat kód | ⚠️ Navrhne, člověk potvrdí | ✅ Agent sám |
| Uložit soubor | ❌ Člověk musí | ✅ Agent sám |
| Spustit build | ❌ Člověk musí | ✅ Agent sám |
| Přečíst error | ❌ Člověk musí | ✅ Agent sám |
| Opravit bug | ⚠️ Navrhne, člověk potvrdí | ✅ Agent sám |
| Commitnout | ❌ Člověk musí | ✅ Agent sám |

---

## 3. "Copilot Workspace" a "Agent Mode" - stále nestačí

Microsoft přidal pokročilejší módy, ale fundamentální limity zůstávají:

### Copilot Workspace (2024)
- ✅ Může navrhnout změny ve více souborech
- ❌ Člověk musí potvrdit KAŽDOU změnu
- ❌ Nemůže spouštět příkazy
- ❌ Nemůže reagovat na chyby

### Copilot Agent Mode (2025)
- ✅ Může iterovat na základě feedback
- ❌ Stále vyžaduje potvrzení pro file changes
- ❌ Stále nemá terminal access
- ❌ Stále nemůže pracovat autonomně

**Proč tyto limity existují?**
1. **Bezpečnost** - Microsoft nechce zodpovědnost za autonomní změny
2. **Právní ochrana** - Člověk musí "vlastnit" každou změnu
3. **Business model** - Copilot je "asistent", ne "náhrada"

---

## 4. Praktická ukázka: Stejný úkol, jiný přístup

### Úkol: Implementovat 10 API endpointů (~800 řádků kódu)

#### S GitHub Copilot

```
09:00 - Člověk otevře soubor handlers.ts
09:01 - Píše "export async function listRules"
09:01 - Copilot navrhne tělo funkce
09:02 - Člověk reviewuje, upravuje, acceptuje
09:05 - Funkce hotová, člověk ručně testuje
09:06 - Chyba v query, člověk debuguje
09:10 - Opraveno, další funkce...
09:15 - "export async function getRule"
... opakuj 10x ...
11:30 - Člověk commitne
11:35 - Člověk pushne
11:40 - Člověk napíše do issue "Done"

Čas člověka: ~2.5 hodiny aktivní práce
Interakce: ~100+ (Tab, review, save, run, debug...)
```

#### S Claude Code

```
09:00 - Člověk: "Implementuj CRUD handlers podle plánu"
09:00 - Agent čte plán
09:01 - Agent píše listRules
09:03 - Agent píše getRule
...
09:25 - Agent spustí testy
09:26 - Test selhal - agent opravuje
09:28 - Testy prošly
09:29 - Agent commitne
09:30 - Agent: "Hotovo. 10 handlerů, 800 řádků, testy OK."

Čas člověka: ~1 minuta (zadat úkol)
Interakce: 1
```

---

## 5. Proč si lidé myslí, že jsou srovnatelné?

### Mylné představy

| Mýtus | Realita |
|-------|---------|
| "Oba generují kód" | Copilot navrhuje, Claude Code implementuje |
| "Copilot má taky agenty" | Copilot "agent" stále vyžaduje potvrzení |
| "Je to jen o rychlosti" | Je to o fundamentální architektuře |
| "Copilot se zlepší" | Limity jsou záměrné (bezpečnost, právní) |

### Správná analogie

| Copilot | Claude Code |
|---------|-------------|
| GPS navigace | Taxikář |
| Spell checker | Editor |
| Kalkulačka | Účetní |
| Překladač | Tlumočník |

GPS vám řekne cestu, ale **neřídí auto**.
Copilot vám navrhne kód, ale **neimplementuje feature**.

---

## 6. Kdy použít co

### GitHub Copilot je ideální pro:
- ✅ Denní coding - rychlé doplňování
- ✅ Boilerplate kód
- ✅ Dokumentační komentáře
- ✅ Jednoduché funkce
- ✅ Když CHCETE mít kontrolu nad každým řádkem

### Claude Code je ideální pro:
- ✅ Implementace celých features
- ✅ Multi-file refactoring
- ✅ Opravy bugů (agent vidí error, opraví, otestuje)
- ✅ Noční/víkendové automatizace
- ✅ Když máte dobře definovaný plán

### Mohou koexistovat
```
Ráno: Claude Code implementuje feature podle plánu
Odpoledne: Člověk s Copilotem dělá fine-tuning a review
```

---

## 7. ADWS: Orchestrace nad Claude Code

Pro komplexní projekty používáme **ADWS (Agent-Driven Workflow System)** - orchestrační vrstvu nad Claude Code.

### Co ADWS přidává:
- **Dependency management** - Task B počká na Task A
- **Paralelizace** - Nezávislé tasky běží současně
- **GitHub integrace** - Automatické reporty do issues
- **Audit trail** - Kompletní logy každé exekuce
- **Error recovery** - Detekce selhání, možnost restartu

### Příklad: Phase 6 (7 tasků, ~2300 řádků kódu)

```
Člověk: run_phase.py 6 --issue 22
ADWS:   Načítám 7 tasků...
        06_01 DB Schema ✅ (3.5 min)
        06_02 Core Setup ✅ (6 min)
        06_03 CRUD ✅ (7 min)      ┐
        06_04 Lifecycle ✅ (7 min)  ├─ paralelně
        06_05 Import/Export ✅      ┘
        06_06 Swagger UI ✅
        06_07 Frontend ✅
        Posting to GitHub issue #22...
        Done.

Čas: ~1 hodina
Lidské interakce: 1 (+ 1 restart kvůli bugu v ADWS)
```

> ⚠️ **Poznámka**: První běh selhal kvůli bugu v ADWS (false negative v detekci závislostí). Vyžadovalo to manuální restart. I tak = 2 interakce vs ~150 u Copilotu.

---

## 8. Závěr: Jiná kategorie, jiný účel

### GitHub Copilot
- **Kategorie**: Productivity tool
- **Účel**: Zrychlit psaní kódu
- **Člověk**: Řídí, rozhoduje, exekuuje
- **Nástroj**: Navrhuje, pomáhá

### Claude Code
- **Kategorie**: Autonomous agent
- **Účel**: Implementovat úkoly
- **Člověk**: Definuje, reviewuje, schvaluje
- **Agent**: Plánuje, exekuuje, reportuje

---

## Klíčové poselství

> **Nesrovnávejte Copilot s Claude Code.**
>
> Copilot je **chytřejší autocomplete**.
> Claude Code je **junior developer, který nikdy nespí**.
>
> Otázka není "který je lepší" - otázka je "co potřebuji":
> - Pomoc při psaní? → Copilot
> - Aby to někdo napsal za mě? → Claude Code

---

*Dokument vytvořen: 2026-01-05*
*Kontext: Analýza implementace Phase 6 (Rules Management API) na SecureDealAI*
