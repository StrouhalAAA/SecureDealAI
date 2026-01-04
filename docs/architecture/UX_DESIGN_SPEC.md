# SecureDealAI - UX & Design Specification

> **Purpose**: This document serves as a comprehensive prompt for defining styles, CSS, and overall UX for the SecureDealAI frontend application.

---

## 1. Product Overview

### What We're Building
SecureDealAI is a **vehicle purchase validation platform** used by automotive dealers to verify vehicle and vendor data before completing purchase transactions. The system compares manually entered data against OCR-extracted document data and external registry lookups (ARES/ADIS) to detect discrepancies and prevent fraudulent deals.

### Target Users
- **Primary**: Vehicle acquisition specialists at car dealerships
- **Context**: Office/desk environment, primarily desktop usage
- **Technical level**: Moderate - comfortable with forms and document handling
- **Language**: Czech (all UI text in Czech)

### Core Value Proposition
- Reduce manual verification errors
- Automate document comparison
- Provide clear GO/NO-GO signals with traffic light system
- Create audit trail for compliance

---

## 2. User Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Dashboard  │ ──► │  Step 1:    │ ──► │  Step 2:    │ ──► │  Step 3:    │ ──► │  Step 4:    │
│  (List)     │     │  Vehicle    │     │  Vendor     │     │  Documents  │     │  Results    │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
      │                   │                   │                   │                   │
   Create             Fill form          Fill form          Upload files        View status
   new SPZ            VIN, brand         IČO/RČ             ORV, OP, VTP       GREEN/ORANGE/RED
                      model, etc.        ARES lookup        OCR extraction     Field comparison
```

### Flow Characteristics
- **Linear 4-step wizard** with back navigation
- **Persistent state** - users can leave and resume
- **Smart step detection** - auto-advances to appropriate step based on existing data
- **Validation triggers** after document upload

---

## 3. Screen Specifications

### 3.1 Dashboard (Main List)

**Purpose**: Overview of all buying opportunities with status indicators

**Layout**:
```
┌────────────────────────────────────────────────────────────────┐
│  [Logo: SecureDealAI]                    [+ Nová příležitost]  │
├────────────────────────────────────────────────────────────────┤
│  Vyhledávání: [____________________] [🔍]                      │
├────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ SPZ        │ Status      │ Vytvořeno   │ Akce           │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │ 5L94454    │ 🟢 GREEN    │ 01.01.2026  │ [Otevřít] [🗑]  │  │
│  │ 1AB2345    │ 🟠 ORANGE   │ 01.01.2026  │ [Otevřít] [🗑]  │  │
│  │ 3XY7890    │ 🔴 RED      │ 31.12.2025  │ [Otevřít] [🗑]  │  │
│  │ 4ZZ1111    │ ⚪ DRAFT    │ 30.12.2025  │ [Otevřít] [🗑]  │  │
│  └──────────────────────────────────────────────────────────┘  │
│  Zobrazeno 1-10 z 45              [← Předchozí] [Další →]      │
└────────────────────────────────────────────────────────────────┘
```

**Key Elements**:
- Clean white card on light gray background
- Table with hover states on rows
- Status badges as colored pills
- Search with instant filtering
- Pagination with clear current position
- Primary action button (blue) in header

---

### 3.2 Detail Page (Workflow Container)

**Purpose**: Container for 4-step validation workflow

**Layout**:
```
┌────────────────────────────────────────────────────────────────┐
│  [← Dashboard]    SecureDealAI              SPZ: 5L94454       │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [●]━━━━━━━━[●]━━━━━━━━[○]━━━━━━━━[○]                          │
│   Vozidlo   Dodavatel   Dokumenty   Validace                   │
│                                                                 │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│                    [ Step Content Area ]                        │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

**Key Elements**:
- Compact header with back navigation
- SPZ prominently displayed (monospace font)
- Visual step indicator with connecting lines
- Active step highlighted, completed steps with checkmark
- Content area for step-specific forms

