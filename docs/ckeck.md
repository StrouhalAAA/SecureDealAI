# Prověrky MVP - Kompletní specifikace

**Verze:** 1.0
**Vytvořeno:** 2025-01-18
**Účel:** Dokumentace pro implementaci mock API prověrek v MVP projektech

---

## 1. Executive Summary

Tento dokument popisuje kompletní systém prověrek používaný při validaci subjektů a vozidel v automobilovém prodeji. Dokument slouží jako reference pro implementaci mock API v MVP projektech, kde není možné volat produkční endpointy.

### Přehled typů prověrek

| Kategorie | Typ kontroly | Zdroj dat | Kritičnost |
|-----------|--------------|-----------|------------|
| **Osoby** | Exekuce | CEE (Exekutorská komora ČR) | 🔴 Blokující |
| **Osoby** | Insolvence | ISIR (Justice.cz) | 🔴 Blokující |
| **Firmy** | Existence v ARES | ARES REST API | 🔴 Blokující |
| **Firmy** | Stáří firmy | ARES | 🟡 Varování |
| **Firmy** | Spolehlivost plátce DPH | Registr DPH (ADIS) | 🟡 Varování |
| **Firmy** | Věk jednatele | ARES VR | 🟡 Varování |
| **Doklady** | Platnost OP | MVČR Registr neplatných | 🔴 Blokující |
| **Doklady** | Platnost pasu | MVČR Registr neplatných | 🔴 Blokující |
| **Vozidla** | Blacklist (kradená) | Cebia AUTOTRACER | 🔴 Blokující |
| **Vozidla** | Stáčení tachometru | Cebia + MDCR | 🟡 Varování |
| **Vozidla** | Historie nehod | Cebia | 🟡 Varování |
| **Vozidla** | e-Dálnice | SFDI | ⚪ Informativní |
| **Vozidla** | Historie STK | MDCR | ⚪ Informativní |

---

## 2. Prověrky osob (fyzické osoby)

### 2.1 Kontrola exekucí (EXEKUCE)

**Zdroj:** Centrální evidence exekucí (CEE) - Exekutorská komora ČR
**Vstup:** Rodné číslo (bez lomítka)
**Účel:** Ověření, zda osoba nemá aktivní exekuce

#### Request struktura
```json
{
  "socialSecurityNumber": "9001054205",
  "name": "Jan Novák",
  "birthDate": "1990-01-05"
}
```

#### Response - Čistý výsledek
```json
{
  "checkType": "EXECUTION",
  "status": "CLEAN",
  "checkedAt": "2025-01-18T10:30:00Z",
  "source": "CEE",
  "records": []
}
```

#### Response - Nalezena exekuce
```json
{
  "checkType": "EXECUTION",
  "status": "FOUND",
  "checkedAt": "2025-01-18T10:30:00Z",
  "source": "CEE",
  "records": [
    {
      "caseNumber": "123 EX 4567/2023",
      "executorName": "JUDr. Pavel Executor",
      "executorOffice": "Exekutorský úřad Praha 5",
      "creditor": "Česká spořitelna, a.s.",
      "principalAmount": 125000.00,
      "totalAmount": 187500.00,
      "currency": "CZK",
      "filedDate": "2023-05-15",
      "status": "ACTIVE"
    }
  ],
  "summary": {
    "totalRecords": 1,
    "totalPrincipal": 125000.00,
    "totalDebt": 187500.00
  }
}
```

#### Mock scénáře

| Scénář | Popis | Dopad |
|--------|-------|-------|
| `EXECUTION_NONE` | Žádné exekuce | ✅ Pokračovat |
| `EXECUTION_SINGLE_SMALL` | 1 exekuce < 50 000 Kč | 🟡 Varování |
| `EXECUTION_SINGLE_LARGE` | 1 exekuce > 100 000 Kč | 🔴 Blokovat |
| `EXECUTION_MULTIPLE` | 3+ exekuce | 🔴 Blokovat |

