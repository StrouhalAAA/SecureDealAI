# Feature: Text-in-Check Guidelines for New Opportunity

## Feature Description
Add informational text/guidelines to the `/new-opportunity` page that provides context for MVP users. The screen simulates a scenario where a buyer is speaking with a contact person who arrives at an appointment. The guidelines help users understand the purpose of each step in the data collection process.

## User Story
As Buyer
I want to see contextual guidance text on the new opportunity screen
So that I understand what information to collect during my meeting with the contact person

## Problem Statement
Currently, the `/new-opportunity` wizard collects data without providing context about the real-world scenario it represents. MVP users need guidance to understand that this screen simulates a face-to-face appointment situation where they are gathering information from a contact person about a vehicle purchase opportunity.

## Solution Statement
Add an informational banner/section at the top of the Contact step in the wizard that explains the scenario context. This text-in-check guideline will inform users that:
1. This screen represents a meeting scenario with a contact person
2. The data they collect should come from their conversation with the contact
3. The workflow follows the natural flow of a vehicle purchase appointment

## Relevant Files
Use these files to implement the feature:

- `apps/web/src/pages/NewOpportunity.vue` - Main page component for the new opportunity wizard, where the guideline will be displayed
- `apps/web/src/components/forms/ContactForm.vue` - Contact form component that may need minor adjustments to accommodate the guideline styling
- `apps/web/src/assets/main.css` - Global styles if any new utility classes are needed

### New Files
No new files required - this is a UI text addition to existing components.

## Implementation Plan

### Phase 1: Foundation
- Review the current UI layout of the NewOpportunity page
- Determine the optimal placement for the guideline text (above the ContactForm)
- Design the guideline component styling to match existing UI patterns

### Phase 2: Core Implementation
- Add the informational text block to the Contact step
- Style the guideline using existing Tailwind CSS classes (info/blue themed)
- Ensure the text is in Czech language consistent with the rest of the UI

### Phase 3: Integration
- Test the UI on different screen sizes (responsive behavior)
- Verify the guideline doesn't interfere with form functionality
- Ensure the guideline is only shown on the contact step (first step)

## Step by Step Tasks

### Step 1: Add guideline text block to NewOpportunity.vue
- Add an informational banner above the ContactForm component
- Use a light blue/info-themed styling consistent with existing UI patterns
- Include an icon (info or clipboard icon) for visual emphasis
- Text should explain:
  - This screen simulates a buyer meeting with a contact person at an appointment
  - The user should collect the contact's information during their conversation
  - The workflow proceeds: Contact -> Vehicle -> Vendor

### Step 2: Style the guideline component
- Use existing Tailwind CSS classes: `bg-blue-50`, `border-blue-200`, `text-blue-800`
- Add appropriate padding and margin for visual separation
- Include a relevant SVG icon (info circle or clipboard)
- Ensure text is readable and not overwhelming

### Step 3: Test responsive behavior
- Verify the guideline displays correctly on mobile devices
- Verify the guideline displays correctly on desktop
- Ensure the text wraps properly on smaller screens

### Step 4: Run validation commands
- Run `cd apps/web && npm run build` to verify the build succeeds

## Database Changes
No database changes required - this is a frontend-only UI text addition.

## Testing Strategy

### Unit Tests
No new unit tests required as this is static informational text.

### Edge Cases
- Text display on very small mobile screens
- Text display with different browser font sizes
- Interaction with existing form validation messages

## Acceptance Criteria
- [ ] Informational guideline text is visible on the Contact step of the wizard
- [ ] The guideline explains the buyer appointment scenario context
- [ ] The guideline styling matches existing info/alert patterns in the app
- [ ] The guideline is responsive and displays correctly on mobile and desktop
- [ ] The guideline does not interfere with form functionality
- [ ] The build completes without errors

## Validation Commands
Execute every command to validate the feature works correctly with zero regressions.

- `cd apps/web && npm run build` - Build frontend

## Notes
- This is an MVP feature focused on user guidance, not functionality
- The text should be concise but informative
- Czech language should be used consistently
- The guideline should not be dismissible (always visible as a reminder)
- Consider adding similar guidelines to other steps in future iterations