---

### 3.3 Step 1: Vehicle Form

**Purpose**: Manual entry of vehicle data

**Layout**:
```
┌────────────────────────────────────────────────────────────────┐
│  Krok 1: Data vozidla                                          │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  SPZ *                         VIN *                            │
│  [5L94454        ] (locked)    [YV1PZA3TCL1103985  ]           │
│                                                                 │
│  Značka                        Model                            │
│  [VOLVO           ]            [V90 CROSS COUNTRY  ]           │
│                                                                 │
│  Rok výroby                    1. registrace                    │
│  [2019            ]            [    15.08.2019     ]           │
│                                                                 │
│  Majitel / Provozovatel *                                       │
│  [OSIT S.R.O.                                      ]           │
│                                                                 │
│  Motor                         Výkon (kW)                       │
│  [benzín        ▼]             [228               ]            │
│                                                                 │
│                                          [Další krok →]         │
└────────────────────────────────────────────────────────────────┘
```

**Key Elements**:
- Two-column grid layout for related fields
- Required fields marked with red asterisk
- SPZ locked (grayed out) once created
- VIN with inline validation (17 chars, valid characters)
- Uppercase transform on text fields
- Monospace font for codes (SPZ, VIN)

---

### 3.4 Step 2: Vendor Form

**Purpose**: Vendor/seller data with ARES integration

**Two Modes**:

#### Company (Právnická osoba)
```
┌────────────────────────────────────────────────────────────────┐
│  Krok 2: Data dodavatele                                       │
├────────────────────────────────────────────────────────────────┤
│  Typ: ○ Fyzická osoba  ● Právnická osoba                       │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  IČO *                                                          │
│  [27074358  ] [🔍] ✅ Ověřeno v ARES                            │
│                                                                 │
│  Název firmy *                      (vyplněno z ARES)          │
│  [OSIT S.R.O.                       ] ← green background       │
│                                                                 │
│  DIČ                                (vyplněno z ARES)          │
│  [CZ27074358                        ] ← green background       │
│                                                                 │
│  ... address fields (auto-filled) ...                          │
│                                                                 │
│                              [← Zpět] [Další krok →]            │
└────────────────────────────────────────────────────────────────┘
```

