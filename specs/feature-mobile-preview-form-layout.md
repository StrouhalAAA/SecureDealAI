# Feature: Mobile Preview Form Layout

## Feature Description
Transform the opportunity detail form into a split-screen "desktop editing + mobile preview" layout that allows users to:
1. Edit vehicle and vendor data in a compact, narrow form panel (simulating the mobile form experience)
2. See a live mobile phone preview showing how the collected data would appear in the final mobile application

This feature enables the team to validate UX concepts with users by demonstrating the actual mobile experience while the MVP frontend is still web-based. Users can immediately see how their input translates to the mobile interface, creating a tight feedback loop for design validation.

## User Story
As a product owner/designer
I want to see a live mobile preview of how data entry forms will look on mobile devices
So that I can validate the mobile UX with users before investing in native app development

As a field agent using the web app on desktop
I want the data entry form to be narrower and mobile-like
So that the experience is consistent with how I'll eventually use the mobile app

## Problem Statement
The current Detail page uses full-width forms designed for desktop viewing. However, the actual end users (vehicle purchasing agents) will use a mobile app in the field. The current implementation:
1. Doesn't simulate the mobile experience, making it hard to validate mobile UX concepts
2. Uses wide layouts that don't represent mobile constraints (single-column, limited space)
3. Provides no visual feedback on how collected data will be displayed in the final app

## Solution Statement
Create a two-panel layout on the Detail page:
1. **Left panel (40% width)**: A narrower, mobile-like form that constrains the input experience to match mobile screens
2. **Right panel (60% width)**: An iPhone-frame mockup showing a live preview of how the data would display in the native app

Key design principles:
- The form panel should mimic mobile constraints (single column, stacked fields, larger touch targets)
- The phone mockup should update in real-time as users fill in data
- The layout should be toggle-able so users can switch to full-width form if needed
- The phone preview should show a realistic app-like interface with proper styling

## Relevant Files
Use these files to implement the feature:

### Page & Layout
- `apps/web/src/pages/Detail.vue` - Main detail page that orchestrates the step flow, needs layout changes
- `apps/web/src/App.vue` - App layout reference for container styles

### Form Components (to be refactored for mobile-like view)
- `apps/web/src/components/forms/VehicleForm.vue` - Vehicle data entry form with validation
- `apps/web/src/components/forms/VendorForm.vue` - Vendor data entry form with validation
- `apps/web/src/components/shared/QuickVehicleForm.vue` - Compact form pattern reference

### Existing UI Components
- `apps/web/src/components/shared/StepProgress.vue` - Step indicator component
- `apps/web/src/components/shared/LoadingButton.vue` - Button component
- `apps/web/src/components/validation/ValidationResult.vue` - Results display

### Styling
- `apps/web/tailwind.config.js` - Tailwind configuration with custom status colors

### New Files
- `apps/web/src/components/preview/PhoneMockup.vue` - iPhone frame wrapper component
- `apps/web/src/components/preview/MobilePreviewScreen.vue` - Content that renders inside the phone
- `apps/web/src/components/preview/PreviewVehicleCard.vue` - Vehicle data display in app style
- `apps/web/src/components/preview/PreviewVendorCard.vue` - Vendor data display in app style
- `apps/web/src/components/layout/SplitFormLayout.vue` - Two-panel layout container
- `apps/web/src/components/forms/MobileVehicleForm.vue` - Mobile-optimized vehicle form
- `apps/web/src/components/forms/MobileVendorForm.vue` - Mobile-optimized vendor form

## Implementation Plan

### Phase 1: Foundation
Build the core layout infrastructure and phone mockup component.

1. Create `SplitFormLayout.vue` as a two-panel container with configurable widths
2. Create `PhoneMockup.vue` as a realistic iPhone frame with proper aspect ratio and styling
3. Add layout toggle functionality (split view vs full-width form)
4. Ensure responsive behavior - stack vertically on smaller screens

### Phase 2: Core Implementation
Implement mobile-like forms and preview components.

