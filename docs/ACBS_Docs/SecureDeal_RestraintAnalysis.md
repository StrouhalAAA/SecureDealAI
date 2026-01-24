# SecureDeal - Restraint Reason Code Analysis

## Task Reference
- **Azure DevOps Task**: #71028
- **Project**: SecureDeal AI
- **Created**: 2026-01-15
- **Source Table**: `[Front Office CZ$Posted Purch_ Payment Schedule]`

---

## Instructions for Future Agents

### Database Connection
Use the ACBS SQL wrapper to connect to the Navision replica database:

```bash
# From ACBS root directory
./.sqlcmd-wrapper.sh rep -Q "YOUR_QUERY_HERE" -W -s"|"
```

### Target Table
```sql
[NAVI-REPLI].[Navision_FO_CZ].[dbo].[Front Office CZ$Posted Purch_ Payment Schedule]
```

### Key Columns
| Column | Description |
|--------|-------------|
| `Document No_` | Invoice/document number (e.g., FPAA110/2521722) |
| `Due Date` | Payment due date |
| `Amount` | Payment amount |
| `Restraint Reason Code` | Semicolon-separated codes (e.g., `;1;6;`) |
| `Other text` | Free text description of restraint reason |

---

## Restraint Reason Code Mapping

| Code | Meaning (CZ) | Meaning (EN) |
|------|--------------|--------------|
| **1** | PM/přepsaný ORV na Aures Holdings | Power of Attorney / Vehicle registration transfer |
| **2** | Dodání faktury | Invoice delivery |
| **3** | ID-PM od leasingové společnosti / potvrzení o ukončení leasingu | Leasing documentation |
| **4** | Dodatečné prověření KM | Additional mileage verification |
| **5** | Kontrola celkového stavu vozu | Vehicle overall condition check |
| **6** | Kontrola a ranní zkouška motoru za studena | Cold engine morning test |
| **7** | Dodání 2. klíče | Second key delivery |
| **9** | Čerstvý přepis, lhůta 10 pracovních dní | Fresh transfer, 10 working days deadline |
| **10** | Ostatní dokumenty k vozidlu | Other vehicle documents |
| **99** | Jiné (custom text in "Other text") | Other (see "Other text" column) |

### Code Format
Codes are stored as semicolon-separated values: `;1;`, `;1;6;`, `;1;2;6;`
This allows **multiple reasons** per record.

---

## Analysis Queries

### Query 1: Records with Restraint Code but NO "Other text"
Use this to find records that have a reason code but lack descriptive text.

```sql
SELECT
    [Document No_],
    [Due Date],
    [Amount],
    [Restraint Reason Code],
    [Other text]
FROM [NAVI-REPLI].[Navision_FO_CZ].[dbo].[Front Office CZ$Posted Purch_ Payment Schedule]
WHERE [Due Date] >= '2025-01-01'
  AND [Restraint Reason Code] IS NOT NULL
  AND [Restraint Reason Code] <> '0'
  AND LEN([Restraint Reason Code]) > 0
  AND ([Other text] IS NULL OR LEN(LTRIM(RTRIM([Other text]))) = 0)
ORDER BY [Due Date] DESC
```

### Query 2: Records with Restraint Code AND "Other text"
Use this to analyze records with full descriptive information.

```sql
SELECT
    [Document No_],
    [Due Date],
    [Amount],
    [Restraint Reason Code],
    [Other text]
FROM [NAVI-REPLI].[Navision_FO_CZ].[dbo].[Front Office CZ$Posted Purch_ Payment Schedule]
WHERE [Due Date] >= '2025-01-01'
  AND [Restraint Reason Code] IS NOT NULL
  AND [Restraint Reason Code] <> '0'
  AND LEN([Restraint Reason Code]) > 0
  AND [Other text] IS NOT NULL
  AND LEN(LTRIM(RTRIM([Other text]))) > 0
ORDER BY [Due Date] DESC
```