#### Physical Person (Fyzická osoba)
```
┌────────────────────────────────────────────────────────────────┐
│  Typ: ● Fyzická osoba  ○ Právnická osoba                       │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Jméno a příjmení *                                             │
│  [PETR KUSKO                                       ]           │
│                                                                 │
│  Rodné číslo *                 Datum narození                   │
│  [800415/2585   ]              [   15.04.1980    ]             │
│                                                                 │
│  Číslo OP                      Platnost OP do                   │
│  [217215163     ]              [   22.05.2034    ]             │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

**Key Elements**:
- Radio toggle for vendor type at top
- ARES lookup button with status indicator
- Auto-filled fields highlighted with green background
- Inline status indicators (checkmark, X, spinner)
- Format hint for rodné číslo (######/####)

---

### 3.5 Step 3: Document Upload

**Purpose**: Upload documents for OCR extraction

**Layout**:
```
┌────────────────────────────────────────────────────────────────┐
│  Krok 3: Nahrání dokumentů                                     │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ORV (Malý technický průkaz) *                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │           📄 Přetáhněte soubor nebo klikněte           │    │
│  │              PDF, JPEG, PNG (max 10 MB)                │    │
│  │                                                         │    │
│  └────────────────────────────────────────────────────────┘    │
│  After upload: ✅ 5L94454_ORV.pdf (2.3 MB) [🗑]                 │
│  OCR Status: 🔄 Zpracovávám... nebo ✅ Hotovo (98%)             │
│                                                                 │
│  VTP (Velký technický průkaz)                     [nepovinné]  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │           (same drop zone pattern)                      │    │
│  └────────────────────────────────────────────────────────┘    │
│  ℹ️ Obsahuje IČO vlastníka pro ověření v ARES                   │
│                                                                 │
│  OP (Občanský průkaz) *                                         │
│  ┌────────────────────────────────────────────────────────┐    │
│  │           (same drop zone pattern)                      │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                 │
│  * povinné dokumenty                                            │
│                              [← Zpět] [Spustit validaci →]      │
└────────────────────────────────────────────────────────────────┘
```

**Key Elements**:
- Dashed border drop zones
- Drag-over highlight state (blue)
- File info display after upload
- OCR processing status with spinner
- Optional badge for VTP
- Info text below optional fields

---

### 3.6 Step 4: Validation Results

**Purpose**: Display validation outcome with field-level details

**Layout**:
```
┌────────────────────────────────────────────────────────────────┐
│  Krok 4: Výsledek validace                                     │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐    │
│  │              🟢 GREEN - Schváleno                       │    │
│  │         Všechny kontroly prošly úspěšně                │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                 │
│  Pokus #1 • 01.01.2026 14:32 • 1234ms                          │
│                                                                 │
│  Porovnání polí                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Pole     │ Manuální      │ OCR           │ Status       │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │ VIN      │ YV1PZA...985  │ YV1PZA...985  │ 🟢 MATCH     │  │
│  │ SPZ      │ 5L94454       │ 5L94454       │ 🟢 MATCH     │  │
│  │ Majitel  │ OSIT S.R.O.   │ OSIT S.R.O.   │ 🟢 MATCH     │  │
│  │ Model    │ V90           │ V90 CROSS...  │ 🟠 85%       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Upozornění (1)                                                 │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ ⚠️ Model - Částečná shoda (85%)                        │    │
│  │    Manuální: "V90" vs OCR: "V90 CROSS COUNTRY"         │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                 │
│  [🔄 Opakovat validaci]            [Zpět na dashboard]          │
└────────────────────────────────────────────────────────────────┘
```

**Key Elements**:
- Large status banner with icon and description
- Metadata row (attempt, timestamp, duration)
- Comparison table with row highlighting
- Field status badges with percentage for fuzzy matches
- Issues section with severity icons
- Action buttons for retry and close

---

## 4. Visual Design System

### 4.1 Color Palette

#### Primary Colors
| Name | Hex | Usage |
|------|-----|-------|
| **Blue-600** | `#2563EB` | Primary actions, links, active states |
| **Blue-700** | `#1D4ED8` | Primary hover states |
| **Blue-100** | `#DBEAFE` | Primary light backgrounds |

#### Status Colors (Traffic Light System)
| Status | Color | Background | Text | Usage |
|--------|-------|------------|------|-------|
| **GREEN** | `#10B981` | `#D1FAE5` | `#065F46` | Approved, match |
| **ORANGE** | `#F97316` | `#FFEDD5` | `#9A3412` | Warning, partial, review |
| **RED** | `#EF4444` | `#FEE2E2` | `#991B1B` | Blocked, mismatch, error |
| **GRAY** | `#6B7280` | `#F3F4F6` | `#374151` | Draft, pending, neutral |

#### Semantic Colors
| Name | Hex | Usage |
|------|-----|-------|
| **Success** | `#10B981` | Confirmation, verified states |
| **Warning** | `#F59E0B` | Alerts, cautions |
| **Error** | `#EF4444` | Errors, critical issues |
| **Info** | `#3B82F6` | Informational messages |

#### Neutral Colors
| Name | Hex | Usage |
|------|-----|-------|
| **Gray-50** | `#F9FAFB` | Page background |
| **Gray-100** | `#F3F4F6` | Card backgrounds, disabled |
| **Gray-200** | `#E5E7EB` | Borders, dividers |
| **Gray-300** | `#D1D5DB` | Input borders |
| **Gray-400** | `#9CA3AF` | Placeholder text |
| **Gray-500** | `#6B7280` | Secondary text |
| **Gray-700** | `#374151` | Primary text |
| **Gray-900** | `#111827` | Headings |
| **White** | `#FFFFFF` | Card surfaces |

