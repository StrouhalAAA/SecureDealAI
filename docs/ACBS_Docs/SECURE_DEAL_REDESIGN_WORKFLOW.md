# SecureDeal AI - Redesign Výkupního Workflow

## Change Log

| Datum | Změna | Autor |
|-------|-------|-------|
| 2026-01-05 | Přesun Change Log na začátek, odstranění sekcí Cache strategie a Error handling | Jakub Strouhal |
| 2026-01-04 | Přidána sekce "Prověrky - Přehled" s rozdělením na placené/neplacené | Jakub Strouhal |
| 2026-01-04 | Aktualizována validační matice (6.1) - přidány sloupce Typ a Tým | Jakub Strouhal |
| 2026-01-04 | Reorganizována sekce 7.1 API integrace na placené/neplacené | Jakub Strouhal |
| 2026-01-04 | Smazány sekce 8.2, 9, 10 (mimo scope) | Jakub Strouhal |
| 2026-01-04 | Smazána sekce 8. UI/UX Doporučení (mimo scope) | Jakub Strouhal |
| 2025-12-31 | Iniciální verze dokumentu | Jakub Strouhal |

---

## Executive Summary

Tento dokument popisuje **redesign výkupního procesu**, kde validace zákazníka/dodavatele a vozidla probíhá **již v průběhu výkupu**, nikoli až ve fázi Safe Buying Payment (SBP).

### Klíčová změna filozofie

| Aspekt | Aktuálně (AS-IS) | Nově (TO-BE) |
|--------|-----------------|--------------|
| **Kdy validace** | Až v SBP fázi (před platbou) | Okamžitě při zadání dat |
| **Zdroj dat** | Manuální zadání na více místech | Jeden vstupní bod → automatické doplnění |
| **Zpětná vazba** | Opožděná (hodiny/dny) | **Okamžitá** (sekundy) |
| **UX** | Několik kroků, nejistota | Jeden flow, průběžná validace |

---

## Prověrky - Přehled

> **⚠️ ZODPOVĚDNOST:** Všechna API pro **placené prověrky** zajišťuje **tým DataMiningu**.
> Integrace **ARES a ostatních veřejných registrů** (neplacené) je součástí tohoto projektu (tým ARES/Buying Guide).

### Placené prověrky (tým DataMiningu)

| Prověrka | Služba | Endpoint | Kdy se provádí | Subjekt |
|----------|--------|----------|----------------|---------|
| **Cebia - Exekuce osoby** | CebiaExecutions | `cebiaexecutions-mp.api.aures.app` | Při zadání RČ/IČO | FO/PO |
| **Cebia - Insolvence osoby** | CebiaExecutions | `cebiaexecutions-mp.api.aures.app` | Při zadání RČ/IČO | FO/PO |
| **Cebia - Vozidlo (zástavy, kradené)** | CebiaService | `cebia-mp.api.aures.app` | Při zadání VIN | Vozidlo |
| **Cebia - AUTOTRACER (km historie)** | CebiaService | `cebia-mp.api.aures.app` | Při zadání VIN | Vozidlo |
| **eDálnice** | CheckService | `check-mp.api.aures.app` | Při zadání VIN | Vozidlo |
| **MDCR (technické kontroly)** | CheckService | `check-mp.api.aures.app` | Při zadání VIN | Vozidlo |

### Neplacené prověrky (veřejná API)

| Prověrka | Služba | Endpoint | Kdy se provádí | Subjekt |
|----------|--------|----------|----------------|---------|
| **Platnost OP** (Doložky.cz = MVČR) | MVČR Registr neplatných dokladů | `aplikace.mv.gov.cz/neplatne-doklady` | Po OCR/zadání čísla OP | FO |
| **ARES - Existence firmy** | ARES REST | `ares.gov.cz/ekonomicke-subjekty/{ico}` | Při zadání IČO | PO |
| **ARES - Jednatelé, způsob jednání** | ARES VR | `ares.gov.cz/ekonomicke-subjekty-vr/{ico}` | Při zadání IČO | PO |
| **DPH - Spolehlivost plátce** | ADIS SOAP | `adisrws.mfcr.cz` | Při zadání DIČ | PO |
| **DPH - Bankovní účty** | ADIS SOAP | `adisrws.mfcr.cz` | Při zadání DIČ | PO |
| **Věk kontrola (20-80 let)** | Výpočet z RČ | Lokální | Při zadání RČ | FO |
| **Stáří firmy (> 1 rok)** | Výpočet z ARES | Lokální | Po načtení ARES | PO |

