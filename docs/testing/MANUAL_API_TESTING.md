# Manual API Testing Scripts

> Standalone scripts for testing external API integrations (ARES, ADIS) without requiring the full application stack.

---

## Overview

These scripts allow you to manually test and debug external API integrations from the command line. They're useful for:

- Validating company data before processing
- Debugging integration issues
- Understanding API response structures
- Quick lookups without running the full application

---

## Available Scripts

| Script | Purpose | Location |
|--------|---------|----------|
| `test-ares-by-dic.ts` | Lookup company by DIČ (VAT ID) | `supabase/tests/manual/` |

---

## ARES Lookup by DIČ

### Description

Fetches all available company data from Czech government registries using DIČ (VAT ID):

- **ARES** (Administrativní registr ekonomických subjektů) - Company basic data
- **ADIS** (Automatizovaný Daňový Informační Systém) - VAT/DPH payer status

### Prerequisites

- Deno installed (`~/.deno/bin/deno` or in PATH)
- Internet connection (accesses government APIs)

### Usage

```bash
# Basic usage with CZ prefix
~/.deno/bin/deno run --allow-net supabase/tests/manual/test-ares-by-dic.ts CZ27074358

# Without CZ prefix (auto-added)
~/.deno/bin/deno run --allow-net supabase/tests/manual/test-ares-by-dic.ts 27074358

# Show help
~/.deno/bin/deno run --allow-net supabase/tests/manual/test-ares-by-dic.ts
```

### Example Output

```
============================================================
🔍 ARES LOOKUP BY DIČ
============================================================
   Input DIČ: CZ27074358
   Normalized DIČ: CZ27074358
   Extracted IČO: 27074358

📡 Fetching from ARES: https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/27074358
   ✅ Company found in ARES

📡 Fetching from ADIS (DPH registry): CZ27074358
   ✅ VAT payer found, 8 registered bank accounts

============================================================
📋 RESULTS
============================================================

📊 ARES DATA:
   IČO:           27074358
   DIČ:           CZ27074358
   Name:          Asseco Central Europe, a.s.
   Status:        ✅ ACTIVE
   Legal Form:    121
   Founded:       2003-08-06
   Address:
      Street:     Budějovická 778/3
      City:       Praha - Praha 4
      Postal:     14000
      Country:    CZ

💰 DPH (VAT) STATUS:
   VAT Payer:     ✅ YES
   Unreliable:    ✅ NO
   Registered Bank Accounts (8):
      - 802660000/2700
      - CZ3703000000000056781282
      - ...
   Checked At:    2026-01-20T19:08:14.202Z

============================================================
📄 FULL JSON OUTPUT:
============================================================
{ ... full JSON ... }
```

### Data Returned

| Source | Fields |
|--------|--------|
| **ARES** | IČO, DIČ, Company Name, Address (street, city, postal, country), Legal Form, Founded Date, Terminated Date, Active Status |
| **ADIS** | Is VAT Payer, Is Unreliable Payer, Unreliable Since Date, Registered Bank Accounts |

### Error Handling

The script handles various error scenarios:

| Scenario | Behavior |
|----------|----------|
| Invalid DIČ format | Shows error, exits with code 1 |
| Company not in ARES | Shows "Not found", continues to ADIS |
| Not a VAT payer | Shows "VAT Payer: NO" |
| API timeout | Shows error message (15s timeout) |
| Invalid IČO checksum | Shows warning but continues |

### How It Works

1. **Input Normalization**: Accepts DIČ with or without `CZ` prefix
2. **IČO Extraction**: Extracts 8-digit IČO from DIČ (Czech DIČ = `CZ` + IČO)
3. **Checksum Validation**: Validates IČO using modulo 11 algorithm
4. **ARES Lookup**: Fetches company data from ARES REST API
5. **ADIS Lookup**: Fetches DPH status from ADIS SOAP Web Service
6. **Data Merge**: Combines bank accounts from ADIS into ARES data

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success - company found |
| 1 | Error or company not found |

---

## Adding New Manual Tests

When creating new manual test scripts:

1. Place them in `supabase/tests/manual/`
2. Use Deno for consistency with Edge Functions
3. Include usage help when run without arguments
4. Return structured JSON for programmatic use
5. Add documentation to this file

### Template

```typescript
#!/usr/bin/env -S deno run --allow-net --allow-env

/**
 * Description of what this script does
 *
 * Usage:
 *   deno run --allow-net supabase/tests/manual/script-name.ts <args>
 */

async function main(): Promise<void> {
  const args = Deno.args;

  if (args.length === 0) {
    console.log(`Usage: ... <args>`);
    Deno.exit(1);
  }

  // Implementation
}

main();
```

---

## Related Documentation

- [Test Infrastructure](../implementation/Completed/01_00_TEST_INFRASTRUCTURE.md) - Automated testing setup
- [ARES Validation Scope](../architecture/ARES_VALIDATION_SCOPE.md) - What ARES validates
- [INT_02_ARES_ADIS_API](../implementation/Completed/INT_02_ARES_ADIS_API.md) - ARES/ADIS integration details

---

## Troubleshooting

### Deno not found

```bash
# Check if Deno is installed
ls -la ~/.deno/bin/deno

# If not installed
curl -fsSL https://deno.land/install.sh | sh

# Add to PATH (add to ~/.zshrc or ~/.bashrc)
export PATH="$HOME/.deno/bin:$PATH"
```

### ADIS timeout

The ADIS SOAP service can be slow. The script has a 15-second timeout. If you frequently get timeouts:

1. Check if ADIS is under maintenance (daily 00:00-00:10 CET)
2. Try again later
3. The script will still return ARES data if ADIS fails

### Network errors

Ensure you have access to:
- `https://ares.gov.cz` (ARES REST API)
- `https://adisrws.mfcr.cz` (ADIS SOAP Web Service)
