# Feature: API Health Check Endpoint

## Feature Description
Add a simple health check endpoint to the SecureDealAI API that allows monitoring systems and developers to verify the API is running and connected to the database. This endpoint will return the service status, version, and database connectivity.

## User Story
As a DevOps engineer or developer
I want to have a health check endpoint
So that I can monitor API availability and troubleshoot connectivity issues

## Problem Statement
Currently there is no standardized way to check if the SecureDealAI API is running and healthy. This makes it difficult to:
- Set up automated monitoring and alerting
- Verify deployments were successful
- Debug connectivity issues between services
- Implement load balancer health checks

## Solution Statement
Create a new Edge Function `/health` that returns a JSON response with:
- Service status (`ok` or `degraded`)
- Timestamp
- Version information
- Database connectivity status

The endpoint will be publicly accessible (no authentication required) to allow load balancers and monitoring tools to check availability.

## Relevant Files
Use these files to implement the feature:

- `supabase/functions/verify-access-code/index.ts` - Reference for unauthenticated endpoint pattern (verify_jwt = false)
- `supabase/functions/ares-lookup/index.ts` - Reference for standard Edge Function structure
- `supabase/config.toml` - Function configuration (if exists)

### New Files
- `supabase/functions/health/index.ts` - Main health check Edge Function

## Implementation Plan

### Phase 1: Foundation
- Create the new Edge Function directory structure
- Set up basic HTTP handler with CORS support

### Phase 2: Core Implementation
- Implement health check logic
- Add database connectivity check
- Return structured JSON response

### Phase 3: Integration
- Deploy to Supabase
- Test endpoint accessibility
- Document in API documentation

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Create Health Check Edge Function
- Create directory `supabase/functions/health/`
- Create `index.ts` with:
  - CORS headers support
  - GET method handler
  - Basic health response structure

### Step 2: Add Database Connectivity Check
- Initialize Supabase client
- Execute simple query to verify connection
- Handle connection failures gracefully

### Step 3: Implement Response Structure
- Return JSON with:
  - `status`: "ok" | "degraded"
  - `timestamp`: ISO 8601 timestamp
  - `version`: "1.0.0" (from env or hardcoded)
  - `database`: "connected" | "disconnected"
  - `services`: object with individual service statuses

### Step 4: Test Locally
- Run `supabase functions serve health --env-file supabase/.env.local`
- Test with `curl http://localhost:54321/functions/v1/health`

### Step 5: Run Validation Commands
- Execute all validation commands to ensure no regressions

## Database Changes
None required - this feature only reads from existing tables to verify connectivity.

## Testing Strategy

### Unit Tests
- Test successful health check response
- Test database disconnected scenario
- Test CORS preflight handling

### Edge Cases
- Database unavailable - should return `degraded` status, not error
- Missing environment variables - should return appropriate error
- Invalid HTTP methods - should return 405

## Acceptance Criteria
- [ ] GET /functions/v1/health returns 200 with JSON body
- [ ] Response includes status, timestamp, and database connectivity
- [ ] Endpoint works without authentication
- [ ] CORS preflight requests are handled
- [ ] Returns `degraded` status (not 500) when database is unreachable
- [ ] Response time is under 500ms for healthy system

## Validation Commands
Execute every command to validate the feature works correctly with zero regressions.

- `npm run test:db` - Test Supabase connection
- `supabase functions serve health --env-file supabase/.env.local` - Test Edge Function locally
- `cd apps/web && npm run build` - Build frontend

## Notes
- Consider adding more health checks in the future (external API connectivity, cache status)
- The `/health` endpoint follows REST conventions for health check endpoints
- This endpoint can be used by Supabase's built-in monitoring or external tools like UptimeRobot