---

### 2.2 Kontrola insolvencí (INSOLVENCE)

**Zdroj:** Insolvenční rejstřík (ISIR) - Justice.cz
**Vstup:** Rodné číslo
**Účel:** Ověření, zda osoba není v insolvenčním řízení

#### Response - Čistý výsledek
```json
{
  "checkType": "INSOLVENCY",
  "status": "CLEAN",
  "checkedAt": "2025-01-18T10:30:00Z",
  "source": "ISIR",
  "records": []
}
```

#### Response - Nalezena insolvence
```json
{
  "checkType": "INSOLVENCY",
  "status": "FOUND",
  "checkedAt": "2025-01-18T10:30:00Z",
  "source": "ISIR",
  "records": [
    {
      "caseNumber": "KSOS 25 INS 12345/2024",
      "court": "Krajský soud v Ostravě",
      "filedDate": "2024-03-10",
      "status": "BANKRUPTCY_DECLARED",
      "statusDate": "2024-06-15",
      "trustee": {
        "name": "Mgr. Jana Správcová",
        "address": "Ostrava, Nádražní 123"
      },
      "proceedings": [
        {
          "date": "2024-03-10",
          "type": "FILED",
          "description": "Zahájení insolvenčního řízení"
        },
        {
          "date": "2024-06-15",
          "type": "BANKRUPTCY_DECLARED",
          "description": "Prohlášení konkursu"
        }
      ]
    }
  ]
}
```

#### Stavy insolvence

| Status | Popis | Dopad |
|--------|-------|-------|
| `NONE` | Žádné insolvenční řízení | ✅ OK |
| `FILED` | Podaný návrh | 🟡 Varování |
| `MORATORIUM` | Moratorium | 🟡 Varování |
| `RESTRUCTURING` | Reorganizace | 🟡 Varování |
| `BANKRUPTCY_DECLARED` | Prohlášený konkurz | 🔴 Blokovat |
| `DEBT_RELIEF` | Oddlužení | 🟡 Varování |
| `COMPLETED` | Ukončeno | ✅ OK |

---

## 3. Prověrky firem (právnické osoby)

### 3.1 Existence firmy v ARES

**Zdroj:** ARES REST API (Administrativní registr ekonomických subjektů)
**Vstup:** IČO (8 číslic)
**Účel:** Ověření existence a základních údajů firmy

#### Request
```json
{
  "companyRegistrationNumber": "27082440"
}
```

#### Response - Firma nalezena
```json
{
  "checkType": "ARES_EXISTENCE",
  "status": "FOUND",
  "checkedAt": "2025-01-18T10:30:00Z",
  "source": "ARES",
  "company": {
    "ico": "27082440",
    "name": "AAA AUTO a.s.",
    "legalForm": {
      "code": "121",
      "name": "Akciová společnost"
    },
    "foundedDate": "2003-05-15",
    "registeredOffice": {
      "street": "Husovo náměstí 1",
      "city": "Hostivice",
      "postalCode": "25301",
      "country": "CZ"
    },
    "registrations": {
      "commercialRegister": {
        "court": "Městský soud v Praze",
        "section": "B",
        "insert": "9096"
      },
      "vatPayer": true,
      "dic": "CZ27082440"
    },
    "naceActivities": [
      {
        "code": "45110",
        "name": "Obchod s automobily a lehkými motorovými vozidly",
        "isPrimary": true
      }
    ],
    "status": "ACTIVE"
  }
}
```

#### Response - Firma nenalezena
```json
{
  "checkType": "ARES_EXISTENCE",
  "status": "NOT_FOUND",
  "checkedAt": "2025-01-18T10:30:00Z",
  "source": "ARES",
  "error": {
    "code": "COMPANY_NOT_FOUND",
    "message": "Subjekt s IČO 12345678 nebyl nalezen v ARES"
  }
}
```

