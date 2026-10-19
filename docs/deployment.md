# Deployment

Recommended: **Vercel** (Next.js 16) + **Supabase** (managed Postgres/Auth/Storage), with
separate Supabase projects for staging and production. Nothing has been deployed yet:
both hosting accounts and the domain need business approval and access.

## Environments

| | Staging | Production |
| --- | --- | --- |
| Supabase project | `lesparo-staging` | `lesparo-prod` (Point-in-Time Recovery on) |
| Vercel | Preview / `staging` branch | Production branch, domain `lesparo.com` |
| `CRM_PROVIDER` / `EMAIL_PROVIDER` | sandbox provider | live provider (`mock` is refused in production) |

Set every variable in `.env.example` per environment in the Vercel project settings.
Secrets (`SUPABASE_SECRET_KEY`, `CRON_SECRET`, provider keys) must never use a `NEXT_PUBLIC_` name.

## First-time setup (per environment)

```bash
npx supabase link --project-ref <ref>
npx supabase db push                              # applies migrations
# with that environment's URL + secret key exported:
npx tsx scripts/import-catalogue.ts               # catalogue, images, homepage defaults
npx tsx scripts/grant-staff-role.ts owner@… admin --password "…"
```

In Supabase Auth settings: disable public sign-ups (staff accounts are created by script), and
set the Site URL to the environment's URL.

## Scheduled jobs

Add a Vercel Cron job (`vercel.json`) that calls `GET /api/jobs/run` every 10 minutes with
`Authorization: Bearer $CRON_SECRET`. It only does anything once a CRM or email provider is configured.

## Release procedure

1. Merge to the staging branch → automatic preview deploy.
2. `npx supabase db push` against staging, then run `npm run test:security` with
   `ALLOW_REMOTE_SECURITY_CHECK=1` and staging test-account credentials.
3. Run the smoke tests below on staging. Get client sign-off.
4. Back up production (dashboard or `supabase db dump`). Push migrations to production. Promote the deploy.
5. Run the smoke tests on production.

Migrations must be backwards-compatible with the previously deployed code (add, then remove later),
so a deploy can be rolled back without a database rollback.

## Rollback

- Code: Vercel → Deployments → promote the previous deployment (instant).
- Database: write a forward-fix migration where possible. For a full restore, use PITR or the
  pre-release backup.

## Smoke tests

- [ ] `/` loads with the hero and featured products; `/shop` lists products; search `lungi` returns results
- [ ] A product page shows its gallery and specs; "Add to enquiry list" updates the header counter
- [ ] An old URL such as `/en/57-loom-don-shorts` 301s to `/products/loom-don-shorts`
- [ ] A wholesale enquiry (test data) returns an `LSP-…` reference and appears in `/admin/enquiries`
- [ ] Integration jobs show the expected status (blocked until providers are configured)
- [ ] `/admin` redirects to sign-in when signed out; a sales user cannot edit products
- [ ] `/sitemap.xml` and `/robots.txt` use the production domain

## DNS and HTTPS

Point `lesparo.com` (and `www`) to Vercel. HTTPS certificates are automatic. Keep the old
PrestaShop host available read-only until the redirects have been verified, then retire it.
