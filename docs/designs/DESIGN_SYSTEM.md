# SecureDealAI Design System

> **Purpose**: Bridge the Figma mobile design with the desktop Vue/Tailwind implementation for consistent MVP experience.

## Overview

This design system unifies:
- **Source**: Figma "New Buying Guide" (Material Design 3 foundation)
- **Target**: Vue 3 + Tailwind CSS desktop application
- **Goal**: Visual consistency across platforms without pixel-perfect matching

---

## Color System

### Primary Palette

The Figma design uses a **professional blue-grey** primary color. Map to Tailwind:

| Token | Figma Hex | Tailwind Equivalent | Usage |
|-------|-----------|---------------------|-------|
| `primary` | `#485e92` | `blue-700` / custom | Primary buttons, active states, links |
| `on-primary` | `#ffffff` | `white` | Text on primary backgrounds |
| `primary-container` | `#d9dff6` | `blue-100` | Primary subtle backgrounds |
| `on-primary-container` | `#324574` | `blue-800` | Text on primary containers |

### Secondary Palette

| Token | Figma Hex | Tailwind Equivalent | Usage |
|-------|-----------|---------------------|-------|
| `secondary` | `#585f72` | `gray-600` | Secondary text, icons |
| `secondary-container` | `#d9dff6` | `gray-100` / `blue-50` | Secondary backgrounds |
| `on-secondary-container` | `#404659` | `gray-700` | Text on secondary containers |

### Surface & Background

| Token | Figma Hex | Tailwind Equivalent | Usage |
|-------|-----------|---------------------|-------|
| `surface` | `#faf8ff` | `gray-50` / `white` | Page background |
| `surface-container` | `#eeedf4` | `gray-100` | Card backgrounds |
| `surface-container-high` | `#e8e7ef` | `gray-200` | Elevated cards, headers |
| `surface-container-low` | `#f4f3fa` | `gray-50` | Subtle containers |

### Text Colors

| Token | Figma Hex | Tailwind Equivalent | Usage |
|-------|-----------|---------------------|-------|
| `on-surface` | `#1a1b21` | `gray-900` | Primary text |
| `on-surface-variant` | `#44464f` | `gray-600` | Secondary/helper text |
| `outline` | `#757780` | `gray-400` | Borders, dividers |
| `outline-variant` | `#c5c6d0` | `gray-300` | Subtle borders |

### Status Colors (Validation System)

These are critical for the validation workflow - **keep current implementation**:

| Status | Figma | Current Tailwind | Usage |
|--------|-------|------------------|-------|
| **Success/Green** | `#76BE34` | `green-500` / `#22c55e` | Passed validation |
| **Warning/Orange** | M3 warning | `orange-500` / `#f97316` | Manual review needed |
| **Error/Red** | `#b3261e` | `red-500` / `#ef4444` | Blocked/Failed |
| **Neutral/Gray** | `#757780` | `gray-500` | Pending/Incomplete |

