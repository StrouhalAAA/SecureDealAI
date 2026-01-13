# Feature: Add AAA Auto Logo to Authenticated Header

## Feature Description
Add the AAA Auto company logo to the application header, visible only when users are signed in. The logo will be displayed alongside the "SecureDealAI" text in the header, providing brand recognition and visual consistency with the parent company's identity. The logo file is located at `docs/designs/aaa-auto-logo.svg`.

## User Story
As an authenticated user
I want to see the AAA Auto company logo in the application header
So that I have clear brand recognition and know I'm using an official AURES Holdings tool

## Problem Statement
Currently, the application header only shows the text "SecureDealAI" when users are logged in. There's no visual brand identity connecting the application to its parent company (AAA Auto / AURES Holdings). This makes the application feel generic and disconnected from the company's brand.

## Solution Statement
Add the AAA Auto SVG logo to the header component in `App.vue`. The logo will:
1. Be placed in the `public/` directory for optimal loading
2. Display next to the "SecureDealAI" text in the header
3. Only be visible when the user is authenticated (matching the existing header behavior)
4. Be styled appropriately to fit the header design with proper sizing and spacing
5. Include proper accessibility attributes (alt text)

## Relevant Files
Use these files to implement the feature:

- `apps/web/src/App.vue` - Main application layout containing the header component where the logo needs to be added. This is the primary file to modify.
- `docs/designs/aaa-auto-logo.svg` - Source SVG logo file that needs to be copied to the public assets
- `apps/web/public/` - Public directory where static assets like logos should be placed for optimal loading
- `apps/web/src/assets/main.css` - Global CSS file if any custom styles are needed for the logo

### New Files
- `apps/web/public/aaa-auto-logo.svg` - Copy of the logo in the public assets directory

## Implementation Plan

### Phase 1: Foundation
Prepare the logo asset by copying it to the appropriate location in the frontend project. The `public/` directory is ideal for static assets as Vite serves these files directly without processing.

### Phase 2: Core Implementation
Modify the `App.vue` header to include the logo. The logo should:
- Be positioned to the left of the "SecureDealAI" text
- Use appropriate dimensions (suggested height: 32-40px to match header proportions)
- Have proper alt text for accessibility
- Only display when `isAuthenticated` is true (using the existing conditional)

### Phase 3: Integration
Ensure the logo integrates seamlessly with:
- The existing header layout and spacing
- The RouterLink that wraps the title (logo should be part of the clickable home link)
- Responsive design on different screen sizes

## Step by Step Tasks

### Step 1: Copy Logo to Public Directory
- Copy `docs/designs/aaa-auto-logo.svg` to `apps/web/public/aaa-auto-logo.svg`
- Verify the SVG renders correctly (the SVG uses white fill which needs consideration)

### Step 2: Analyze SVG and Prepare for Header
- Review the SVG content - note that it uses `fill:#ffffff` (white)
- The header has a white background (`bg-white`), so the logo will need color adjustment
- Consider either modifying the SVG fill colors or adding a colored background container

### Step 3: Update App.vue Header with Logo
- Add the logo image to the header section in `App.vue`
- Position the logo within the existing RouterLink alongside "SecureDealAI" text
- Add proper `alt` attribute for accessibility
- Apply appropriate sizing (height: 32px recommended)

### Step 4: Style the Logo for Visibility
- Since the original SVG has white fills and the header is white, apply appropriate styling:
  - Option A: Modify the SVG to use a visible color (e.g., dark blue or black)
  - Option B: Use CSS filter to invert colors for dark display
- Ensure proper spacing between logo and text using gap utilities

### Step 5: Test Visual Appearance
- Verify logo displays correctly in authenticated state
- Verify logo is NOT visible on the AccessCode (login) page
- Test responsive behavior on different screen sizes
- Verify the RouterLink still works correctly (clicking logo or text navigates home)

### Step 6: Run Validation Commands
- Execute all validation commands to ensure no regressions

## Database Changes
None required - this is a frontend-only change.

## Testing Strategy

### Unit Tests
- No new unit tests required for this visual change
- Existing smoke tests should continue to pass

### Edge Cases
- Logo should not appear on `/access-code` page (unauthenticated state)
- Logo should appear immediately after successful login
- Logo should disappear immediately after logout
- Logo should render correctly if SVG fails to load (graceful degradation)

## Acceptance Criteria
- [ ] Logo is visible in the header when user is authenticated
- [ ] Logo is NOT visible on the access code (login) page
- [ ] Logo is clickable and navigates to the home/dashboard page
- [ ] Logo has appropriate alt text for accessibility
- [ ] Logo is properly sized and aligned with the "SecureDealAI" text
- [ ] Logo is visible against the white header background
- [ ] Build completes without errors
- [ ] Existing functionality is not affected

## Validation Commands
Execute every command to validate the feature works correctly with zero regressions.

- `cd apps/web && npm run build` - Build frontend

## Notes
- The original SVG uses white (`#ffffff`) fill color, which is invisible on the white header background. The implementation should modify the SVG to use a visible color (dark blue/navy recommended to match automotive branding) or apply CSS filters.
- The SVG includes paths for "AAA AUTO" text in a distinctive style
- Consider using the logo as a favicon in the future for browser tab identification
- The logo should maintain good visibility at small sizes (32-40px height)