### Kdy se placené prověrky spouští

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  KROK 1 (VIN/SPZ)              │  KROK 2 (RČ/IČO)              │  SBP       │
├────────────────────────────────┼───────────────────────────────┼────────────┤
│  💰 Cebia vozidlo              │  💰 Cebia Exekuce/Insolvence  │  💰 Re-check│
│  💰 eDálnice                   │                               │            │
│  💰 MDCR                       │  🆓 ARES (veřejné)            │            │
│                                │  🆓 DPH (veřejné)             │            │
│                                │  🆓 MVČR OP (veřejné)         │            │
└────────────────────────────────┴───────────────────────────────┴────────────┘
  💰 = Placená prověrka (tým DataMiningu)
  🆓 = Neplacená prověrka (veřejné API)
```

---

## 1. Nový Výkupní Flow - Přehled

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     VÝKUPNÍ PŘÍLEŽITOST - NOVÝ FLOW                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────┐     ┌─────────────┐                                       │
│   │  KROK 1     │     │  KROK 2     │                                       │
│   │  VOZIDLO    │     │  DODAVATEL  │                                       │
│   │  (VIN/SPZ)  │────▶│  (IČO/RČ)   │────▶ VALIDACE ────▶ SBP ────▶ PLATBA │
│   └─────────────┘     └─────────────┘        ✓✓✓                            │
│         │                   │                                               │
│         ▼                   ▼                                               │
│   ┌─────────────┐     ┌─────────────┐                                       │
│   │ OCR nebo    │     │ Automatické │                                       │
│   │ Manuální    │     │ načtení     │                                       │
│   └─────────────┘     └─────────────┘                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. KROK 1: Informace o Vozidle

### 2.1 Vstupní možnosti

```mermaid
flowchart TD
    subgraph KROK1["KROK 1: VOZIDLO"]
        START[Zahájení výkupu] --> CHOICE{Způsob zadání?}

        CHOICE -->|"📷 Sken ORV"| OCR[OCR Extrakce]
        CHOICE -->|"⌨️ Manuální"| MANUAL[Ruční zadání]

        OCR --> OCR_DATA["✅ AUTO-VALIDATED<br/>VIN, SPZ, Vlastník<br/>(zdroj: ORV)"]
        MANUAL --> MANUAL_DATA["⚠️ UNVALIDATED<br/>VIN, SPZ<br/>(nutná validace)"]

        OCR_DATA --> CEBIA1["🔍 Cebia kontrola<br/>(na pozadí)"]
        MANUAL_DATA --> CEBIA1

        CEBIA1 --> STATUS1{Výsledek?}

        STATUS1 -->|"✅ OK"| NEXT["➡️ Pokračovat<br/>na KROK 2"]
        STATUS1 -->|"⚠️ Varování"| WARN1["⚠️ Zobrazit<br/>upozornění"]
        STATUS1 -->|"❌ Blokace"| BLOCK1["🛑 BLOKOVÁNO<br/>Exekuce/Zástava"]

        WARN1 --> NEXT
    end

    style OCR_DATA fill:#d4edda,stroke:#28a745
    style MANUAL_DATA fill:#fff3cd,stroke:#ffc107
    style BLOCK1 fill:#f8d7da,stroke:#dc3545
```

### 2.2 Datové pole - Vozidlo

| Pole | OCR Sken ORV | Manuální zadání | Validace |
|------|-------------|-----------------|----------|
| **VIN** | ✅ Auto (validated) | ⌨️ Nutné zadat | Cebia + BC shoda |
| **SPZ** | ✅ Auto (validated) | ⌨️ Nutné zadat | BC shoda |
| **Značka** | ✅ Auto | ⌨️ Nutné zadat | - |
| **Model** | ✅ Auto | ⌨️ Nutné zadat | - |
| **Rok výroby** | ✅ Auto | ⌨️ Nutné zadat | - |
| **Vlastník (jméno)** | ✅ Auto (validated) | - | Shoda s TP |

### 2.3 Validace spouštěné v KROKU 1

```yaml
Okamžitě po zadání VIN:
  - Cebia kontrola exekucí na vozidle
  - Cebia kontrola zástav
  - Shoda VIN s Business Center
  - Kontrola kradenéhod vozidla