---

### 3.2 Stáří firmy

**Zdroj:** ARES (datum vzniku)
**Pravidlo:** Firma musí existovat > 1 rok
**Účel:** Eliminace nově založených firem (riziko podvodu)

#### Response - Firma příliš mladá
```json
{
  "checkType": "COMPANY_AGE",
  "status": "WARNING",
  "checkedAt": "2025-01-18T10:30:00Z",
  "details": {
    "foundedDate": "2024-08-15",
    "ageInMonths": 5,
    "requiredAgeInMonths": 12,
    "meetsRequirement": false
  },
  "message": "Firma byla založena před méně než 1 rokem"
}
```

---

### 3.3 Spolehlivost plátce DPH

**Zdroj:** Registr DPH (ADIS) - Finanční správa
**Vstup:** DIČ
**Účel:** Ověření spolehlivosti plátce DPH a zveřejněných bankovních účtů

#### Response - Spolehlivý plátce
```json
{
  "checkType": "VAT_RELIABILITY",
  "status": "RELIABLE",
  "checkedAt": "2025-01-18T10:30:00Z",
  "source": "ADIS",
  "vatPayer": {
    "dic": "CZ27082440",
    "isVatPayer": true,
    "isReliable": true,
    "reliabilityStatus": "SPOLEHLIVY",
    "publishedBankAccounts": [
      {
        "accountNumber": "123456789",
        "bankCode": "0100",
        "iban": "CZ6501000000000123456789",
        "publishedSince": "2020-01-15"
      }
    ]
  }
}
```

#### Response - Nespolehlivý plátce
```json
{
  "checkType": "VAT_RELIABILITY",
  "status": "UNRELIABLE",
  "checkedAt": "2025-01-18T10:30:00Z",
  "source": "ADIS",
  "vatPayer": {
    "dic": "CZ12345678",
    "isVatPayer": true,
    "isReliable": false,
    "reliabilityStatus": "NESPOLEHLIVY",
    "unreliableSince": "2024-06-01",
    "publishedBankAccounts": []
  },
  "warning": "Plátce DPH je veden jako nespolehlivý od 1.6.2024"
}
```

---

### 3.4 Jednatelé firmy (ARES VR)

**Zdroj:** ARES - Veřejný rejstřík
**Vstup:** IČO
**Účel:** Získání informací o jednatelích a kontrola věku (20-80 let)

#### Response
```json
{
  "checkType": "COMPANY_DIRECTORS",
  "status": "OK",
  "checkedAt": "2025-01-18T10:30:00Z",
  "source": "ARES_VR",
  "directors": [
    {
      "name": "Ing. Petr Novák",
      "birthDate": "1975-03-20",
      "age": 49,
      "function": "jednatel",
      "functionSince": "2015-06-01",
      "residence": {
        "city": "Praha",
        "country": "CZ"
      },
      "ageCheck": {
        "minAge": 20,
        "maxAge": 80,
        "isWithinRange": true
      }
    }
  ],
  "representationMethod": "Jednatel jedná za společnost samostatně",
  "warnings": []
}
```

#### Response - Jednatel mimo věkový limit
```json
{
  "checkType": "COMPANY_DIRECTORS",
  "status": "WARNING",
  "checkedAt": "2025-01-18T10:30:00Z",
  "source": "ARES_VR",
  "directors": [
    {
      "name": "Josef Starý",
      "birthDate": "1940-05-10",
      "age": 84,
      "function": "jednatel",
      "functionSince": "1995-01-15",
      "ageCheck": {
        "minAge": 20,
        "maxAge": 80,
        "isWithinRange": false,
        "violation": "TOO_OLD"
      }
    }
  ],
  "warnings": [
    {
      "code": "DIRECTOR_AGE_LIMIT",
      "message": "Jednatel Josef Starý překročil věkový limit 80 let",
      "severity": "WARNING"
    }
  ]
}
```