---

### 4.2 Typography

#### Font Stack
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
font-family-mono: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
```

#### Type Scale
| Element | Size | Weight | Line Height | Usage |
|---------|------|--------|-------------|-------|
| H1 | 24px / 1.5rem | Bold (700) | 1.25 | Page titles |
| H2 | 20px / 1.25rem | Bold (700) | 1.3 | Section headers |
| H3 | 18px / 1.125rem | Semibold (600) | 1.4 | Card titles |
| Body | 16px / 1rem | Regular (400) | 1.5 | Default text |
| Small | 14px / 0.875rem | Regular (400) | 1.4 | Secondary text |
| XSmall | 12px / 0.75rem | Medium (500) | 1.3 | Labels, badges |
| Mono | 14px | Regular (400) | 1.4 | Codes: SPZ, VIN, IČO |

---

### 4.3 Spacing System

Based on 4px grid:
| Token | Size | Usage |
|-------|------|-------|
| `space-1` | 4px | Tight spacing |
| `space-2` | 8px | Related elements |
| `space-3` | 12px | Form field gaps |
| `space-4` | 16px | Section padding |
| `space-6` | 24px | Card padding |
| `space-8` | 32px | Large sections |

---

### 4.4 Border Radius

| Token | Size | Usage |
|-------|------|-------|
| `rounded-sm` | 4px | Badges, tags |
| `rounded` | 6px | Inputs, buttons |
| `rounded-lg` | 8px | Cards, modals |
| `rounded-full` | 9999px | Pills, avatars |

---

### 4.5 Shadows

| Token | Definition | Usage |
|-------|------------|-------|
| `shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Subtle elevation |
| `shadow` | `0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)` | Cards |
| `shadow-lg` | `0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05)` | Modals, dropdowns |

---

## 5. Component Patterns

### 5.1 Buttons

#### Primary Button
```css
.btn-primary {
  background: #2563EB;
  color: white;
  padding: 8px 16px;
  border-radius: 8px;
  font-weight: 500;
}
.btn-primary:hover { background: #1D4ED8; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
```

#### Secondary Button
```css
.btn-secondary {
  background: white;
  border: 1px solid #D1D5DB;
  color: #374151;
  padding: 8px 16px;
  border-radius: 8px;
}
.btn-secondary:hover { background: #F9FAFB; }
```

#### Danger Button
```css
.btn-danger {
  background: #EF4444;
  color: white;
}
.btn-danger:hover { background: #DC2626; }
```

---

### 5.2 Form Inputs

#### Default State
```css
.input {
  width: 100%;
  padding: 8px 16px;
  border: 1px solid #D1D5DB;
  border-radius: 8px;
  font-size: 16px;
}
.input:focus {
  outline: none;
  border-color: #2563EB;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}
```

#### Error State
```css
.input-error {
  border-color: #EF4444;
  background: #FEF2F2;
}
```

#### Success State (ARES auto-fill)
```css
.input-success {
  border-color: #10B981;
  background: #ECFDF5;
}
```

#### Disabled State
```css
.input:disabled {
  background: #F3F4F6;
  color: #6B7280;
  cursor: not-allowed;
}
```

---

### 5.3 Status Badges

```css
.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 500;
}

.badge-green { background: #D1FAE5; color: #065F46; }
.badge-orange { background: #FFEDD5; color: #9A3412; }
.badge-red { background: #FEE2E2; color: #991B1B; }
.badge-gray { background: #F3F4F6; color: #374151; }
.badge-blue { background: #DBEAFE; color: #1E40AF; }
```

---

### 5.4 Cards

```css
.card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  padding: 24px;
}
```

---

### 5.5 Drop Zone

```css
.dropzone {
  border: 2px dashed #D1D5DB;
  border-radius: 8px;
  padding: 32px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
}

.dropzone:hover {
  border-color: #9CA3AF;
}

.dropzone-active {
  border-color: #2563EB;
  background: #EFF6FF;
}

.dropzone-success {
  border-color: #10B981;
  background: #ECFDF5;
}

.dropzone-error {
  border-color: #EF4444;
  background: #FEF2F2;
}
```