### Tailwind Config Extension

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        // Existing status colors (keep)
        'status-green': '#22c55e',
        'status-orange': '#f97316',
        'status-red': '#ef4444',

        // Figma-aligned primary (optional addition)
        'primary': {
          DEFAULT: '#485e92',
          50: '#f4f6fb',
          100: '#d9dff6',
          200: '#adc3fe',
          500: '#485e92',
          600: '#3d5080',
          700: '#324574',
          800: '#283861',
          900: '#1e2a4a',
        },

        // Surface colors
        'surface': {
          DEFAULT: '#faf8ff',
          container: '#eeedf4',
          'container-high': '#e8e7ef',
          'container-low': '#f4f3fa',
        },
      },
    },
  },
}
```

---

## Typography

### Font Family

| Platform | Font | Fallback |
|----------|------|----------|
| Figma (Mobile) | Roboto | - |
| Desktop (Current) | System UI | `-apple-system, BlinkMacSystemFont, sans-serif` |

**Recommendation**: Keep system fonts for desktop (better performance, native feel). The visual difference is minimal for MVP.

### Type Scale

Map Figma's M3 type scale to Tailwind:

| Figma Token | Size | Weight | Tailwind Class | Usage |
|-------------|------|--------|----------------|-------|
| `title-large` | 22px | 400 | `text-xl font-normal` | Page titles |
| `title-medium` | 16px | 500 | `text-base font-medium` | Section headers |
| `title-small` | 14px | 500 | `text-sm font-medium` | Card titles, labels |
| `body-large` | 16px | 400 | `text-base` | Primary body text |
| `body-medium` | 14px | 400 | `text-sm` | Standard UI text |
| `body-small` | 12px | 400 | `text-xs` | Captions, hints |
| `label-large` | 14px | 500 | `text-sm font-medium` | Button text, form labels |
| `label-small` | 11px | 400 | `text-xs` | Badges, tags |

### Typography Utility Classes

```css
/* Optional: Add to main.css for semantic typography */
.text-title-large { @apply text-xl font-normal tracking-tight; }
.text-title-medium { @apply text-base font-medium; }
.text-title-small { @apply text-sm font-medium; }
.text-body-large { @apply text-base; }
.text-body-medium { @apply text-sm; }
.text-body-small { @apply text-xs text-gray-600; }
.text-label-large { @apply text-sm font-medium; }
.text-label-small { @apply text-xs; }
```

---

## Spacing & Layout

### Spacing Scale

Figma uses 4px base grid. Tailwind's default scale aligns well:

| Figma | Tailwind | Pixels | Usage |
|-------|----------|--------|-------|
| 4 | `1` | 4px | Tight spacing, icon gaps |
| 8 | `2` | 8px | Standard element gaps |
| 12 | `3` | 12px | Section padding (small) |
| 16 | `4` | 16px | Card padding, form spacing |
| 24 | `6` | 24px | Section padding (large) |
| 32 | `8` | 32px | Page margins |

### Layout Patterns

**Mobile (Figma)**:
- Single column
- Full-width cards
- Bottom-anchored actions

**Desktop (Current)**:
- Multi-column grids (`md:grid-cols-2`)
- Fixed-width containers (`max-w-7xl`)
- Inline/right-aligned actions

**Keep desktop patterns** - they're optimized for larger screens.

---

## Border Radius

| Figma Token | Value | Tailwind | Usage |
|-------------|-------|----------|-------|
| `corner-extra-small` | 4px | `rounded` | Small badges, chips |
| `corner-small` | 8px | `rounded-lg` | Buttons, inputs, cards |
| `corner-medium` | 12px | `rounded-xl` | Dialogs, large cards |
| `corner-large` | 16px | `rounded-2xl` | Feature cards, modals |
| `corner-full` | 1000px | `rounded-full` | Pills, avatars, icons |

**Current usage**: `rounded-lg` (8px) is the standard - **keep this**.

---

## Elevation & Shadows

| Figma Level | Tailwind | Usage |
|-------------|----------|-------|
| Level 0 | - | Flat surfaces |
| Level 1 | `shadow-sm` | Subtle lift |
| Level 2 | `shadow` | Cards, buttons |
| Level 3 | `shadow-lg` | Dropdowns, popovers |
| Level 4 | `shadow-xl` | Modals, dialogs |

**Current usage**: `shadow`, `shadow-lg`, `shadow-xl` - **keep this**.

---

## Components

### Buttons

#### Primary Button
```html
<!-- Figma-aligned -->
<button class="px-4 py-2 bg-primary text-white rounded-lg font-medium
               hover:bg-primary-600 focus:ring-2 focus:ring-primary-200
               focus:ring-offset-2 transition-colors">
  Potvrdit
</button>

<!-- Current (acceptable for MVP) -->
<button class="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium
               hover:bg-blue-700 focus:ring-2 focus:ring-blue-500
               focus:ring-offset-2 transition-colors">
  Potvrdit
</button>
```

#### Secondary Button
```html
<button class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium
               hover:bg-gray-200 focus:ring-2 focus:ring-gray-300
               focus:ring-offset-2 transition-colors">
  Zrušit
</button>
```

#### Button Sizes
| Size | Padding | Text | Usage |
|------|---------|------|-------|
| Small | `px-3 py-1.5` | `text-sm` | Inline actions |
| Medium | `px-4 py-2` | `text-sm` | Standard buttons |
| Large | `px-6 py-3` | `text-base` | Primary CTAs |

### Form Inputs

```html
<!-- Standard Input -->
<div class="space-y-1">
  <label class="text-sm font-medium text-gray-700">SPZ</label>
  <input type="text"
         class="w-full px-4 py-2 border border-gray-300 rounded-lg
                focus:ring-2 focus:ring-primary-200 focus:border-primary
                placeholder-gray-400 transition-colors"
         placeholder="Např. 1A2 3456" />
  <p class="text-xs text-gray-500">Zadejte registrační značku vozidla</p>
</div>

<!-- Validated Input - Success -->
<input class="w-full px-4 py-2 border-2 border-green-500 bg-green-50 rounded-lg" />

<!-- Validated Input - Error -->
<input class="w-full px-4 py-2 border-2 border-red-500 bg-red-50 rounded-lg" />

<!-- Validated Input - Warning -->
<input class="w-full px-4 py-2 border-2 border-orange-500 bg-orange-50 rounded-lg" />
```

### Cards

```html
<!-- Standard Card -->
<div class="bg-white rounded-lg shadow p-6">
  <h3 class="text-lg font-semibold text-gray-900 mb-4">Údaje o vozidle</h3>
  <!-- content -->
</div>