Výsledky:
  🟢 ZELENÁ: Vozidlo čisté → pokračovat
  🟡 ORANŽOVÁ: Varování (např. manipulace km) → zobrazit upozornění
  🔴 ČERVENÁ: Blokace (exekuce, zástava) → STOP
```

---

## 3. KROK 2: Informace o Dodavateli (Zákazník)

### 3.1 Rozhodovací logika podle typu

```mermaid
flowchart TD
    subgraph KROK2["KROK 2: DODAVATEL"]
        START2[Z KROKU 1] --> TYPE{Typ dodavatele?}

        TYPE -->|"👤 PRIVÁT"| RC_INPUT["Zadej Rodné číslo"]
        TYPE -->|"🏢 FIRMA"| ICO_INPUT["Zadej IČO"]

        RC_INPUT --> RC_VALIDATE["🔍 VALIDACE PRIVÁT<br/>(paralelně)"]
        ICO_INPUT --> ICO_VALIDATE["🔍 VALIDACE FIRMA<br/>(paralelně)"]

        subgraph RC_BLOCK["PRIVÁT - Automatické kontroly"]
            RC_VALIDATE --> CEBIA_RC["Cebia (RC)<br/>Exekuce/Insolvence"]
            RC_VALIDATE --> DOLOZKY["Doložky.cz<br/>Platnost OP"]
            RC_VALIDATE --> AGE["Věk kontrola<br/>(20-80 let)"]
        end

        subgraph ICO_BLOCK["FIRMA - Automatické kontroly"]
            ICO_VALIDATE --> ARES["ARES API<br/>Firma data"]
            ICO_VALIDATE --> CEBIA_ICO["Cebia (IČO)<br/>Insolvence"]

            ARES --> ARES_DPH["DPH Status<br/>Spolehlivost"]
            ARES --> ARES_BANK["Bankovní účty<br/>Registrované"]
            ARES --> ARES_JEDNATELE["Jednatelé<br/>Způsob jednání"]
            ARES --> ARES_STARI["Stáří firmy<br/>(varování < 1rok)"]
        end

        RC_BLOCK --> RESULT2{Výsledek?}
        ICO_BLOCK --> RESULT2

        RESULT2 -->|"✅ OK"| AUTOFILL["📝 AUTO-FILL<br/>Formulář"]
        RESULT2 -->|"⚠️ Varování"| WARN2["⚠️ Zobrazit<br/>+ AUTO-FILL"]
        RESULT2 -->|"❌ Blokace"| BLOCK2["🛑 BLOKOVÁNO"]

        AUTOFILL --> CONTINUE["➡️ Pokračovat<br/>k dokumentům"]
        WARN2 --> CONTINUE
    end

    style AUTOFILL fill:#d4edda,stroke:#28a745
    style BLOCK2 fill:#f8d7da,stroke:#dc3545