---

## 4. Prověrky dokladů totožnosti

### 4.1 Platnost občanského průkazu

**Zdroj:** MVČR Registr neplatných dokladů
**Vstup:** Číslo dokladu
**Účel:** Ověření, že doklad není v registru neplatných

#### Request
```json
{
  "documentType": "ID_CARD",
  "documentNumber": "123456789"
}
```

#### Response - Platný doklad
```json
{
  "checkType": "DOCUMENT_VALIDITY",
  "status": "VALID",
  "checkedAt": "2025-01-18T10:30:00Z",
  "source": "MVCR",
  "document": {
    "type": "ID_CARD",
    "number": "123456789",
    "isInInvalidRegistry": false
  }
}
```

#### Response - Neplatný doklad
```json
{
  "checkType": "DOCUMENT_VALIDITY",
  "status": "INVALID",
  "checkedAt": "2025-01-18T10:30:00Z",
  "source": "MVCR",
  "document": {
    "type": "ID_CARD",
    "number": "987654321",
    "isInInvalidRegistry": true,
    "invalidReason": "STOLEN",
    "invalidSince": "2024-02-15"
  },
  "error": {
    "code": "DOCUMENT_INVALID",
    "message": "Doklad je veden v registru neplatných dokladů jako odcizený"
  }
}
```

#### Důvody neplatnosti

| Kód | Popis |
|-----|-------|
| `STOLEN` | Odcizený |
| `LOST` | Ztracený |
| `EXPIRED` | Prošlá platnost |
| `DAMAGED` | Poškozený |
| `REVOKED` | Zneplatněný úřadem |

---

## 5. Prověrky vozidel

### 5.1 Blacklist - kradená vozidla

**Zdroj:** Cebia AUTOTRACER
**Vstup:** VIN
**Účel:** Ověření, že vozidlo není kradené

#### Response - Čisté vozidlo
```json
{
  "checkType": "VEHICLE_BLACKLIST",
  "status": "CLEAN",
  "checkedAt": "2025-01-18T10:30:00Z",
  "source": "CEBIA_AUTOTRACER",
  "vehicle": {
    "vin": "WVWZZZ3CZWE123456",
    "isStolen": false,
    "isWanted": false,
    "databases": [
      {
        "name": "Interpol",
        "checked": true,
        "result": "NOT_FOUND"
      },
      {
        "name": "Europol SIS",
        "checked": true,
        "result": "NOT_FOUND"
      },
      {
        "name": "Czech Police",
        "checked": true,
        "result": "NOT_FOUND"
      }
    ]
  }
}
```

#### Response - Kradené vozidlo
```json
{
  "checkType": "VEHICLE_BLACKLIST",
  "status": "STOLEN",
  "checkedAt": "2025-01-18T10:30:00Z",
  "source": "CEBIA_AUTOTRACER",
  "vehicle": {
    "vin": "WVWZZZ3CZWE123456",
    "isStolen": true,
    "isWanted": true,
    "stolenRecord": {
      "reportedDate": "2024-01-15",
      "reportedCountry": "DE",
      "reportedCity": "Berlin",
      "caseNumber": "POL-2024-12345",
      "originalOwner": "Redacted for privacy",
      "database": "Interpol"
    }
  },
  "error": {
    "code": "VEHICLE_STOLEN",
    "message": "Vozidlo je vedeno jako kradené v databázi Interpol",
    "severity": "CRITICAL"
  }
}
```

---

### 5.2 Kontrola stáčení tachometru

**Zdroj:** Cebia + MDCR (záznamy STK)
**Vstup:** VIN + aktuální stav km
**Účel:** Detekce manipulace s tachometrem