1. Create `MobileVehicleForm.vue` - single-column layout with larger inputs and touch-friendly design
2. Create `MobileVendorForm.vue` - similar mobile-first styling
3. Create `MobilePreviewScreen.vue` - the "app screen" content with navigation header
4. Create `PreviewVehicleCard.vue` - how vehicle data displays in the app
5. Create `PreviewVendorCard.vue` - how vendor data displays in the app
6. Wire up reactive data flow from forms to preview

### Phase 3: Integration
Connect everything in the Detail page and add polish.

1. Integrate `SplitFormLayout` into `Detail.vue`
2. Replace standard forms with mobile forms when in split view
3. Add smooth transitions between views
4. Add view toggle button in header
5. Persist layout preference in localStorage
6. Test the complete flow from vehicle to vendor to validation

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Create the Split Layout Container
- Create `apps/web/src/components/layout/SplitFormLayout.vue`
- Accept props for left/right panel widths (default 40%/60%)
- Use CSS Grid or Flexbox for the split layout
- Add responsive breakpoint to stack on screens < 1024px
- Include a slot for left panel (form) and right panel (preview)

### Step 2: Create the Phone Mockup Component
- Create `apps/web/src/components/preview/PhoneMockup.vue`
- Design an iPhone-style frame with:
  - Rounded corners (44px border-radius)
  - Notch/dynamic island area at top
  - Status bar with time, battery, signal indicators (static)
  - Home indicator bar at bottom
- Use proper iPhone 15 aspect ratio (393 x 852 points, approximately 1:2.17)
- Make the frame responsive - scale down on smaller containers
- Content slot for the screen content
- Add subtle shadow for depth

### Step 3: Create the Mobile Preview Screen Container
- Create `apps/web/src/components/preview/MobilePreviewScreen.vue`
- Accept props for `vehicle`, `vendor`, `step` (to show relevant content)
- Include a mock app header with back arrow and title
- Add a bottom navigation bar mock (for realism)
- Use a scrollable content area

### Step 4: Create Preview Vehicle Card
- Create `apps/web/src/components/preview/PreviewVehicleCard.vue`
- Accept `vehicle` prop with vehicle data
- Design a card showing:
  - Large SPZ display (license plate style)
  - VIN in monospace font
  - Make + Model as title
  - Owner name
  - Key specs in a grid (year, mileage, fuel type)
- Show placeholder/skeleton when data is empty
- Use app-like styling (not web form styling)

### Step 5: Create Preview Vendor Card
- Create `apps/web/src/components/preview/PreviewVendorCard.vue`
- Accept `vendor` prop with vendor data
- Design a card showing:
  - Vendor type indicator (person vs company icon)
  - Name as title
  - ICO/RC as secondary identifier
  - Address block
  - Contact info (phone, email)
  - Bank account (if present)
- Show appropriate empty states

### Step 6: Create Mobile Vehicle Form
- Create `apps/web/src/components/forms/MobileVehicleForm.vue`
- Based on existing VehicleForm but with mobile-first styling:
  - Single column layout (no side-by-side fields)
  - Larger input fields (py-3 instead of py-2)
  - Larger touch targets for buttons
  - Full-width inputs
  - Taller form sections with more breathing room
- Emit same events as VehicleForm for compatibility
- Keep all validation logic identical

### Step 7: Create Mobile Vendor Form
- Create `apps/web/src/components/forms/MobileVendorForm.vue`
- Same approach as MobileVehicleForm
- Single-column layout throughout
- Larger touch targets
- Maintain all validation and ARES lookup functionality

### Step 8: Integrate Split Layout in Detail.vue
- Import `SplitFormLayout` component
- Add a `viewMode` ref with values: `'split'` | `'full'`
- Wrap the step content in SplitFormLayout when viewMode is 'split'
- Use original forms for 'full' mode, mobile forms for 'split' mode
- Pass current form data to the preview component

### Step 9: Add View Toggle Button
- Add a toggle button in the Detail page header area
- Icon: switch between "phone + desktop" (split) and "desktop only" (full)
- Store preference in localStorage: `securedeal:layoutMode`
- Add tooltip explaining the toggle

### Step 10: Wire Reactive Data to Preview
- In Detail.vue, compute current vehicle/vendor data for preview
- Pass to MobilePreviewScreen as reactive props
- Ensure preview updates in real-time as user types
- Handle empty states gracefully