```

### 3.2 FIRMA - Automatické doplnění z ARES (pouze na základě IČO)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    FIRMA: IČO → KOMPLETNÍ DATA                          │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   VSTUP: IČO "26835746"                                                  │
│                    │                                                     │
│                    ▼                                                     │
│   ┌────────────────────────────────────────┐                             │
│   │         ARES API VOLÁNÍ                │                             │
│   │   GET /ekonomicke-subjekty/{ico}       │                             │
│   │   GET /ekonomicke-subjekty-vr/{ico}    │                             │
│   │   + DPH SOAP kontrola                  │                             │
│   └────────────────────────────────────────┘                             │
│                    │                                                     │
│                    ▼                                                     │
│   ┌────────────────────────────────────────────────────────────────┐     │
│   │                    AUTO-FILL VÝSLEDEK                          │     │
│   ├────────────────────────────────────────────────────────────────┤     │
│   │  📝 Název firmy:     AUTOMOTOLAND CZ s.r.o.           ✅       │     │
│   │  📝 Adresa:          Ostravská 1941/38a, 748 01 Hlučín ✅       │     │
│   │  📝 DIČ:             CZ26835746                        ✅       │     │
│   │  📝 Právní forma:    s.r.o.                           ✅       │     │
│   │  📝 Datum založení:  31.05.2004 (20+ let)             ✅       │     │
│   │  📝 DPH plátce:      ANO - Spolehlivý                 ✅       │     │
│   │  📝 Bank. účet:      351361/5500                      ✅       │     │
│   │  📝 Jednatel:        ŠTĚPÁN VOZNICA (37 let)          ✅       │     │
│   │  📝 Způsob jednání:  Samostatně                       ✅       │     │
│   │  📝 Insolvence:      NE                               ✅       │     │
│   └────────────────────────────────────────────────────────────────┘     │
│                                                                          │
│   VALIDAČNÍ VÝSLEDKY:                                                    │
│   ┌──────────────────────────────────────────────────────────────┐       │
│   │  ✅ Firma existuje v ARES                                    │       │
│   │  ✅ DPH - spolehlivý plátce                                  │       │
│   │  ✅ Bankovní účet registrován                                │       │
│   │  ✅ Firma starší 1 roku                                      │       │
│   │  ✅ Jednatel ve funkci > 30 dnů                              │       │
│   │  ✅ Žádná insolvence                                         │       │
│   └──────────────────────────────────────────────────────────────┘       │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### 3.3 PRIVÁT - Automatická validace (na základě Rodného čísla)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    PRIVÁT: RČ → VALIDACE                                │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   VSTUP: RČ "870409/1234"                                                │
│                    │                                                     │
│                    ▼                                                     │
│   ┌────────────────────────────────────────┐                             │
│   │      PARALELNÍ KONTROLY               │                             │
│   │   ┌─────────┐  ┌─────────┐  ┌───────┐ │                             │
│   │   │ Cebia   │  │Doložky  │  │ Věk   │ │                             │
│   │   │ API     │  │.cz API  │  │výpočet│ │                             │
│   │   └─────────┘  └─────────┘  └───────┘ │                             │
│   └────────────────────────────────────────┘                             │
│                    │                                                     │
│                    ▼                                                     │
│   ┌────────────────────────────────────────────────────────────────┐     │
│   │                    VALIDAČNÍ VÝSLEDEK                          │     │
│   ├────────────────────────────────────────────────────────────────┤     │
│   │  ✅ Exekuce:        Žádné aktivní                              │     │
│   │  ✅ Insolvence:     Žádná                                      │     │
│   │  ✅ Platnost OP:    Platný do 2028                             │     │
│   │  ✅ Věk:            37 let (v rozmezí 20-80)                   │     │
│   └────────────────────────────────────────────────────────────────┘     │
│                                                                          │
│   POZNÁMKA: Osobní údaje (jméno, adresa) se NEDOPLŇUJÍ automaticky      │
│             → Tyto údaje dodá uživatel nebo OCR z OP                     │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### 3.4 Validační pravidla podle typu dodavatele

| Kontrola | PRIVÁT | FIRMA | Kdy běží | Blokující? |
|----------|--------|-------|----------|------------|
| **Cebia - Exekuce** | ✅ (RČ) | ✅ (IČO) | Okamžitě | ✅ ANO |
| **Cebia - Insolvence** | ✅ (RČ) | ✅ (IČO) | Okamžitě | ✅ ANO |
| **ARES - Existence firmy** | - | ✅ | Okamžitě | ✅ ANO |
| **ARES - DPH spolehlivost** | - | ✅ | Okamžitě | ✅ ANO |
| **ARES - Bankovní účet** | - | ✅ | Okamžitě | ✅ ANO |
| **ARES - Jednatelé** | - | ✅ | Okamžitě | ⚠️ Částečně |
| **ARES - Stáří firmy** | - | ✅ | Okamžitě | ⚠️ Varování |
| **Doložky.cz - OP** | ✅ | - | Okamžitě | ✅ ANO |
| **Věk 20-80 let** | ✅ | - | Okamžitě | ⚠️ Varování |

---

## 4. Kompletní Nový Flow - Mermaid Diagram

```mermaid
flowchart TB
    subgraph INIT["🚀 ZAHÁJENÍ VÝKUPU"]
        A[Nová výkupní příležitost]
    end

    subgraph VOZIDLO["📋 KROK 1: VOZIDLO"]
        direction TB
        B{Způsob zadání<br/>informací o voze?}

        B -->|"📷 Sken ORV"| C["OCR Extrakce<br/>z malého TP"]
        B -->|"⌨️ Manuálně"| D["Ruční zadání<br/>VIN, SPZ"]

        C --> E["✅ Data VALIDATED<br/>VIN, SPZ, Vlastník<br/>zdroj: OCR"]
        D --> F["⚠️ Data UNVALIDATED<br/>VIN, SPZ<br/>nutná verifikace"]

        E --> G["🔍 CEBIA Kontrola<br/>(paralelně na pozadí)"]
        F --> G

        G --> H{Výsledek<br/>Cebia?}

        H -->|"✅ Čisté"| I["✅ Vozidlo OK<br/>Pokračovat"]
        H -->|"⚠️ Varování"| J["⚠️ Zobrazit warning<br/>(km, historie)"]
        H -->|"❌ Problém"| K["🛑 BLOKOVÁNO<br/>Exekuce/Zástava/Kradené"]

        J --> I
    end

    subgraph DODAVATEL["👤 KROK 2: DODAVATEL"]
        direction TB
        L{Typ<br/>dodavatele?}

        L -->|"👤 Fyzická osoba"| M["Zadej Rodné číslo"]
        L -->|"🏢 Právnická osoba"| N["Zadej IČO"]

        M --> O["🔍 VALIDACE PRIVÁT"]
        N --> P["🔍 VALIDACE FIRMA"]

        subgraph PRIV["Privát kontroly (paralelně)"]
            O --> O1["Cebia RČ<br/>Exekuce"]
            O --> O2["Cebia RČ<br/>Insolvence"]
            O --> O3["Doložky.cz<br/>Platnost OP"]
            O --> O4["Věk<br/>20-80 let"]
        end

        subgraph FIRM["Firma kontroly (paralelně)"]
            P --> P1["ARES<br/>Základní data"]
            P --> P2["ARES<br/>Jednatelé"]
            P --> P3["DPH<br/>Spolehlivost"]
            P --> P4["Cebia IČO<br/>Insolvence"]

            P1 --> P5["📝 AUTO-FILL<br/>Název, Adresa, DIČ"]
            P2 --> P6["📝 AUTO-FILL<br/>Jednatelé, Způsob jednání"]
            P3 --> P7["📝 AUTO-FILL<br/>DPH status, Účty"]
        end

        PRIV --> Q{Výsledek<br/>validace?}
        FIRM --> Q

        Q -->|"✅ OK"| R["✅ Dodavatel OK<br/>Data doplněna"]
        Q -->|"⚠️ Varování"| S["⚠️ Zobrazit warning<br/>+ Data doplněna"]
        Q -->|"❌ Problém"| T["🛑 BLOKOVÁNO<br/>Exekuce/Insolvence/DPH"]

        S --> R
    end

    subgraph DOCS["📄 KROK 3: DOKUMENTY"]
        U["Nahrání dokumentů<br/>(OP, TP, Faktura...)"]
        U --> V["OCR + Validace shod<br/>VIN, SPZ, Jméno"]
        V --> W{Dokumenty<br/>OK?}
        W -->|"✅"| X["✅ Kompletní<br/>Pokračovat"]
        W -->|"❌"| Y["⚠️ Chybí/Neshoda<br/>Opravit"]
    end

    subgraph SBP["💳 KROK 4: SBP (Před platbou)"]
        Z["🔄 RE-VALIDACE<br/>Kritické kontroly"]
        Z --> Z1["Cebia AKTUÁLNÍ<br/>(max 24h staré)"]
        Z --> Z2["Registr zástav<br/>(real-time)"]
        Z --> Z3["AUTOPASS km<br/>(max 5 dnů)"]

        Z1 --> AA{Finální<br/>výsledek?}
        Z2 --> AA
        Z3 --> AA

        AA -->|"✅"| AB["✅ SCHVÁLENO<br/>Provést platbu"]
        AA -->|"❌"| AC["🛑 ZAMÍTNUTO<br/>Nová překážka"]
    end

    A --> B
    I --> L
    K --> END1[🛑 KONEC - Blokace]
    T --> END2[🛑 KONEC - Blokace]
    R --> U
    Y --> U
    X --> Z
    AB --> END3[✅ PLATBA PROVEDENA]
    AC --> END4[🛑 KONEC - SBP zamítnutí]

    style E fill:#d4edda,stroke:#28a745
    style F fill:#fff3cd,stroke:#ffc107
    style K fill:#f8d7da,stroke:#dc3545
    style T fill:#f8d7da,stroke:#dc3545
    style R fill:#d4edda,stroke:#28a745
    style AB fill:#d4edda,stroke:#28a745
    style AC fill:#f8d7da,stroke:#dc3545
