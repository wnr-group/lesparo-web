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
- **Prisma 7 + SQLite**: a single local database file (`prisma/dev.db`); no Docker or hosted database needed
- Staff sign-in: email + password (bcrypt) with a signed session cookie (`jose`)
- Uploads on local disk in `storage/` (public images in `storage/media/`, private enquiry files in `storage/attachments/`)
- **Zod** for validation shared by forms and server actions
- **Vitest** unit tests

## Prerequisites

- Node.js 20.9+ (developed on 24), npm 10+

## Local development

```bash
npm install                        # also runs `prisma generate`
cp .env.example .env.local         # set AUTH_SECRET and RATE_LIMIT_SALT (random, 32+ chars)
npm run db:migrate                 # creates prisma/dev.db from prisma/migrations/*
npm run db:seed                    # imports the catalogue (+ downloads images) and creates the default admin
npm run dev                        # http://localhost:3000  (admin: /admin, sign in as admin@lesparo.com)
```

The default admin's password is set in `scripts/seed-admin.ts` (override with `ADMIN_EMAIL` /
`ADMIN_PASSWORD` before seeding). Change it after the first sign-in on any shared install.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js dev server / production build / production server |
| `npm run type-check` | TypeScript, no emit |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (Vitest) |
| `npm run db:migrate` | Apply/create Prisma migrations on the SQLite database |
| `npm run db:seed` | `catalogue:import` + `admin:seed` |
| `npm run db:reset` | Delete and recreate the database, then seed it |
| `npm run db:studio` | Browse and edit the database in Prisma Studio |
| `npm run admin:seed` | Create the default admin account (keeps an existing password) |
| `npm run catalogue:crawl` | Re-snapshot the live lesparo.com catalogue into `data/live-catalogue.json` |
| `npm run catalogue:import` | Upsert the snapshot into the database (idempotent), download images to `storage/media/`, write `data/legacy-redirects.json` |
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
prisma/              schema.prisma and SQL migrations
storage/             uploaded images and enquiry files (git-ignored)
scripts/             catalogue crawl/import, staff provisioning, job runner
tests/               unit tests
docs/                database, integrations, deployment, audit & decision register
```

## Documentation

- [`docs/audit-and-decisions.md`](docs/audit-and-decisions.md): findings from the existing site, the decisions taken, and the questions still open
- [`docs/database.md`](docs/database.md): tables, RLS, storage, staff provisioning, backups
- [`docs/integrations.md`](docs/integrations.md): CRM, email, WhatsApp, Razorpay and fulfilment status
- [`docs/deployment.md`](docs/deployment.md): staging/production, migrations, cron, rollback, smoke tests
