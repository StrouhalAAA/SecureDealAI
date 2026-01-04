# E2E Testing Plan with Claude-in-Chrome

> **Phase**: 4 - Testing & Polish
> **Status**: Optional (alternative to 04_01 using Chrome MCP)
> **Depends On**: All Phase 3 tasks (Frontend)
> **Tool**: claude-in-chrome MCP

---

## Overview

This plan specifies how to use `claude-in-chrome` MCP tools for automated E2E testing of SecureDealAI frontend once Phase 3 is complete.

### Prerequisites

- Chrome browser with Claude extension installed
- SecureDealAI frontend running (local or deployed)
- Backend APIs functional (Phase 2 complete)
- Test documents in `test_data/` folder

---

## Tool Reference

| Tool | Usage |
|------|-------|
| `tabs_context_mcp` | Initialize session, get tab IDs |
| `tabs_create_mcp` | Create new test tab |
| `navigate` | Go to app URL |
| `read_page` | Get accessibility tree, find elements |
| `find` | Natural language element search |
| `form_input` | Fill form fields by ref ID |
| `computer` | Click, type, screenshot, scroll |
| `javascript_tool` | Execute JS assertions |
| `read_console_messages` | Check for JS errors |
| `read_network_requests` | Monitor API calls |
| `gif_creator` | Record test sessions |

---

## Test Suites

### Suite 1: Dashboard (Task 3.2)

**File**: `MVPScope/ImplementationPlan/03_02_DASHBOARD_PAGE.md`

| Test ID | Test Name | Steps |
|---------|-----------|-------|
| DASH-01 | Page loads | Navigate, screenshot, verify header "SecureDealAI" |
| DASH-02 | List displays | `read_page` → find table with SPZ column |
| DASH-03 | Create button | `find("Nová příležitost button")` → click |
| DASH-04 | Search works | `form_input` search field → type SPZ → verify filtered |
| DASH-05 | Pagination | `find("Další button")` → click → verify page change |
| DASH-06 | Status colors | `read_page` → verify GREEN/ORANGE/RED indicators |
| DASH-07 | Open detail | Click "Otevřít" → verify navigation to detail page |

**Test Script**:
```
1. tabs_context_mcp(createIfEmpty: true)
2. tabs_create_mcp()
3. navigate(url: "http://localhost:5173", tabId: X)
4. computer(action: "screenshot", tabId: X)
5. find(query: "SecureDealAI header", tabId: X)
6. find(query: "table with SPZ column", tabId: X)
7. find(query: "Nová příležitost button", tabId: X)
8. read_console_messages(tabId: X, onlyErrors: true)
```

---

### Suite 2: Vehicle Form (Task 3.3)

**File**: `MVPScope/ImplementationPlan/03_03_VEHICLE_FORM.md`

| Test ID | Test Name | Steps |
|---------|-----------|-------|
| VEH-01 | Form renders | Navigate to detail → verify "Krok 1: Data vozidla" |
| VEH-02 | SPZ input | `form_input` SPZ field → verify uppercase transform |
| VEH-03 | VIN validation | Enter 16-char VIN → verify error shown |
| VEH-04 | VIN valid | Enter 17-char VIN → verify no error |
| VEH-05 | Required fields | Submit empty → verify validation errors |
| VEH-06 | Save success | Fill all required → submit → verify API call |

**Test Script**:
```
1. navigate(url: "http://localhost:5173/opportunity/new", tabId: X)
2. find(query: "SPZ input field", tabId: X)
3. form_input(ref: "ref_spz", value: "5L94454", tabId: X)
4. find(query: "VIN input field", tabId: X)
5. form_input(ref: "ref_vin", value: "YV1PZA3TCL1103985", tabId: X)
6. find(query: "Majitel input field", tabId: X)
7. form_input(ref: "ref_owner", value: "OSIT S.R.O.", tabId: X)
8. find(query: "Další krok button", tabId: X)
9. computer(action: "left_click", ref: "ref_next", tabId: X)
10. read_network_requests(tabId: X, urlPattern: "/api/vehicle")
```

---

### Suite 3: Vendor Form (Task 3.4)

**File**: `MVPScope/ImplementationPlan/03_04_VENDOR_FORM.md`

