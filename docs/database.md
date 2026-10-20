# Database

All schema changes are migrations in `supabase/migrations/` and are applied in order.

| Migration | Contents |
| --- | --- |
| `…000100_core_schema.sql` | Tables, enums, triggers, `create_wholesale_enquiry()` and `hit_rate_limit()` functions |
| `…000200_security_policies.sql` | RLS on every table, storage buckets and storage policies |
| `…000300_table_grants.sql` | Explicit per-role table privileges, including column-level update limits for staff |

## Tables

| Table | Purpose | Notes |
| --- | --- | --- |
| `categories` | Collection tree (`parent_id`) | Unique `slug`; `legacy_id`/`legacy_url` keep the PrestaShop mapping |
| `products` | Catalogue items | `specs` is an ordered `[{label, value}]` array; `sizes text[]`; `quote_enabled` / `retail_enabled`; a retail product must have a price (check constraint); `archived_at` soft-archives products referenced by enquiries; a generated `search` tsvector |
| `product_images` | Ordered images per product | At most one `is_primary` per product (partial unique index) |
| `site_content` | Editable homepage (`key = 'homepage'`) | JSON validated by `lib/validation/content.ts` |
| `user_roles` | Staff roles: `admin`, `sales` | Written only with the service role (`npm run staff:grant`) |
| `wholesale_enquiries` | Buyer enquiries | `enquiry_number` like `LSP-2026-00001`; unique `idempotency_key`; quotation and follow-up fields; `crm_sync_status` |
| `enquiry_items` | Requested lines | `product_name_snapshot` preserves the name even if the product changes |
| `enquiry_attachments` | Private reference files | Objects live in the `enquiry-attachments` bucket |
| `enquiry_notes` | Internal notes | Staff-only; `author_id` must equal the signed-in user |
| `enquiry_status_history` | Audit of status changes | Written by trigger, including the staff user |
| `integration_jobs` | Outbox for CRM and email | Status `pending` / `running` / `succeeded` / `failed` / `blocked`, attempts, backoff, `last_error` |
| `rate_limits` | Fixed-window counters | Keyed by a salted hash of the client IP; old rows are pruned automatically |

There are no `orders` or `payments` tables yet. They will be added only if retail checkout is approved.

### Enquiry status flow

`new → under_review → info_required ↔ under_review → quotation_prepared → quotation_sent → accepted | rejected → closed`.
Staff can set any status; every change is recorded in `enquiry_status_history`.

## Access model (RLS + grants)

| Role | Can |
| --- | --- |
| `anon` (visitors) | Read **published, non-archived** products and their images, published categories, and site content. Nothing else: no access to any enquiry table, `user_roles` or jobs, and no RPCs. |
| `authenticated` + `sales` | Read enquiries, items, attachments (via signed URLs), notes, history and jobs. Update **only** workflow columns on enquiries (status, quotation, follow-up, assignment). Add notes as themselves. Read unpublished products. |
| `authenticated` + `admin` | Everything sales can, plus manage products, images, categories and site content. |
| `service_role` (server only) | Enquiry creation (rate-limited, transactional RPC), attachment upload, integration jobs, staff provisioning. |

Nobody can grant roles from the app, delete enquiries through the API, or change what a buyer submitted.
`npm run test:security` checks all of this against a running database (24 checks).

## Storage

| Bucket | Public | Rules |
| --- | --- | --- |
| `product-media` | yes (read) | JPEG/PNG/WebP/AVIF, 10 MB max; only admins can write |
| `enquiry-attachments` | **no** | JPEG/PNG/WebP/PDF, 10 MB max; written server-side after content sniffing (the browser's filename and MIME type are not trusted); staff read through 5-minute signed URLs |

## Staff provisioning

```bash
npm run staff:grant -- owner@abijaexports.com admin --password "temporary-long-password"
npm run staff:grant -- sales@abijaexports.com sales --password "temporary-long-password"
npm run staff:grant -- someone@example.com --revoke
```

Against staging or production, run with that environment's `NEXT_PUBLIC_SUPABASE_URL` and
`SUPABASE_SECRET_KEY`. Ask new staff to change their temporary password at first sign-in.
A self-service password reset flow is not built yet.

## Seed / sample data

There is no fictional seed data. The catalogue comes from the real site:
`npm run catalogue:crawl` → `data/live-catalogue.json` (committed snapshot, crawled 2026-10-19)
→ `npm run catalogue:import`. The import is idempotent: it upserts by `legacy_id`. It does not
overwrite homepage content once that exists.

## Backups and restore

- Hosted Supabase: daily backups are included on paid plans; enable Point-in-Time Recovery for production.
- Before each production migration, take a manual backup (`supabase db dump` or the dashboard).
- Storage objects are not part of database backups. Product images can be re-imported from the
  crawl, but enquiry attachments need their own backup (for example a scheduled bucket sync).
