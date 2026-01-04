# SecureDealAI

Vehicle purchase validation service - validates vehicle and vendor data by comparing manual input against OCR extractions and external registry data (ARES/ADIS).

## Tech Stack

- **Backend**: Supabase (PostgreSQL + Edge Functions with Deno/TypeScript)
- **Frontend**: Vue.js 3 + Vite + TailwindCSS
- **OCR**: Mistral AI

## Local Development

### Prerequisites

- Node.js >= 20
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- Deno (for Edge Functions)

### Installation

```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd MVPScope/frontend && npm install
```

### Environment Setup

1. Copy `.env.example` to `.env` and fill in values:
```bash
cp .env.example .env
```

2. Copy frontend env:
```bash
cp MVPScope/frontend/.env.example MVPScope/frontend/.env
```

Required variables:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_PUBLISHABLE_KEY` - Supabase anon/public key
- `SUPABASE_SECRET_KEY` - Supabase service role key
- `MISTRAL_API_KEY` - Mistral OCR API key

### Running the App

#### Frontend (Vue.js)

```bash
# Start dev server
cd MVPScope/frontend
npm run dev

# App runs at http://localhost:5173
```

To stop: `Ctrl+C` in terminal, or kill the process.

#### Backend (Supabase Edge Functions)

```bash
# Start local Supabase (PostgreSQL, Auth, Storage)
supabase start

# Serve Edge Functions locally
npm run supabase:functions:serve
```

### Common Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start frontend dev server (from MVPScope/frontend) |
| `npm run test` | Run all tests (backend + frontend) |
| `npm run test:backend` | Run backend tests only |
| `npm run test:frontend` | Run frontend tests only |
| `npm run test:e2e` | Run Playwright E2E tests |
| `supabase start` | Start local Supabase |
| `supabase stop` | Stop local Supabase |
| `supabase status` | Show local URLs and API keys |
| `supabase db push` | Push migrations to remote |
| `supabase db reset` | Reset local database |

### Database Migrations

```bash
# Push pending migrations to remote Supabase
supabase db push

# Reset local database with all migrations
supabase db reset

# Link to remote project (first time)
supabase link --project-ref YOUR_PROJECT_REF
```

### Edge Functions

```bash
# Serve locally
supabase functions serve validation-run --env-file .env

# Deploy to production
supabase functions deploy validation-run
```

## Project Structure

```
SecureDealAI/
├── MVPScope/
│   ├── frontend/          # Vue.js frontend
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── views/
│   │   │   ├── stores/
│   │   │   └── lib/
│   │   └── package.json
│   ├── supabase/
│   │   └── functions/     # Edge Functions
│   └── ImplementationPlan/
├── supabase/
│   └── migrations/        # Database migrations
├── package.json
└── .env.example
```

## Documentation

- [Implementation Tracker](MVPScope/ImplementationPlan/00_IMPLEMENTATION_TRACKER.md)
- [CLAUDE.md](CLAUDE.md) - AI assistant context

## License

Proprietary - AURES Holdings
