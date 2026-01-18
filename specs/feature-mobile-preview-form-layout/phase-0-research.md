# Phase 0: Research & Exploration

> **Phase Goal**: Gather technical requirements before implementation
> **Tasks**: 2
> **Dependencies**: None (can start immediately)
> **Estimated Complexity**: Simple

---

## Task 0.1: Research iPhone 15 Dimensions and iOS Design Patterns

**Complexity**: Simple
**Dependencies**: None
**Assignable**: Yes (standalone research task)

### Objective
Document the exact iPhone 15 specifications and iOS design patterns needed to create a realistic phone mockup.

### Research Items

1. **iPhone 15 Dimensions**
   - Screen size: 393 x 852 points (~1:2.17 aspect ratio)
   - Physical resolution: 1179 x 2556 pixels (3x scale)
   - Safe area insets for Dynamic Island

2. **Status Bar**
   - Height with Dynamic Island: 59px (including Dynamic Island)
   - Dynamic Island dimensions: ~126 x 37 points
   - Elements: Time (left), Dynamic Island (center), Cellular/WiFi/Battery (right)

3. **Home Indicator**
   - Height: 34px bottom safe area
   - Indicator bar: 134 x 5 points, centered

4. **Font Stack for Web**
   ```css
   font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
   ```

5. **iOS System Colors**
   | Name | Hex | Usage |
   |------|-----|-------|
   | systemGray6 | #f2f2f7 | Background |
   | systemGray5 | #e5e5ea | Secondary background |
   | systemGray4 | #d1d1d6 | Borders |
   | systemGray3 | #c7c7cc | Disabled elements |
   | systemBlue | #007aff | Primary accent |
   | label | #000000 | Primary text |
   | secondaryLabel | #3c3c43 (60% opacity) | Secondary text |

### Acceptance Criteria
- [ ] iPhone 15 dimensions documented
- [ ] Status bar height and layout documented
- [ ] Home indicator specifications documented
- [ ] SF Pro font stack fallbacks identified
- [ ] iOS color palette documented

### Output
Create a constants file or document these values for use in Phase 1 components.

---

## Task 0.2: Analyze Existing Form Structure for Refactoring

**Complexity**: Simple
**Dependencies**: None
**Assignable**: Yes (standalone research task)

### Objective
Document the current VehicleForm and VendorForm structure to ensure mobile versions maintain identical functionality.

### Files to Analyze

1. **`apps/web/src/components/forms/VehicleForm.vue`**
2. **`apps/web/src/components/forms/VendorForm.vue`**

### Research Items

#### VehicleForm.vue Fields
| Field | Type | Validation | Required |
|-------|------|------------|----------|
| `spz` | text | Format check | Yes |
| `vin` | text | 17 chars, checksum | Yes |
| `znacka` | text | - | Yes |
| `model` | text | - | Yes |
| `rok_vyroby` | number | 1900-current | Yes |
| `datum_1_registrace` | date | - | No |
| `majitel` | text | - | Yes |
| `motor` | text | - | No |
| `vykon_kw` | number | - | No |
| `tachometer_km` | number | ≥0 | No |

#### VehicleForm.vue Events
| Event | Payload | When Emitted |
|-------|---------|--------------|
| `saved` | `Vehicle` | After successful save |
| `next` | - | User clicks "Pokračovat" |

#### VendorForm.vue Fields
Document all fields including:
- Vendor type toggle (PHYSICAL_PERSON / COMPANY)
- Personal fields (jmeno, prijmeni, rodne_cislo, etc.)
- Company fields (nazev_firmy, ico, dic, etc.)
- Address fields
- Contact fields
- Bank account selection

#### VendorForm.vue Events
| Event | Payload | When Emitted |
|-------|---------|--------------|
| `saved` | `Vendor` | After successful save |
| `next` | - | User clicks forward |
| `back` | - | User clicks back |

#### Validation Logic to Preserve
- ICO checksum validation
- RC (rodné číslo) format validation
- ARES lookup integration
- Required field validation

### Acceptance Criteria
- [ ] All VehicleForm fields documented with validation rules
- [ ] All VendorForm fields documented with validation rules
- [ ] All emitted events documented
- [ ] ARES lookup integration understood
- [ ] OCR data section display pattern noted

### Output
This documentation will serve as the specification for Tasks 3.1 and 3.2 (mobile form creation).

---

## Phase Completion Checklist

- [ ] Task 0.1 completed
- [ ] Task 0.2 completed
- [ ] Research findings available for Phase 1-3 implementation

## Next Phase
Once research is complete, proceed to [Phase 1: Foundation Components](./phase-1-foundation.md)