### Step 11: Style the Preview for Realism
- Add mock iOS-style fonts and spacing
- Use SF Pro-inspired font stack (system-ui, -apple-system)
- Add subtle animations for data appearing
- Include realistic loading states
- Match iOS color palette (grays, system blue)

### Step 12: Add Responsive Behavior
- On screens < 1024px, only show form (no preview)
- Add a "Show Preview" floating button on mobile-sized screens
- When tapped, show preview in full-screen modal

### Step 13: Add Unit Tests
- Test SplitFormLayout rendering
- Test PhoneMockup aspect ratio
- Test data flow from forms to preview
- Test layout toggle functionality

### Step 14: Run Validation Commands
- Execute all validation commands listed below

## Database Changes
No database changes required. This is a purely frontend feature that:
1. Changes how existing forms are displayed
2. Adds a preview visualization
3. Does not alter any data structures or API calls

## Testing Strategy

### Unit Tests
- `SplitFormLayout.spec.ts`:
  - Test default panel widths
  - Test responsive stacking on small screens
  - Test slot content rendering
- `PhoneMockup.spec.ts`:
  - Test frame renders with correct dimensions
  - Test slot content appears in screen area
- `MobileVehicleForm.spec.ts`:
  - Test all validation rules match VehicleForm
  - Test form submission emits correct data
- `MobilePreviewScreen.spec.ts`:
  - Test vehicle card appears when vehicle data present
  - Test vendor card appears when vendor data present
  - Test empty states render correctly

### Edge Cases
- No vehicle data entered yet → Show placeholder in preview
- Partial data entry → Show partial preview with empty field indicators
- Very long owner names → Test text truncation in preview
- Switch from split to full view mid-form → Form data should persist
- Resize browser window → Layout should adapt smoothly
- Very small screens → Should hide preview and show form only

## Acceptance Criteria
1. [ ] Detail page shows split layout by default with form on left (40%) and phone preview on right (60%)
2. [ ] Phone mockup looks like a realistic iPhone with notch, status bar, and home indicator
3. [ ] Vehicle data entered in form appears live in the phone preview
4. [ ] Vendor data entered in form appears live in the phone preview
5. [ ] Toggle button switches between split view and full-width form
6. [ ] Layout preference persists across sessions via localStorage
7. [ ] On screens < 1024px, only form is shown (no preview)
8. [ ] Mobile forms use single-column layout with larger touch targets
9. [ ] Preview shows appropriate empty states when no data entered
10. [ ] All existing form validation continues to work
11. [ ] All existing tests pass
12. [ ] Frontend builds without errors

## Validation Commands
Execute every command to validate the feature works correctly with zero regressions.

- `npm run test:db` - Test Supabase connection
- `supabase functions serve validation-run --env-file supabase/.env.local` - Test Edge Function locally
- `cd apps/web && npm run build` - Build frontend
- `cd apps/web && npm run test` - Run frontend tests

## Notes

### Design Considerations
- The phone mockup should be visually appealing but not overly detailed - focus is on content, not pixel-perfect iOS recreation
- Consider adding a "device selector" dropdown in future to show iPhone vs Android previews
- The preview is read-only - all interactions happen in the form panel

### Future Enhancements
- Add swipe gestures in preview to simulate mobile navigation
- Add device rotation toggle (portrait/landscape)
- Add dark mode preview option
- Record user interactions for UX research
- Export preview as image for stakeholder sharing

### Technical Notes
- Use CSS transforms for smooth responsive scaling of the phone mockup
- Consider using `ResizeObserver` to adapt phone size to container
- Form fields should use `autocomplete` attributes for better mobile experience
- Test on actual tablet devices to ensure the split layout works well

### Mobile Form Design Guidelines
- Input padding: `py-3 px-4` (larger than desktop `py-2 px-4`)
- Font size: `text-base` for inputs (16px to prevent zoom on iOS)
- Touch target minimum: 44x44 pixels
- Spacing between fields: `space-y-5` (more than desktop `space-y-4`)
- Button height: `h-12` (48px) for easy tapping
- Use outline focus states that are highly visible
