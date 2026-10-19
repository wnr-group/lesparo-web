# Audit, decisions and open questions

_Prepared 2026-10-19 (Day 1)._

## 1. What was audited

| Source | Result |
| --- | --- |
| Local repository | No existing LESPARO codebase on this machine, so this is a fresh build in `lesparo-web/` |
| lesparo.com | Crawled in full. PrestaShop in **catalog mode**: no prices (₹0), no cart or checkout, "Request for Quote" on every product, RFQ form with no file upload. Theme font: Jost. Languages: EN, TA, HI, BN. |
| Dribbble references (2 shots) | **Not accessible**: the pages render client-side and returned no content to the fetch tool. The design direction follows the written brief instead. |

## 2. Verified business facts (used on the site)

- **LESPARO — Abija Exports**, 5/5A/5B NMS Compound, Erode Fort, Erode 638001, Tamil Nadu.
  Office 094430 22044; customer care 93425 46046 (9 AM–6:30 PM); admin1@abijaexports.com.
  Instagram and Twitter: @lesparofashions.
- History (Company History page): R. Yuvaraj founded the business in 1979; Y. Sathish joined in 1999;
  Y. Sathish & Co. started in 2001; Abija Exports / LESPARO launched in 2017. Supplies showrooms in
  Tamil Nadu, Kerala and Karnataka.
- Trademark: LESPARO device mark, application 3620885, Class 25, filed 26 Aug 2017, Chennai IP office,
  "registered to Y. Sathish, trading as Abija Exports", status listed as **Accepted & Advertised**.
- Tagline from the logo: "Accomplish Great Things".
- Catalogue: **74 products, 281 images, 17 published categories**
  (Garments → Gents/Kids → Shorts/Tracks/3/4th; Fabric Unstitched → Lungi (Printed/Checked), Kavi (Kavi Dhothy), Towels, Kerchief).
  Only 16 products have descriptions. There are no SKUs, and no colour names beyond counts.

## 3. Inconsistencies found on the live site (need the business's answer)

1. The About page says Y. Sathish & Co. was **established in 1988**; the Company History page says **2001**. The new site uses the History page.
2. Contact hours differ: "9 AM–6:30 PM" (customer care) vs "9 AM–7:30 PM" (contact timing). Both are shown with their labels.
3. The footer links to **Ladies** (`/en/87-ladies`), which returns **404**. It now redirects to `/shop`. Is a ladies range planned?
4. The **T-Shirt** category (Adventure, Elegant) has no products, so it is hidden until products are added.
5. The **Vision** page is empty. The **Quality Policy** page only says "Test Reports". The "Terms" page contains the quality/replacement policy, not terms.
6. Possible duplicates: "Hand Kerchief 160" and "Handkerchief 160", and "Handkerchief 4400" and "Handkerchief 4400(1)". Both of each pair were imported as on the live site.
7. Data typos imported verbatim: Prime Fit Gents Jogger lists size "2X" (probably 2XL); Super Fine and Jersy King packing reads "Stream Iron & 5 set of back"; spellings such as "Jersy King".
8. The live homepage advertises "Money Back Guarantee", "24/7 Online Support" and "exclusive discounts". These were **not carried over**: there is no supporting policy, and the brief forbids unverified claims.

## 4. Decisions taken (reversible)

| # | Decision | Why |
| --- | --- | --- |
| D1 | Fresh Next.js 16 + Supabase build (no existing code to preserve) | Brief's default stack; PrestaShop is replaced |
| D2 | **Quote-first.** Retail checkout, Razorpay, orders and fulfilment are **not built** | The live business sells by quotation only; building payments needs pricing, GST, shipping and returns rules that don't exist yet. `retail_enabled` and `price` are ready for later. |
| D3 | Three-level category tree; the live site's single-product "line" categories became products | Cleaner navigation; every old category and product URL 301s to its new page (128 redirects) |
| D4 | An "enquiry list" (saved in the browser) instead of a cart | The quote-business equivalent of a cart: buyers collect products while browsing and send one enquiry |
| D5 | Enquiries are written only by server code (service role); visitors have no table access | Rate limiting, file sniffing and atomic creation with outbox jobs |
| D6 | CRM and email go through an outbox with `blocked` status until configured | Enquiries are never lost and never falsely reported as synced |
| D7 | Hero = layered real product photographs with restrained pointer parallax; no WebGL | There is no 3D asset or editorial photography; this avoids a heavy engine and doesn't misrepresent products |
| D8 | Logo used unaltered (raster from the live site) | Registered mark; a vector master was not available |
| D9 | Policy pages: Quality policy shown from the live text (lightly copy-edited); Privacy describes only what the software actually does, marked "being finalised"; Terms and Shipping/Returns are placeholders | No approved policies exist |
| D10 | Tamil, Hindi and Bengali URLs redirect to English pages | No translated content was available to migrate; multilingual support needs a decision |