| Test ID | Test Name | Steps |
|---------|-----------|-------|
| VND-01 | FO/PO toggle | Click toggle → verify form fields change |
| VND-02 | ARES lookup (PO) | Enter IČO → click lookup → verify auto-fill |
| VND-03 | ARES not found | Enter invalid IČO → verify error message |
| VND-04 | FO fields | Toggle to FO → verify rodné číslo field |
| VND-05 | Address fields | Verify street, city, zip fields present |

**Test Script**:
```
1. navigate(url: "http://localhost:5173/opportunity/{id}/vendor", tabId: X)
2. find(query: "vendor type toggle", tabId: X)
3. computer(action: "left_click", ref: "ref_toggle_po", tabId: X)
4. find(query: "IČO input field", tabId: X)
5. form_input(ref: "ref_ico", value: "27074358", tabId: X)
6. find(query: "Ověřit v ARES button", tabId: X)
7. computer(action: "left_click", ref: "ref_ares", tabId: X)
8. computer(action: "wait", duration: 2, tabId: X)
9. read_network_requests(tabId: X, urlPattern: "ares-lookup")
10. find(query: "company name field", tabId: X) → verify auto-filled
```

---

### Suite 4: Document Upload (Task 3.6)

**File**: `MVPScope/ImplementationPlan/03_06_DOCUMENT_UPLOAD.md`

| Test ID | Test Name | Steps |
|---------|-----------|-------|
| DOC-01 | Drop zones render | Verify ORV, OP, VTP upload areas |
| DOC-02 | Click to upload | Click zone → verify file dialog |
| DOC-03 | File type check | Upload .txt → verify rejection |
| DOC-04 | Size limit | Upload >10MB → verify error |
| DOC-05 | Success state | Upload PDF → verify checkmark shown |
| DOC-06 | Delete file | Click delete → verify removal |
| DOC-07 | OCR triggered | After upload → verify OCR API called |

**Test Script**:
```
1. navigate(url: "http://localhost:5173/opportunity/{id}/documents", tabId: X)
2. find(query: "ORV upload dropzone", tabId: X)
3. find(query: "OP upload dropzone", tabId: X)
4. computer(action: "screenshot", tabId: X)
# Note: File upload requires upload_image tool or manual interaction
5. read_network_requests(tabId: X, urlPattern: "document-upload")
6. computer(action: "wait", duration: 3, tabId: X)
7. read_network_requests(tabId: X, urlPattern: "ocr-extract")
```

---

### Suite 5: OCR Status (Task 3.7)

**File**: `MVPScope/ImplementationPlan/03_07_OCR_STATUS.md`

| Test ID | Test Name | Steps |
|---------|-----------|-------|
| OCR-01 | Processing state | Upload doc → verify spinner shown |
| OCR-02 | Success state | After OCR → verify checkmark + extracted preview |
| OCR-03 | Failure state | Bad image → verify error message |
| OCR-04 | Retry button | Click retry → verify new OCR request |

---

### Suite 6: Validation Result (Task 3.8)

**File**: `MVPScope/ImplementationPlan/03_08_VALIDATION_RESULT.md`

| Test ID | Test Name | Steps |
|---------|-----------|-------|
| VAL-01 | GREEN display | After validation → verify green banner |
| VAL-02 | ORANGE display | Partial match → verify orange banner + warnings |
| VAL-03 | RED display | Critical mismatch → verify red banner + blocked |
| VAL-04 | Field comparison | Verify table with Manual vs OCR columns |
| VAL-05 | Match indicators | Verify checkmarks/warnings per field |
| VAL-06 | Issues list | Verify expandable issues section |

**Test Script**:
```
1. navigate(url: "http://localhost:5173/opportunity/{id}/validation", tabId: X)
2. computer(action: "wait", duration: 2, tabId: X)
3. find(query: "validation status banner", tabId: X)
4. javascript_tool(text: "document.querySelector('[data-status]')?.dataset.status", tabId: X)
5. find(query: "field comparison table", tabId: X)
6. read_page(tabId: X, filter: "all")
7. computer(action: "screenshot", tabId: X)
```

---

### Suite 7: Detail Page Navigation (Task 3.9)

**File**: `MVPScope/ImplementationPlan/03_09_DETAIL_PAGE.md`

