# Feature: Remove BFF Documentation from API Docs

## Feature Description
Remove the Backend-for-Frontend (BFF) architectural documentation from the API Swagger documentation page (`/api-docs`) while preserving information about the data sources and external APIs the system integrates with. The BFF functionality is not fully implemented, so the documentation is premature. The user wants to add this functionality later.

The key objectives are:
1. Remove all BFF-specific terminology and architectural explanations
2. Keep the data source information (ARES, ADIS, Mistral OCR, Supabase DB) intact but reframed without BFF context
3. Remove the Architecture documentation endpoints that are not functional
4. Remove the "Additional Documentation" links to non-functional docs
5. Clean up related schemas that are BFF-specific

## User Story
As a **SecureDealAI administrator**
I want to **remove premature BFF documentation from the API docs page**
So that **the documentation accurately reflects the current implemented functionality**

## Problem Statement
The current API documentation at `/api-docs` contains extensive BFF (Backend-for-Frontend) architectural documentation that:
1. Describes functionality that is not fully implemented yet
2. References documentation files that don't exist or aren't functional
3. May confuse developers about the actual current state of the system
4. Will be added back later when the BFF pattern is properly implemented

The affected sections include:
- "BFF Architecture Overview" in the main description
- Architecture documentation endpoints (`/architecture/*`)
- Data Sources endpoints with BFF-specific framing
- Additional Documentation links section
- BFF-related schemas and tag descriptions

## Solution Statement
Modify the `openapi.yaml` file to:
1. Remove the "BFF Architecture Overview" section from the description
2. Preserve data source information but without BFF framing
3. Remove the Architecture tag and its endpoints
4. Remove the "Additional Documentation" links section
5. Clean up BFF-specific schemas while keeping relevant data source schemas
6. Update tag descriptions to remove BFF references

The API documentation will still show:
- What external APIs are called (ARES, ADIS, Mistral OCR)
- What data the system uses and from where
- The validation rules and endpoints (fully functional)

## Relevant Files
Use these files to implement the feature:

### Files to Modify
- `apps/web/public/openapi.yaml` - Main OpenAPI specification file
  - Contains the BFF documentation in `info.description`
  - Has `/architecture/*` endpoints to remove
  - Has `/data-sources/*` endpoints that need reframing
  - Contains BFF-specific schemas to clean up
  - Has "Additional Documentation" links to remove

### Reference Files (Read-Only)
- `apps/web/src/pages/SwaggerUI.vue` - The Swagger UI component (no changes needed)
- `apps/web/src/router/index.ts` - Router configuration (no changes needed)
- `specs/feature-bff-api-pattern-documentation.md` - Original feature spec (for context)

### New Files
None required.

## Implementation Plan

### Phase 1: Foundation - Content Analysis
Identify all BFF-related content in the OpenAPI specification that needs to be removed or modified. Map out what data source information should be preserved.

### Phase 2: Core Implementation - OpenAPI Modification
Edit the `openapi.yaml` file to:
- Remove BFF terminology from the main description
- Remove Architecture endpoints
- Simplify Data Sources endpoints (remove BFF context)
- Remove non-functional documentation links
- Clean up unused schemas

### Phase 3: Integration - Verification
Verify the OpenAPI spec is valid and the Swagger UI displays correctly. Ensure the frontend builds without errors.

## Step by Step Tasks

### Step 1: Update the OpenAPI Info Description
- Remove the "BFF Architecture Overview" section header and explanation
- Remove the "Why BFF?" bullet points
- Keep the "Data Sources Integrated" table but remove BFF context
- Remove the "Key BFF Functions" table
- Remove the "Production Environment Simulation" section
- Keep the "Validation Rules System" section unchanged
- Keep the "Authentication" section unchanged
- Remove the "Additional Documentation" section with broken links

### Step 2: Remove Architecture Tag and Endpoints
- Remove the "Architecture" tag definition from the tags section
- Remove the `/architecture/overview` endpoint
- Remove the `/architecture/flows/{flowName}` endpoint

### Step 3: Simplify Data Sources Tag and Endpoints
- Update the "Data Sources" tag description to remove BFF references
- Keep the `/data-sources` endpoint but simplify the description
- Keep the `/data-sources/{sourceName}` endpoint but simplify
- Remove the `/data-sources/integration-matrix` endpoint (BFF-specific)

### Step 4: Clean Up BFF-Specific Schemas
- Remove the `ArchitectureOverview` schema
- Remove the `BffFunctionSummary` schema
- Remove the `DataFlowDiagram` schema
- Remove the `IntegrationMatrix` schema
- Keep `DataSourceList`, `DataSourceIntegration`, and `DataSourceDetail` schemas (useful for understanding data sources)

### Step 5: Update Remaining Tag Descriptions
- Review all tag descriptions and remove any BFF references
- Ensure descriptions accurately reflect current functionality

### Step 6: Validate OpenAPI Specification
- Ensure the YAML is valid
- Check for any broken schema references
- Verify all endpoints reference existing schemas

### Step 7: Run Validation Commands
- Execute frontend build to verify no breaking changes
- Manually verify the `/api-docs` page displays correctly

## Database Changes
No database changes required - this is a documentation-only change.

## Testing Strategy

### Unit Tests
No new unit tests required - this is a documentation modification.

### Edge Cases
- Verify OpenAPI YAML is syntactically valid after modifications
- Ensure Swagger UI renders without errors
- Check that removed endpoints don't leave orphaned schema references
- Verify no internal links to removed content remain

## Acceptance Criteria
1. The "BFF Architecture Overview" section is removed from the API docs description
2. The Architecture tag and its endpoints (`/architecture/*`) are removed
3. The `/data-sources/integration-matrix` endpoint is removed
4. The "Additional Documentation" links section is removed
5. All BFF-specific schemas are removed (`ArchitectureOverview`, `BffFunctionSummary`, `DataFlowDiagram`, `IntegrationMatrix`)
6. Data source information is preserved but without BFF terminology
7. The Swagger UI at `/api-docs` loads without errors
8. Frontend build (`npm run build`) completes successfully
9. No orphaned schema references exist in the specification

## Validation Commands
Execute every command to validate the feature works correctly with zero regressions.

- `cd apps/web && npm run build` - Build frontend to verify no errors

## Notes

### Content to Remove
The following specific content blocks should be removed:
1. Lines 5-48 in the current `info.description` (BFF Architecture Overview through Production Environment Simulation)
2. Lines 82-87 (Additional Documentation links section)
3. Lines 102-105 (Architecture tag definition)
4. Lines 119-259 (All `/architecture/*` endpoints)
5. Lines 350-400 (The `/data-sources/integration-matrix` endpoint)
6. Lines 885-1001 and 1113-1141 (BFF-specific schemas)

### Content to Preserve
The following should be kept:
1. The "Validation Rules System" section (lines 50-72)
2. The "Authentication" section (lines 74-78)
3. Basic data source information (what APIs are called)
4. The `DataSourceList`, `DataSourceIntegration`, `DataSourceDetail` schemas
5. All Validation, Rules, Rule Lifecycle, and Import/Export endpoints

### Future Considerations
- The BFF documentation spec (`specs/feature-bff-api-pattern-documentation.md`) can be used as reference when re-implementing this feature later
- Consider archiving the removed content in a separate document for future reference