---

### 5.6 Step Indicator

```css
.step-circle {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}

.step-active { background: #2563EB; color: white; }
.step-completed { background: #10B981; color: white; }
.step-pending { background: #E5E7EB; color: #6B7280; }

.step-line {
  flex: 1;
  height: 4px;
  margin: 0 16px;
}
.step-line-completed { background: #10B981; }
.step-line-pending { background: #E5E7EB; }
```

---

## 6. Interaction Patterns

### 6.1 Loading States

- **Full page**: Centered spinner with "Načítání..." text
- **Button**: Spinner replaces text, button disabled
- **Inline**: Small spinner next to loading element
- **Table skeleton**: Animated gray bars mimicking row structure

### 6.2 Error Handling

| Severity | Display | Color | Action |
|----------|---------|-------|--------|
| Field error | Inline below input | Red | Fix and retry |
| Form error | Alert box above submit | Red | Dismiss |
| API error | Toast notification | Red | Retry button |
| Not found | Full page message | Gray | Back to dashboard |

### 6.3 Confirmations

- **Destructive actions** (delete): Modal confirmation dialog
- **Successful saves**: Subtle toast or inline checkmark
- **Form submission**: Button loading state → success message

### 6.4 Transitions

- **Page transitions**: Fade (opacity 0.2s)
- **Modal**: Fade + scale from 95%
- **Accordion/collapse**: Height + opacity
- **Hover states**: Color transitions 0.15s

---

## 7. Responsive Considerations

### Breakpoints
| Name | Width | Layout Changes |
|------|-------|----------------|
| Mobile | < 640px | Single column, stacked forms |
| Tablet | 640-1024px | Condensed table, 2-col forms |
| Desktop | > 1024px | Full layout |

### Mobile Adaptations
- Forms switch to single column
- Table becomes card list on mobile
- Bottom-fixed action buttons
- Minimum touch target: 44px
- Collapsible step indicator

---

## 8. Accessibility Requirements

- **Contrast**: All text meets WCAG AA (4.5:1 for body, 3:1 for large)
- **Focus states**: Visible focus ring (3px blue outline)
- **Labels**: All inputs have associated labels
- **Errors**: Connected via aria-describedby
- **Status changes**: Announced via role="alert"
- **Keyboard**: Full tab navigation, Enter to submit, Escape to close modals

---

## 9. Icon Usage

| Context | Icons | Format |
|---------|-------|--------|
| Status | Emoji circles: 🟢 🟠 🔴 ⚪ 🔵 | Unicode |
| Actions | Search 🔍, Delete 🗑, Refresh 🔄 | Unicode |
| Files | Document 📄 | Unicode |
| Alerts | Warning ⚠️, Info ℹ️, Check ✅, Cross ❌ | Unicode |

Consider replacing with SVG icon library (Heroicons, Lucide) for production for better styling control.

---

## 10. Summary of Key Design Decisions

1. **Traffic Light Validation**: GREEN/ORANGE/RED provides instant visual feedback
2. **Czech Language**: All UI text localized to Czech
3. **Monospace for Codes**: SPZ, VIN, IČO displayed in monospace for readability
4. **ARES Integration Visual**: Auto-filled fields highlighted with green background
5. **Progressive Disclosure**: 4-step wizard reveals complexity gradually
6. **Explicit Required Fields**: Red asterisk for mandatory fields
7. **Inline Validation**: Real-time feedback on VIN format, IČO lookup
8. **Card-based Layout**: White cards on gray background for visual hierarchy
9. **Action Clarity**: Primary actions in blue, destructive in red
10. **Status Persistence**: Clear indication of where user is in workflow

---

*This specification should provide sufficient detail for implementing consistent styles and CSS across the SecureDealAI frontend application.*
