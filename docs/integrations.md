# Integrations

Status as of 2026-10-19. **No live third-party integration is connected.** The boundaries
are built and unit-tested with mocks; each one needs a business decision and credentials.

| Integration | Status | What exists | What is needed |
| --- | --- | --- | --- |
| CRM | ⛔ Pending provider choice | `CrmAdapter` interface (`lib/integrations/crm/types.ts`), outbox jobs, retry/backoff, idempotency keys, admin visibility and a "Retry now" button; `MockCrm` for tests | Which CRM; API docs; credentials; field mapping and owner rules (questions below) |
| Transactional email | ⛔ Pending provider choice | `EmailAdapter` interface, sales-notification and buyer-confirmation jobs, `MockEmail` | Provider (e.g. Resend, SES, Zoho ZeptoMail); verified sending domain; `SALES_NOTIFICATION_EMAIL` |
| WhatsApp | ⛔ Not started | Call and email links only | WhatsApp Business API access and approved templates, **or** agreement that a `wa.me` link is enough (it would not be automated) |
| Razorpay | ⛔ Not built | — (the live site has no checkout) | Decision on whether retail checkout is in scope, which products and prices, shipping/GST rules, a Razorpay account |
| Fulfilment / dropshipping | ⛔ Not built | — | Only relevant if retail checkout is approved; which provider and API |
| Analytics / error monitoring | ⛔ Not configured | — | Choice of tool (e.g. Vercel Analytics, GA4, Sentry) |

## How the integration boundary works

1. A buyer submits an enquiry. `create_wholesale_enquiry()` stores the enquiry, its items **and**
   one `integration_jobs` row per operation, all in one transaction.
2. If a provider isn't configured, the job is stored as `blocked` with a clear reason. It is
   never marked as done. The admin dashboard shows "Enquiries are stored, but not yet forwarded".
3. After the response is sent (`after()`), the server runs the enquiry's pending jobs.
4. Each attempt is claimed atomically (`pending|failed → running`), so two workers can't both send it.
5. Outcomes:
   - success → `succeeded`, with the external ID stored
   - transient error (timeout, 429, 5xx) → `failed`, with exponential backoff (~1, 2, 4, 8 min…, capped at 1 h)
   - permanent error, or 5 attempts used → `blocked`
6. `GET /api/jobs/run` (Bearer `CRON_SECRET`) or `npm run jobs:run` processes due retries.
   Staff can press **Retry now** on any blocked or failed job, which re-checks configuration.
7. Error messages are passed through `safeErrorMessage()` before they are stored or logged.
   It redacts tokens, keys and email addresses.

Idempotency: every job has a unique key (`<operation>:<enquiry id>`) that is passed to the
provider. Adapters must use it, or the website enquiry ID, to avoid creating duplicates.

## Adding the CRM adapter (once a provider is chosen)

1. Implement `CrmAdapter` in `lib/integrations/crm/<provider>.ts`. Use `fetchWithTimeout()`,
   which classifies transient and permanent failures.
2. Upsert the contact (by email) and company (by name/domain), then create the lead/deal with
   the website enquiry number in a custom field. Look that up first so it is idempotent.
3. Register it in `lib/integrations/registry.ts` and add the provider name to the
   `CRM_PROVIDER` enum in `lib/env.ts`, with its credential variables marked server-only.
4. Test against the provider's sandbox before production. Do not mark it live until it has
   been verified there.

### Questions for the business (CRM)

- Which CRM (Zoho CRM, HubSpot, Salesforce, Freshsales, LeadSquared, another)?
- Should an enquiry become a Lead, a Deal/Opportunity, or both? Who owns it, and how is it assigned?
- Required fields and status mapping (website status → CRM stage)?
- Should quotation amounts sync? Do CRM stage changes need to come back to the website?
- Sandbox account and API credentials?

## Field mapping (planned, provider-neutral)

| Website | CRM |
| --- | --- |
| `customer_name`, `email`, `phone`, `country` | Contact |
| `company_name` | Company / Account |
| `enquiry_number` | Lead/Deal external reference (custom field) |
| items (product, qty, specs), `message`, `target_budget` | Lead/Deal description or line items |
| `source = website` | Lead source |
| `status` | Stage (mapping to be agreed) |