<!-- Elevated Card (Figma surface-container-high) -->
<div class="bg-gray-100 rounded-lg shadow-lg p-6">
  <!-- content -->
</div>

<!-- Status Card -->
<div class="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
  <!-- success state -->
</div>
```

### Status Badges

```html
<!-- Validated (Green) -->
<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
             bg-green-100 text-green-700">
  ✓ Ověřeno
</span>

<!-- Warning (Orange) -->
<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
             bg-orange-100 text-orange-700">
  ~ K revizi
</span>

<!-- Error (Red) -->
<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
             bg-red-100 text-red-700">
  ✗ Blokováno
</span>

<!-- Pending (Gray) -->
<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
             bg-gray-100 text-gray-600">
  ○ Čeká na data
</span>
```

### List Items

```html
<!-- Figma-style list item with status -->
<div class="flex items-center justify-between p-4 bg-white border-b border-gray-200
            hover:bg-gray-50 transition-colors cursor-pointer">
  <div class="flex items-center gap-3">
    <div class="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
      <!-- icon -->
    </div>
    <div>
      <p class="text-sm font-medium text-gray-900">1A2 3456</p>
      <p class="text-xs text-gray-500">Škoda Octavia • 2019</p>
    </div>
  </div>
  <span class="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
    Ověřeno
  </span>
</div>
```

---

## Icons

### Recommendations

| Category | Figma | Recommendation |
|----------|-------|----------------|
| Style | Material Symbols | Use [Heroicons](https://heroicons.com/) or [Lucide](https://lucide.dev/) |
| Size | 24px default | `w-5 h-5` (20px) or `w-6 h-6` (24px) |
| Weight | 400 (regular) | Outline style |

### Common Icons Mapping

| Purpose | Suggested Icon |
|---------|---------------|
| Success | `check-circle` (green) |
| Warning | `exclamation-triangle` (orange) |
| Error | `x-circle` (red) |
| Info | `information-circle` (blue) |
| Vehicle | `truck` or custom car icon |
| Document | `document-text` |
| User/Vendor | `user` |
| Settings | `cog` |
| Refresh | `arrow-path` |

---

## Animation & Transitions

### Duration Scale

| Type | Duration | Tailwind |
|------|----------|----------|
| Micro | 100ms | `duration-100` |
| Fast | 150ms | `duration-150` |
| Normal | 200ms | `duration-200` |
| Slow | 300ms | `duration-300` |

### Common Transitions

```css
/* Button hover */
.btn { @apply transition-colors duration-150; }

/* Card hover */
.card-interactive { @apply transition-shadow duration-200 hover:shadow-lg; }

/* Modal entrance */
.modal { @apply transition-all duration-300; }
```

---

## Responsive Breakpoints

| Breakpoint | Tailwind | Usage |
|------------|----------|-------|
| Mobile | `< 640px` | Base styles |
| Tablet | `sm:` (640px+) | Two-column layouts |
| Desktop | `md:` (768px+) | Full layouts |
| Large | `lg:` (1024px+) | Wide containers |

---

## Accessibility

### Focus States
All interactive elements must have visible focus indicators:
```css
focus:outline-none focus:ring-2 focus:ring-primary-200 focus:ring-offset-2
```

### Color Contrast
- Text on backgrounds: minimum 4.5:1 ratio
- Large text: minimum 3:1 ratio
- Status colors meet WCAG AA standards

### Touch Targets
- Minimum 44x44px for mobile
- Desktop: 32x32px minimum

---

## Quick Reference: Figma → Tailwind

| Figma Property | Tailwind Class |
|---------------|----------------|
| Primary `#485e92` | `bg-blue-700` or `bg-primary` |
| Surface `#faf8ff` | `bg-gray-50` |
| On Surface `#1a1b21` | `text-gray-900` |
| Outline `#757780` | `border-gray-400` |
| Corner Small (8px) | `rounded-lg` |
| Corner Medium (12px) | `rounded-xl` |
| Title Large (22/400) | `text-xl font-normal` |
| Body Medium (14/400) | `text-sm` |
| Label Large (14/500) | `text-sm font-medium` |
| Elevation 2 | `shadow` |
| Elevation 3 | `shadow-lg` |

---

## Implementation Priority (MVP)

### Must Have
1. ✅ Status colors (green/orange/red) - already implemented
2. ✅ Basic typography scale - already implemented
3. ✅ Card and button patterns - already implemented
4. ✅ Form validation states - already implemented

### Nice to Have (Post-MVP)
1. ⬜ Custom primary color (`#485e92`)
2. ⬜ Roboto font family
3. ⬜ Surface color refinements
4. ⬜ Icon library standardization

### Not Needed for MVP
- Pixel-perfect Figma matching
- Dark mode support
- Animation refinements
- Custom shadow values

---

## Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2025-01-13 | 1.0.0 | Initial design system documentation |