| Test ID | Test Name | Steps |
|---------|-----------|-------|
| NAV-01 | Step indicator | Verify 4-step progress bar |
| NAV-02 | Step 1→2 | Complete vehicle → advance to vendor |
| NAV-03 | Step 2→3 | Complete vendor → advance to documents |
| NAV-04 | Step 3→4 | Complete docs → advance to validation |
| NAV-05 | Back navigation | Click back → return to previous step |
| NAV-06 | Data persistence | Navigate away → return → data preserved |

---

### Suite 8: Full Integration Flow (Task 4.1)

**File**: `MVPScope/ImplementationPlan/04_01_E2E_TESTING.md`

| Test ID | Test Name | Scenario |
|---------|-----------|----------|
| E2E-01 | Happy path GREEN | Complete flow with matching data |
| E2E-02 | ORANGE flow | Minor mismatches trigger warnings |
| E2E-03 | RED flow | Critical mismatch blocks transaction |
| E2E-04 | Company (PO) | ARES lookup + validation |
| E2E-05 | Individual (FO) | OP document + personal ID validation |

---

## Recording Test Sessions

For each test suite, record a GIF for documentation:

```
# Start recording
gif_creator(action: "start_recording", tabId: X)
computer(action: "screenshot", tabId: X)

# Run test steps...

# End recording
computer(action: "screenshot", tabId: X)
gif_creator(action: "stop_recording", tabId: X)
gif_creator(action: "export", tabId: X, download: true, filename: "suite-1-dashboard.gif")
```

---

## Error Detection

After each test, check for errors:

```
# Check console for JS errors
read_console_messages(tabId: X, onlyErrors: true, pattern: "error|exception")

# Check network for failed API calls
read_network_requests(tabId: X)
# Filter for status >= 400
```

---

## Test Data

### Sample Vehicle
```json
{
  "spz": "5L94454",
  "vin": "YV1PZA3TCL1103985",
  "owner": "OSIT S.R.O.",
  "brand": "VOLVO",
  "model": "V90 CROSS COUNTRY"
}
```

### Sample Company (PO)
```json
{
  "ico": "27074358",
  "dic": "CZ27074358",
  "name": "OSIT S.R.O.",
  "address": "Mníšek 420"
}
```

### Test Documents
| File | Type | Purpose |
|------|------|---------|
| `test_data/5L94454_ORV.pdf` | ORV | Vehicle registration |
| `test_data/5L94454_OP.pdf` | OP | Personal ID |
| `test_data/bad_quality.jpg` | ORV | OCR failure test |

---

## Execution Order

1. **Suite 1**: Dashboard (entry point)
2. **Suite 2**: Vehicle Form (step 1)
3. **Suite 3**: Vendor Form (step 2)
4. **Suite 4**: Document Upload (step 3)
5. **Suite 5**: OCR Status (async)
6. **Suite 6**: Validation Result (step 4)
7. **Suite 7**: Navigation (integration)
8. **Suite 8**: Full E2E flows

---

## Implementation Plan Files Requiring Tests

| Task | File | Test Suite |
|------|------|------------|
| 3.2 | `03_02_DASHBOARD_PAGE.md` | Suite 1 |
| 3.3 | `03_03_VEHICLE_FORM.md` | Suite 2 |
| 3.4 | `03_04_VENDOR_FORM.md` | Suite 3 |
| 3.5 | `03_05_ARES_STATUS.md` | Suite 3 (VND-02, VND-03) |
| 3.6 | `03_06_DOCUMENT_UPLOAD.md` | Suite 4 |
| 3.7 | `03_07_OCR_STATUS.md` | Suite 5 |
| 3.8 | `03_08_VALIDATION_RESULT.md` | Suite 6 |
| 3.9 | `03_09_DETAIL_PAGE.md` | Suite 7 |
| 3.10 | `03_10_VALIDATION_SIDEBAR.md` | Suite 6 (additional) |
| 4.1 | `04_01_E2E_TESTING.md` | Suite 8 |

---

## ADWS Integration

To run E2E tests via ADWS after frontend implementation:

```bash
# Create test runner task
cd adws/
uv run run_task.py 04_01 --skip-deps
```

The test runner would:
1. Start local dev server
2. Initialize browser session via `tabs_context_mcp`
3. Execute test suites in order
4. Capture screenshots and GIFs
5. Report pass/fail results
6. Check console/network for errors

---

## Completion Criteria

- [ ] All 8 test suites passing
- [ ] No JS console errors
- [ ] All API calls return 2xx
- [ ] GIF recordings for each suite
- [ ] Bug report for any failures