### Query 3: Monthly Summary Statistics
```sql
SELECT
    YEAR([Due Date]) as Year,
    MONTH([Due Date]) as Month,
    COUNT(*) as TotalWithRestraint,
    SUM(CASE WHEN [Other text] IS NULL OR LEN(LTRIM(RTRIM([Other text]))) = 0 THEN 1 ELSE 0 END) as NoOtherText,
    SUM(CASE WHEN [Other text] IS NOT NULL AND LEN(LTRIM(RTRIM([Other text]))) > 0 THEN 1 ELSE 0 END) as WithOtherText
FROM [NAVI-REPLI].[Navision_FO_CZ].[dbo].[Front Office CZ$Posted Purch_ Payment Schedule]
WHERE [Due Date] >= '2025-01-01'
  AND [Restraint Reason Code] IS NOT NULL
  AND [Restraint Reason Code] <> '0'
  AND LEN([Restraint Reason Code]) > 0
GROUP BY YEAR([Due Date]), MONTH([Due Date])
ORDER BY Year, Month
```

### Query 4: Restraint Code Distribution
```sql
SELECT
    [Restraint Reason Code],
    COUNT(*) as Count
FROM [NAVI-REPLI].[Navision_FO_CZ].[dbo].[Front Office CZ$Posted Purch_ Payment Schedule]
WHERE [Due Date] >= '2025-01-01'
  AND [Restraint Reason Code] IS NOT NULL
  AND [Restraint Reason Code] <> '0'
  AND LEN([Restraint Reason Code]) > 0
GROUP BY [Restraint Reason Code]
ORDER BY COUNT(*) DESC
```

---

## Analysis Results (as of 2026-01-15)

### Key Finding: Feature Introduction Date
**First Restraint Reason Code entered: 2025-01-01**

The Restraint Reason Code feature was introduced on January 1, 2025.

### Overall Statistics (since 2025-01-01)

| Metric | Value |
|--------|-------|
| **Total records with Restraint Code** | 760 |
| **Without "Other text"** | 19 (2.5%) |
| **With "Other text"** | 741 (97.5%) |

### Monthly Breakdown

| Year | Month | Total | No Text | With Text |
|------|-------|-------|---------|-----------|
| 2025 | January | 5 | 0 | 5 |
| 2025 | December | 195 | 9 | 186 |
| 2026 | January | 537 | 10 | 527 |
| 2026 | February | 23 | 0 | 23 |

### Top Restraint Codes (since 2025-01-01)

| Code | Meaning | Count |
|------|---------|-------|
| `;99;` | Other (custom text) | 266 |
| `;1;` | Power of Attorney | 212 |
| `;6;` | Cold engine test | 76 |
| `;2;` | Invoice delivery | 34 |
| `;1;6;` | PoA + Cold test | 33 |
| `;1;2;` | PoA + Invoice | 30 |

---

## Insights for SecureDeal AI

1. **97.5% of restraint records have descriptive text** - the "Other text" column is well-populated
2. **Code 99 (Other) is most common (35%)** - requires NLP parsing of free text
3. **Documentation reasons dominate** - codes 1, 2, 3 (PoA, invoice, leasing docs) account for ~50%
4. **Technical checks** - codes 4, 5, 6 (KM, condition, cold start) account for ~20%
5. **Feature is actively used** - 537 records in January 2026 alone

### Recommended AI Training Categories
1. **Documentation** - PM, faktury, leasing (codes 1, 2, 3)
2. **Technical Verification** - KM, stav vozu, studený start (codes 4, 5, 6)
3. **Accessories** - 2. klíč, kola (code 7)
4. **Administrative** - čerstvý přepis, dokumenty (codes 9, 10)
5. **Custom/Other** - NLP parsing required (code 99)

---

## Execution Example

```bash
# Run from ACBS root
ACBS_ROOT=$(git rev-parse --show-toplevel)
cd "$ACBS_ROOT"

# Execute Query 1 (no Other text)
./.sqlcmd-wrapper.sh rep -Q "
SELECT [Document No_], [Due Date], [Restraint Reason Code]
FROM [NAVI-REPLI].[Navision_FO_CZ].[dbo].[Front Office CZ\$Posted Purch_ Payment Schedule]
WHERE [Due Date] >= '2025-01-01'
  AND [Restraint Reason Code] <> '0'
  AND LEN([Restraint Reason Code]) > 0
  AND ([Other text] IS NULL OR LEN(LTRIM(RTRIM([Other text]))) = 0)
" -W -s"|"
```

---

## Related Files
- `Zadrzne.md` - Original use case description
- Task #71028 - Azure DevOps task for SecureDeal data analysis
