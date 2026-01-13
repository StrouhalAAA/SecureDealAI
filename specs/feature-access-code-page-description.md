# Feature: Update Access Code Page Description and Contact Information

## Feature Description
Update the access code page at `/access-code` to include a proper description explaining that this platform is for testing vehicle purchase validation processes. The page should also provide clear contact information for users who need access, directing them to reach out to Jakub Strouhal at jakub.strouhal@aaaauto.cz.

## User Story
As a potential user visiting the access code page
I want to understand the purpose of this platform and know who to contact for access
So that I can determine if this tool is relevant to my work and request access appropriately

## Problem Statement
Currently, the access code page displays a generic message: "Contact your administrator if you need an access code." This lacks context about:
1. What the platform is for (vehicle purchase validation testing)
2. Who specifically to contact (Jakub Strouhal)
3. How to reach them (email address)

Users arriving at this page have no way to understand the platform's purpose or take action to gain access.

## Solution Statement
Update the `AccessCode.vue` component to:
1. Add a descriptive section explaining the platform is for testing vehicle purchase validation processes
2. Replace the generic "contact administrator" message with specific contact information for Jakub Strouhal
3. Make the email address clickable (`mailto:` link) for easy access
4. Review and update any Czech language text for consistency

## Relevant Files
Use these files to implement the feature:

- `apps/web/src/pages/AccessCode.vue` - The main access code page component. This is the primary file that needs modification. Contains the current generic help text that needs to be updated.
- `apps/web/src/App.vue` - Main application layout for reference on styling consistency (button labels, color schemes, text formatting)

### New Files
No new files needed - this is a modification to existing content.

## Implementation Plan

### Phase 1: Foundation
Review the current AccessCode.vue structure to understand the existing layout and styling patterns. The page uses a dark theme with Tailwind CSS classes. The key areas to modify are:
- The subtitle under "SecureDealAI" heading
- The help text at the bottom of the form card

### Phase 2: Core Implementation
Update the AccessCode.vue component with:
1. A descriptive paragraph explaining the platform purpose (testing buying process validation)
2. Contact information section with Jakub Strouhal's email as a clickable link
3. Ensure text is clear and professional

### Phase 3: Integration
Verify the changes integrate well with:
- The existing dark theme styling
- Mobile responsive design
- Overall user experience flow

## Step by Step Tasks

### Step 1: Update Platform Description
- Modify the subtitle text (currently "Vehicle Validation Platform") to include more context about testing purposes
- Add a brief description paragraph below the logo explaining this is a platform for testing vehicle purchase validation processes

### Step 2: Update Contact Information
- Replace the generic "Contact your administrator if you need an access code" text
- Add specific contact: Jakub Strouhal
- Add clickable email link: jakub.strouhal@aaaauto.cz
- Style the email link to be visible and accessible (appropriate color for dark background)

### Step 3: Ensure Consistent Styling
- Email link should use a visible color (light blue or white) on the dark background
- Maintain proper spacing and alignment
- Ensure the contact section doesn't feel cramped

### Step 4: Test Visual Appearance
- Verify text is readable on the dark background
- Test email link opens email client correctly
- Check responsive layout on different screen sizes

### Step 5: Run Validation Commands
- Execute build command to ensure no errors
- Manually verify the page at http://localhost:5173/access-code

## Database Changes
None required - this is a frontend-only content update.

## Testing Strategy

### Unit Tests
- No new unit tests required for this content change
- Existing tests should continue to pass

### Edge Cases
- Email link should work in browsers without email clients configured (graceful fallback)
- Text should remain readable if browser text zoom is increased
- Long email addresses should not break layout

## Acceptance Criteria
- [ ] Platform description clearly states this is for testing vehicle purchase validation
- [ ] Contact person (Jakub Strouhal) is mentioned by name
- [ ] Email address (jakub.strouhal@aaaauto.cz) is displayed and clickable
- [ ] Email link uses `mailto:` protocol
- [ ] Text is readable against the dark background
- [ ] Layout remains visually balanced
- [ ] Mobile responsive design is maintained
- [ ] Build completes without errors

## Validation Commands
Execute every command to validate the feature works correctly with zero regressions.

- `npm run test:db` - Test Supabase connection
- `supabase functions serve validation-run --env-file supabase/.env.local` - Test Edge Function locally
- `cd apps/web && npm run build` - Build frontend

## Notes
- The email domain is @aaaauto.cz (four A's, as in AAA Auto)
- Consider adding the AAA Auto logo context since this is an internal AURES Holdings tool
- The page uses a dark gradient background, so text colors need to provide sufficient contrast
- Future consideration: could add link to internal documentation or FAQ about the platform