#### Response - Bez podezření
```json
{
  "checkType": "ODOMETER_CHECK",
  "status": "OK",
  "checkedAt": "2025-01-18T10:30:00Z",
  "source": "CEBIA_MDCR",
  "currentOdometer": 125000,
  "history": [
    {
      "date": "2024-06-15",
      "source": "STK",
      "odometer": 118500,
      "type": "INSPECTION"
    },
    {
      "date": "2023-06-10",
      "source": "STK",
      "odometer": 95200,
      "type": "INSPECTION"
    },
    {
      "date": "2022-06-05",
      "source": "STK",
      "odometer": 72100,
      "type": "INSPECTION"
    }
  ],
  "analysis": {
    "isSuspicious": false,
    "averageYearlyKm": 23300,
    "trend": "CONSISTENT",
    "confidence": 0.95
  }
}
```

#### Response - Podezření na stočení
```json
{
  "checkType": "ODOMETER_CHECK",
  "status": "SUSPECTED_TAMPERING",
  "checkedAt": "2025-01-18T10:30:00Z",
  "source": "CEBIA_MDCR",
  "currentOdometer": 85000,
  "history": [
    {
      "date": "2024-06-15",
      "source": "STK",
      "odometer": 142500,
      "type": "INSPECTION",
      "flag": "HIGHER_THAN_CURRENT"
    },
    {
      "date": "2023-06-10",
      "source": "STK",
      "odometer": 125000,
      "type": "INSPECTION"
    }
  ],
  "analysis": {
    "isSuspicious": true,
    "suspicionReason": "ODOMETER_ROLLBACK",
    "discrepancy": {
      "lastRecordedKm": 142500,
      "currentKm": 85000,
      "difference": -57500
    },
    "confidence": 0.98
  },
  "warning": {
    "code": "ODOMETER_TAMPERING",
    "message": "Podezření na stočení tachometru. Aktuální stav 85 000 km, ale při STK 15.6.2024 bylo zaznamenáno 142 500 km.",
    "severity": "HIGH"
  }
}
```

---

### 5.3 Historie nehod

**Zdroj:** Cebia
**Vstup:** VIN
**Účel:** Informace o zaznamenaných nehodách vozidla

#### Response
```json
{
  "checkType": "ACCIDENT_HISTORY",
  "status": "FOUND",
  "checkedAt": "2025-01-18T10:30:00Z",
  "source": "CEBIA",
  "accidents": [
    {
      "date": "2023-03-15",
      "country": "CZ",
      "severity": "MINOR",
      "description": "Poškození předního nárazníku",
      "estimatedDamage": 35000,
      "currency": "CZK",
      "repaired": true,
      "insuranceClaim": true
    }
  ],
  "summary": {
    "totalAccidents": 1,
    "majorAccidents": 0,
    "minorAccidents": 1,
    "totalDamage": 35000
  }
}
```

#### Severity úrovně

| Severity | Popis | Dopad na cenu |
|----------|-------|---------------|
| `MINOR` | Drobné poškození | -5% až -10% |
| `MODERATE` | Střední poškození | -10% až -20% |
| `MAJOR` | Vážné poškození | -20% až -40% |
| `TOTAL_LOSS` | Totální škoda | Nedoporučeno |

---

### 5.4 e-Dálnice (elektronická dálniční známka)

**Zdroj:** SFDI
**Vstup:** VIN nebo SPZ
**Účel:** Ověření platnosti dálniční známky

#### Response - Platná známka
```json
{
  "checkType": "HIGHWAY_VIGNETTE",
  "status": "VALID",
  "checkedAt": "2025-01-18T10:30:00Z",
  "source": "SFDI",
  "vignette": {
    "vehicleIdentifier": "WVWZZZ3CZWE123456",
    "identifierType": "VIN",
    "validFrom": "2025-01-01T00:00:00Z",
    "validTo": "2025-12-31T23:59:59Z",
    "type": "ANNUAL",
    "vehicleCategory": "D1",
    "isCurrentlyValid": true,
    "daysRemaining": 347
  }
}
```