## 5. Open questions (blocking items marked ●)

- ● **CRM provider** and its API credentials, plus the mapping rules (see `docs/integrations.md`).
- ● **Email provider** and sending domain; which inbox should receive new enquiries?
- ● **Is retail checkout in scope?** If yes: which products, which prices (incl. GST), shipping charges, return/refund policy, Razorpay account, fulfilment provider.
- ● **Hosting access**: Vercel and Supabase accounts, and DNS for lesparo.com.
- WhatsApp: Business API, or a simple `wa.me` click-to-chat link? Which number?
- Should customers have accounts (order or enquiry history), or are enquiries anonymous? (Currently anonymous.)
- Should staff roles stay as admin/sales, or does sales need limited product editing?
- Answers to the inconsistencies in section 3.
- Are Tamil, Hindi and Bengali versions needed?

## 6. Missing assets

- **Editorial / lifestyle photography** for the hero and brand story. Today only white-background
  product shots (513×655 px) exist. The admin can upload a hero photograph when one is available.
- **High-resolution product images**: 513×655 is too small for zoom or texture views. Magnification
  is not enabled for that reason.
- **Vector logo** (SVG or AI) for crisp rendering at small sizes.
- Fabric close-ups (GSM, weave) and colour names per product.
- Approved policies: privacy, terms, shipping and returns.

## 7. Delivery status against the 30-day plan

| Milestone | Status |
| --- | --- |
| M1 Foundation (Day 5) | ✅ Audit, data model, RLS, design system, local environment |
| M2 Storefront (Day 10) | ✅ Home, shop/search/filters/sort/pagination, collections, product pages, about, contact, policies, SEO (metadata, sitemap, robots, JSON-LD, redirects) |
| M3 Core workflows (Day 15) | ✅ Wholesale enquiry end to end (items, attachments, idempotency, rate limit), admin auth, product/category/image management, enquiry management, homepage editor |
| Integrations | ⛔ Boundaries built and tested with mocks; **live CRM and email blocked on provider choice**; Razorpay and fulfilment depend on the retail decision |
| M4 Staging (Day 20) | ⛔ Needs hosting accounts (section 5) |

## 8. Test results (local, 2026-10-19)

- `tsc --noEmit`: clean. `eslint .`: clean. `next build`: succeeds (120 routes; catalogue pages prerendered).
- `npm test`: 25/25 unit tests pass (enquiry validation, job runner, parser, uploads, content links).
- `npm run test:security`: 24/24 RLS, grant and storage checks pass (anon, sales, admin).
- Manual browser run: added two products to the enquiry list → submitted an enquiry → got
  `LSP-2026-00001` → signed in as admin → added a note, set the status and a quotation → status history recorded;
  unpublished a product → it disappeared from the public pages immediately → republished it.
- Responsive check: no horizontal overflow at 390 px on home, shop, collection, product, wholesale, about and contact
  (a product-page gallery overflow was found and fixed).
- Lighthouse (mobile, simulated throttling, local production server):

  | Page | Performance | Accessibility | Best practices | SEO | LCP | CLS |
  | --- | --- | --- | --- | --- | --- | --- |
  | `/` | 84 | 96 → fixed\* | 100 | 100 | 4.2 s | 0 |
  | `/products/loom-don-shorts` | 84 | 100 | 100 | 100 | 4.1 s | 0 |
  | `/wholesale` | 87 | 100 | 100 | 100 | 3.5 s | 0 |

  \*The only accessibility failure was the contrast of a decorative watermark, which has been removed (not re-measured).
  LCP is the hero/product image, served through the local image optimiser from local Supabase. Re-measure on staging behind a CDN.

Not yet tested: real CRM or email delivery (no providers configured), real devices or screen readers, and client UAT.