```

---

## 5. Srovnání: Starý vs. Nový Proces

### 5.1 Timing validací

```
STARÝ PROCES (AS-IS):
═══════════════════════════════════════════════════════════════════════
│ Výkup          │ Zadání dat    │ Čekání      │ SBP           │ Platba │
│ (vozidlo)      │ (manuálně)    │ (hodiny)    │ (VALIDACE)    │        │
═══════════════════════════════════════════════════════════════════════
                                               ▲
                                               │ Všechny validace až zde
                                               │ (pozdě na opravu)


NOVÝ PROCES (TO-BE):
═══════════════════════════════════════════════════════════════════════
│ Výkup              │ Dodavatel            │ Dokumenty │ SBP    │Platba│
│ (vozidlo+validace) │ (IČO/RČ+validace)    │ (+OCR)    │(re-val)│      │
═══════════════════════════════════════════════════════════════════════
  ▲                    ▲                       ▲          ▲
  │                    │                       │          │
  │ Cebia vozidlo      │ ARES + Cebia osoba   │ Shoda    │ Kritické
  │ (okamžitě)         │ (okamžitě)           │ dat      │ (aktuální)
```

### 5.2 Přehled změn

| Aspekt | Starý proces | Nový proces |
|--------|-------------|-------------|
| **Zadání vozidla** | Manuálně, vícekrát | OCR sken NEBO 1× manuálně |
| **Validace vozidla** | Až v SBP | **Okamžitě při zadání** |
| **Zadání dodavatele** | Všechna pole manuálně | Pouze IČO/RČ → auto-fill |
| **Validace dodavatele** | Až v SBP | **Okamžitě při zadání** |
| **ARES načtení** | Manuální kopírování | **Automatické z API** |
| **DPH kontrola** | Manuální | **Automatická** |
| **Zpětná vazba** | Po hodinách/dnech | **Sekundy** |
| **Blokace** | Až před platbou | **Okamžitě (early warning)** |

---

## 6. Validační Matice - Kdy co běží

### 6.1 Okamžité validace (KROK 1 + 2)

| Kontrola | Trigger | Čas | Blokující? | Typ | Tým |
|----------|---------|-----|------------|-----|-----|
| Cebia - vozidlo (VIN) | Po zadání VIN | <1s | ✅ | 💰 Placená | DataMining |
| Cebia - osoba (RČ) | Po zadání RČ | <1s | ✅ | 💰 Placená | DataMining |
| Cebia - firma (IČO) | Po zadání IČO | <1s | ✅ | 💰 Placená | DataMining |
| ARES - základní data | Po zadání IČO | <2s | ✅ | 🆓 Neplacená | DataMining |
| ARES - jednatelé | Po zadání IČO | <2s | ⚠️ | 🆓 Neplacená | DataMining |
| ARES - DPH | Po zadání IČO | <3s | ✅ | 🆓 Neplacená | DataMining |
| Doložky.cz - OP (= MVČR) | Po OCR OP | <2s | ✅ | 🆓 Neplacená | DataMining |
| Věk kontrola | Po OCR/zadání RČ | <1s | ⚠️ | 🆓 Neplacená | ARES/BG |
| Stáří firmy | Po ARES | <1s | ⚠️ | 🆓 Neplacená | ARES/BG |

### 6.2 Dokumentové validace (KROK 3)

| Kontrola | Trigger | Čas | Blokující? |
|----------|---------|-----|------------|
| Kompletnost dokumentů | Po upload | <1s | ✅ |
| VIN shoda (TP vs BC) | Po OCR TP | <1s | ✅ |
| SPZ shoda (ORV vs BC) | Po OCR ORV | <1s | ✅ |
| Jméno shoda (TP vs OP) | Po OCR obou | <1s | ✅ |
| Plná moc validita | Po upload PM | <1s | ✅ |

### 6.3 SBP validace (KROK 4 - těsně před platbou)

| Kontrola | Důvod | Čas | Blokující? |
|----------|-------|-----|------------|
| Cebia RE-CHECK | Data stárnou | <1s | ✅ |
| Registr zástav | Real-time nutné | 1-2min | ✅ |
| AUTOPASS km | Max 5 dnů stará | <2s | ⚠️ |
| Datum přeregistrace | 10 dnů kontrola | <1s | ⚠️ |

---

## 7. Technické Požadavky

### 7.1 API integrace podle typu

#### 💰 Placené API (tým DataMiningu - již existují)

| Služba | Endpoint | Dokumentace | Status |
|--------|----------|-------------|--------|
| **CebiaExecutions** | `cebiaexecutions-mp.api.aures.app` | [CEBIA_EXECUTIONS_API_HOWTO.md](../Agents/CEBIA_EXECUTIONS_API_HOWTO.md) | ✅ Existuje |
| **CebiaService** | `cebia-mp.api.aures.app` | [CEBIA_SERVICES_API_REFERENCE.md](../Agents/CEBIA_SERVICES_API_REFERENCE.md) | ✅ Existuje |
| **CheckService** | `check-mp.api.aures.app` | [CEBIA_SERVICES_API_REFERENCE.md](../Agents/CEBIA_SERVICES_API_REFERENCE.md) | ✅ Existuje |

> **Poznámka:** Všechna placená API jsou spravována týmem DataMiningu a již existují.
> Pro integraci kontaktujte tým DataMiningu.

#### 🆓 Neplacené API (veřejné registry - nutno integrovat)

| Služba | Endpoint | Dokumentace | Status |
|--------|----------|-------------|--------|
| **ARES REST** | `ares.gov.cz/ekonomicke-subjekty-v-be/rest` | [EXTERNAL_REGISTRIES_INTEGRATION_GUIDE.md](../Agents/EXTERNAL_REGISTRIES_INTEGRATION_GUIDE.md) | 🔄 K integraci |
| **ARES VR** | `ares.gov.cz/ekonomicke-subjekty-v-be/rest` | [EXTERNAL_REGISTRIES_INTEGRATION_GUIDE.md](../Agents/EXTERNAL_REGISTRIES_INTEGRATION_GUIDE.md) | 🔄 K integraci |
| **DPH SOAP (ADIS)** | `adisrws.mfcr.cz` | [EXTERNAL_REGISTRIES_INTEGRATION_GUIDE.md](../Agents/EXTERNAL_REGISTRIES_INTEGRATION_GUIDE.md) | 🔄 K integraci |
| **MVČR (Doložky.cz)** | `aplikace.mv.gov.cz/neplatne-doklady` | [EXTERNAL_REGISTRIES_INTEGRATION_GUIDE.md](../Agents/EXTERNAL_REGISTRIES_INTEGRATION_GUIDE.md) | 🔄 K integraci |
| **OCR služba** | DocumentCenter5G | Interní | ✅ Existuje |

#### Doporučené rozšíření

```yaml
Budoucí integrace:
  - AUTOPASS API (km historie) - 💰 Placená
  - Notářský rejstřík (zástavy) - 🆓 Neplacená
```

---

**Dokument vytvořen:** 2025-12-31
**Aktualizováno:** 2026-01-05
**Autor:** Jakub Strouhal
**Status:** NÁVRH K REVIEW