#### Response - Prošlá známka
```json
{
  "checkType": "HIGHWAY_VIGNETTE",
  "status": "EXPIRED",
  "checkedAt": "2025-01-18T10:30:00Z",
  "source": "SFDI",
  "vignette": {
    "vehicleIdentifier": "4A3AB36F97E123456",
    "identifierType": "VIN",
    "validFrom": "2024-01-01T00:00:00Z",
    "validTo": "2024-12-31T23:59:59Z",
    "type": "ANNUAL",
    "isCurrentlyValid": false,
    "expiredDaysAgo": 18
  },
  "info": {
    "message": "Dálniční známka vypršela před 18 dny",
    "severity": "INFO"
  }
}
```

---

### 5.5 Historie STK (technické kontroly)

**Zdroj:** MDCR (Ministerstvo dopravy)
**Vstup:** VIN
**Účel:** Historie technických kontrol a emisí

#### Response
```json
{
  "checkType": "INSPECTION_HISTORY",
  "status": "OK",
  "checkedAt": "2025-01-18T10:30:00Z",
  "source": "MDCR",
  "inspections": [
    {
      "date": "2024-06-15",
      "type": "REGULAR",
      "station": "STK Praha 4",
      "result": "PASSED",
      "odometer": 118500,
      "validUntil": "2026-06-15",
      "defects": []
    },
    {
      "date": "2022-06-10",
      "type": "REGULAR",
      "station": "STK Praha 10",
      "result": "PASSED_WITH_MINOR_DEFECTS",
      "odometer": 72100,
      "validUntil": "2024-06-10",
      "defects": [
        {
          "code": "B01",
          "description": "Opotřebení brzdových destiček",
          "severity": "MINOR"
        }
      ]
    }
  ],
  "emissions": [
    {
      "date": "2024-06-15",
      "result": "PASSED",
      "validUntil": "2026-06-15"
    }
  ],
  "currentStatus": {
    "stkValid": true,
    "stkValidUntil": "2026-06-15",
    "emissionsValid": true,
    "emissionsValidUntil": "2026-06-15"
  }
}
```

---

## 6. Souhrnná API struktura pro MVP

### 6.1 Unified Request

```typescript
interface ProverkaRequest {
  // Typ prověřovaného subjektu
  subjectType: 'PERSON' | 'COMPANY' | 'VEHICLE';

  // Data subjektu (podle typu)
  person?: {
    socialSecurityNumber: string;  // Rodné číslo bez lomítka
    firstName?: string;
    lastName?: string;
    birthDate?: string;            // ISO 8601
  };

  company?: {
    ico: string;                   // 8 číslic
    dic?: string;                  // CZ + IČO
    name?: string;
  };

  vehicle?: {
    vin: string;                   // 17 znaků
    spz?: string;                  // Registrační značka
    currentOdometer?: number;      // Aktuální km
    make?: string;                 // Značka
    model?: string;                // Model
    year?: number;                 // Rok výroby
  };

  document?: {
    type: 'ID_CARD' | 'PASSPORT' | 'DRIVING_LICENSE';
    number: string;
  };

  // Které kontroly provést
  checks: CheckType[];

  // 🎮 Mock control (pouze pro MVP)
  mockScenario?: MockScenario;
}

type CheckType =
  // Osoby
  | 'EXECUTION'
  | 'INSOLVENCY'
  // Firmy
  | 'ARES_EXISTENCE'
  | 'COMPANY_AGE'
  | 'VAT_RELIABILITY'
  | 'COMPANY_DIRECTORS'
  // Doklady
  | 'DOCUMENT_VALIDITY'
  // Vozidla
  | 'VEHICLE_BLACKLIST'
  | 'ODOMETER_CHECK'
  | 'ACCIDENT_HISTORY'
  | 'HIGHWAY_VIGNETTE'
  | 'INSPECTION_HISTORY';
```

### 6.2 Unified Response

