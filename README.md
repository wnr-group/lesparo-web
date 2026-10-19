# LESPARO — website and wholesale platform

Storefront, wholesale enquiry workflow and admin dashboard for **LESPARO — Abija Exports, Erode**.
It replaces the PrestaShop catalogue at lesparo.com and keeps its real products, images,
categories and URLs (old URLs 301-redirect to the new pages).

The business today sells **quote-first**: the live site has no cart or prices, only
"Request for Quote". This build follows that. Products carry `quote_enabled` /
`retail_enabled` flags and an optional price, but online checkout (cart, Razorpay, orders)
is **not built yet** — it waits on a business decision (see `docs/audit-and-decisions.md`).

## Stack

- **Next.js 16** (App Router, Cache Components, Turbopack), React 19, TypeScript (strict)
- **Tailwind CSS 4** with design tokens in `app/globals.css` ("Modern Textile Atelier")
- **Supabase**: Postgres + Row Level Security, Auth (staff sign-in), Storage
- **Zod** for validation shared by forms and server actions
- **Vitest** unit tests, plus a role-based RLS/storage check script

## Prerequisites

- Node.js 20.9+ (developed on 24), npm 10+
- Docker Desktop (for local Supabase) and the Supabase CLI (`npx supabase`)

## Local development

```bash
npm install
npx supabase start                 # starts Postgres, Auth, Storage locally (Docker)
cp .env.example .env.local         # fill in values printed by `supabase start`
npm run db:reset                   # applies supabase/migrations/*
npm run catalogue:import           # imports data/live-catalogue.json + images into Supabase
npm run staff:grant -- you@example.com admin --password "a-long-local-password"
npm run dev                        # http://localhost:3000  (admin: /admin)
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js dev server / production build / production server |
| `npm run type-check` | TypeScript, no emit |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (Vitest) |
| `npm run test:security` | RLS, grants and storage checks against **local** Supabase as anon, sales and admin |
| `npm run db:reset` | Recreate the local database from migrations |
| `npm run db:types` | Regenerate `types/database.ts` from the local schema |
| `npm run catalogue:crawl` | Re-snapshot the live lesparo.com catalogue into `data/live-catalogue.json` |
| `npm run catalogue:import` | Upsert the snapshot into Supabase (idempotent), copy images, write `data/legacy-redirects.json` |
| `npm run staff:grant -- <email> <admin\|sales> [--password <pw>]` | Create a staff user / grant a role (`--revoke` to remove) |
| `npm run jobs:run` | Process due CRM/email jobs once |

## Project layout

```
app/(site)/          public storefront (home, shop, collections, products, wholesale, about, contact, policies)
app/admin/           staff sign-in and the protected dashboard
app/api/jobs/run/    scheduled retry endpoint for integration jobs
components/          site/, admin/ and ui/ components
lib/catalogue/       cached catalogue queries, legacy description parser
lib/services/        enquiry submission, integration job runner, upload sniffing
lib/integrations/    provider-independent CRM and email adapters (+ test mocks)
lib/validation/      Zod schemas shared by client and server
supabase/migrations/ schema, RLS, storage policies, grants
scripts/             catalogue crawl/import, staff provisioning, job runner
tests/               unit tests and the security check
docs/                database, integrations, deployment, audit & decision register
```

## Documentation

- [`docs/audit-and-decisions.md`](docs/audit-and-decisions.md): findings from the existing site, the decisions taken, and the questions still open
- [`docs/database.md`](docs/database.md): tables, RLS, storage, staff provisioning, backups
- [`docs/integrations.md`](docs/integrations.md): CRM, email, WhatsApp, Razorpay and fulfilment status
- [`docs/deployment.md`](docs/deployment.md): staging/production, migrations, cron, rollback, smoke tests