```typescript
interface ProverkaResponse {
  requestId: string;
  timestamp: string;
  processingTimeMs: number;

  // Souhrnné hodnocení
  overallStatus: 'OK' | 'WARNING' | 'BLOCKED';

  // Výsledky jednotlivých kontrol
  results: CheckResult[];

  // Důvody blokace (pokud overallStatus === 'BLOCKED')
  blockingReasons: BlockingReason[];

  // Varování (pokud overallStatus === 'WARNING')
  warnings: Warning[];
}

interface CheckResult {
  checkType: CheckType;
  status: 'OK' | 'WARNING' | 'FAILED' | 'ERROR' | 'NOT_AVAILABLE';
  source: string;
  checkedAt: string;
  data: any;  // Specifická data podle typu kontroly
  error?: {
    code: string;
    message: string;
  };
}

interface BlockingReason {
  checkType: CheckType;
  code: string;
  message: string;
  severity: 'CRITICAL';
}

interface Warning {
  checkType: CheckType;
  code: string;
  message: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
}
```

---

## 7. Mock scénáře pro testování

### 7.1 Přehled scénářů

```typescript
enum MockScenario {
  // === OSOBY ===
  PERSON_CLEAN = 'person_clean',
  PERSON_EXECUTION_SMALL = 'person_execution_small',
  PERSON_EXECUTION_LARGE = 'person_execution_large',
  PERSON_EXECUTION_MULTIPLE = 'person_execution_multiple',
  PERSON_INSOLVENCY_FILED = 'person_insolvency_filed',
  PERSON_INSOLVENCY_BANKRUPTCY = 'person_insolvency_bankruptcy',
  PERSON_INSOLVENCY_DEBT_RELIEF = 'person_insolvency_debt_relief',
  PERSON_BOTH_EXECUTION_INSOLVENCY = 'person_both',

  // === FIRMY ===
  COMPANY_CLEAN = 'company_clean',
  COMPANY_NOT_FOUND = 'company_not_found',
  COMPANY_TOO_YOUNG = 'company_too_young',
  COMPANY_VAT_UNRELIABLE = 'company_vat_unreliable',
  COMPANY_DIRECTOR_TOO_OLD = 'company_director_too_old',
  COMPANY_DIRECTOR_TOO_YOUNG = 'company_director_too_young',
  COMPANY_MULTIPLE_ISSUES = 'company_multiple_issues',

  // === DOKLADY ===
  DOCUMENT_VALID = 'document_valid',
  DOCUMENT_STOLEN = 'document_stolen',
  DOCUMENT_LOST = 'document_lost',
  DOCUMENT_EXPIRED = 'document_expired',

  // === VOZIDLA ===
  VEHICLE_CLEAN = 'vehicle_clean',
  VEHICLE_STOLEN = 'vehicle_stolen',
  VEHICLE_WANTED = 'vehicle_wanted',
  VEHICLE_ODOMETER_TAMPERED = 'vehicle_odometer_tampered',
  VEHICLE_ACCIDENT_MINOR = 'vehicle_accident_minor',
  VEHICLE_ACCIDENT_MAJOR = 'vehicle_accident_major',
  VEHICLE_ACCIDENT_TOTAL_LOSS = 'vehicle_accident_total_loss',
  VEHICLE_HIGHWAY_EXPIRED = 'vehicle_highway_expired',
  VEHICLE_STK_FAILED = 'vehicle_stk_failed',
  VEHICLE_MULTIPLE_ISSUES = 'vehicle_multiple_issues',
}
```

### 7.2 Mapování scénářů na výsledky

| Scénář | overallStatus | Blokující kontroly | Varování |
|--------|---------------|-------------------|----------|
| `PERSON_CLEAN` | OK | - | - |
| `PERSON_EXECUTION_SMALL` | WARNING | - | EXECUTION |
| `PERSON_EXECUTION_LARGE` | BLOCKED | EXECUTION | - |
| `PERSON_INSOLVENCY_BANKRUPTCY` | BLOCKED | INSOLVENCY | - |
| `COMPANY_NOT_FOUND` | BLOCKED | ARES_EXISTENCE | - |
| `COMPANY_TOO_YOUNG` | WARNING | - | COMPANY_AGE |
| `DOCUMENT_STOLEN` | BLOCKED | DOCUMENT_VALIDITY | - |
| `VEHICLE_STOLEN` | BLOCKED | VEHICLE_BLACKLIST | - |
| `VEHICLE_ODOMETER_TAMPERED` | WARNING | - | ODOMETER_CHECK |

---

## 8. Implementační poznámky

### 8.1 Zpoždění simulace

Pro realističnost doporučuji přidat umělé zpoždění:

```typescript
const SIMULATED_DELAYS = {
  EXECUTION: { min: 500, max: 1500 },
  INSOLVENCY: { min: 500, max: 1500 },
  ARES_EXISTENCE: { min: 300, max: 800 },
  VEHICLE_BLACKLIST: { min: 1000, max: 3000 },
  ODOMETER_CHECK: { min: 800, max: 2000 },
};

function getRandomDelay(checkType: CheckType): number {
  const config = SIMULATED_DELAYS[checkType] || { min: 200, max: 500 };
  return Math.random() * (config.max - config.min) + config.min;
}
```

### 8.2 Error handling

```typescript
interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  retryable: boolean;
}

const ERROR_CODES = {
  // Validační chyby
  'INVALID_SSN': { message: 'Neplatné rodné číslo', retryable: false },
  'INVALID_ICO': { message: 'Neplatné IČO', retryable: false },
  'INVALID_VIN': { message: 'Neplatné VIN', retryable: false },

  // Systémové chyby
  'SERVICE_UNAVAILABLE': { message: 'Služba není dostupná', retryable: true },
  'TIMEOUT': { message: 'Vypršel časový limit', retryable: true },
  'RATE_LIMITED': { message: 'Příliš mnoho požadavků', retryable: true },
};
```

### 8.3 Validace vstupů

```typescript
// Rodné číslo (bez lomítka, 9-10 číslic)
const SSN_REGEX = /^\d{9,10}$/;

// IČO (8 číslic)
const ICO_REGEX = /^\d{8}$/;

// DIČ (CZ + 8-10 číslic)
const DIC_REGEX = /^CZ\d{8,10}$/;

// VIN (17 alfanumerických znaků, bez I, O, Q)
const VIN_REGEX = /^[A-HJ-NPR-Z0-9]{17}$/;

// Číslo OP (9 číslic)
const ID_CARD_REGEX = /^\d{9}$/;
```

---

## 9. Přílohy

### 9.1 Zdrojové služby - přehled URL

| Služba | Prostředí | URL |
|--------|-----------|-----|
| CebiaExecutions | PROD | `https://cebiaexecutions-mp.api.aures.app` |
| CebiaService | PROD | `https://cebia-mp.api.aures.app` |
| CheckService | PROD | `https://check-mp.api.aures.app` |
| ARES REST | PROD | `https://ares.gov.cz/ekonomicke-subjekty-v-be/rest` |
| Registr DPH | PROD | SOAP služba FS |
| MVČR | PROD | `https://aplikace.mvcr.cz/neplatne-doklady/` |

### 9.2 Kontakty a dokumentace

- **Cebia API dokumentace:** Swagger UI na jednotlivých službách (`/swagger/ui/index`)
- **ARES API dokumentace:** https://ares.gov.cz/stranky/dokumentace-api
- **MVČR Registr neplatných dokladů:** https://www.mvcr.cz/clanek/neplatne-doklady.aspx

---

## 10. Changelog

| Verze | Datum | Změny |
|-------|-------|-------|
| 1.0 | 2025-01-18 | Iniciální verze dokumentu |
