# Razorpay online payment

Retail checkout can take payment online through Razorpay Standard Checkout. Wholesale enquiries are unchanged: they stay quote-first and are never turned into payable orders by this feature.

Online payment is **off** until `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are both set. While off, checkout offers cash on delivery and the old "we will send a payment link" option exactly as before.

## How it works

1. **Place order.** The checkout server action validates the cart and customer details and saves the order with `payment_method = razorpay`, `payment_status = pending`. Prices and totals are read from the database; nothing the browser sends about money is used. The order gets a private `access_token`.
2. **Status page.** The browser goes to `/checkout/status?o=<order number>&t=<token>`. The page shows the order summary and a Pay button. The token is the buyer's key: without it the order cannot be viewed or paid, and the page never shows address, phone or email.
3. **Create Razorpay order** (`POST /api/payments/razorpay/order`). The server rebuilds the amount in paise from the saved line prices, creates one Razorpay order for this order (reused on every retry) and returns only the public Key ID, the Razorpay order id, the amount and the buyer's prefill details.
4. **Checkout.** Razorpay Standard Checkout opens. Closing it, or a failed payment, leaves the order saved and retryable. It never marks anything paid.
5. **Verify** (`POST /api/payments/razorpay/verify`). The server checks the order id matches the one it stored, verifies the HMAC-SHA256 signature in constant time, then fetches the payment from Razorpay and confirms it belongs to this order, is `captured`, and matches the expected amount and currency. Only then is the order `paid`. An `authorized`-only payment, or Razorpay being unreachable after a valid signature, leaves the order `verifying`.
6. **Webhook** (`POST /api/payments/razorpay/webhook`). Razorpay also reports `payment.captured`, `payment.failed`, `payment.authorized` and `order.paid`. The signature is checked against the raw body. Events are deduplicated on `X-Razorpay-Event-Id`. The same settlement rules apply, so the browser callback and the webhook can arrive in any order, or repeat, and the result is the same.

All three paths use one decision function (`lib/payments/core.ts`, `decideSettlement`).

### Payment states

| `payment_status` | Meaning |
| --- | --- |
| `pending` | Saved, not paid yet (also: window closed, or retrying after a failure) |
| `verifying` | A payment exists but is not confirmed as captured yet, or its amount did not match. Settles by webhook, or staff "Check with Razorpay" |
| `paid` | Verified captured payment of the right amount. Never moved backwards by a late or repeated event |
| `failed` | The latest attempt failed. The buyer can retry on the same order |
| `refunded` | Staff recorded a refund after payment |

A second capture on an order that is already paid is stored on the `payments` table with `duplicate = true` and shown in the admin order page: refund it from the Razorpay Dashboard.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `RAZORPAY_KEY_ID` | Public Key ID. Sent to the browser by the order endpoint only. |
| `RAZORPAY_KEY_SECRET` | Server only. Signs and verifies checkout callbacks, authenticates API calls. |
| `RAZORPAY_WEBHOOK_SECRET` | Server only. Verifies webhook signatures. Webhooks return 503 until it is set. |

Set them in `.env.local` for development and in the Vercel project settings for deployments. Never commit real values. Keys are read at request time on the server; the checkout page decides whether to offer online payment at build time, so redeploy after adding or removing the keys.

## Razorpay Dashboard setup

1. Switch the Dashboard to **Test Mode** and create an API key pair (Account & Settings > API Keys). Put them in the environment variables above.
2. Create the webhook (Account & Settings > Webhooks > Add New Webhook):
   - URL: `https://<your-domain>/api/payments/razorpay/webhook`
   - Secret: any random string of 24+ characters; use the same value for `RAZORPAY_WEBHOOK_SECRET`
   - Events: `payment.captured`, `payment.failed`, `payment.authorized`, `order.paid`
3. For local testing, expose the dev server with a tunnel (for example `ngrok http 3000`) and use that URL for a Test Mode webhook.
4. Make sure payment capture is **automatic** (Settings > Payment Capture). With manual capture, payments stay `authorized` and the order stays `verifying` until captured.

## Testing in Test Mode

Use Razorpay's test cards and UPI ids from <https://razorpay.com/docs/payments/payments/test-card-details/>. No real money moves.

1. Successful payment: add an item, check out with **Pay online**, pay with a test card or the success UPI id. Expect the "Payment received" page, the order `paid` in the admin, and the cart emptied.
2. Failed payment: use the failure test card or the failure UPI id. Expect the retry message, and the order `failed`. Pay again: the same order and Razorpay order are reused.
3. Dismissed: close the Checkout window. Expect "payment window was closed", the order still `pending`, and a Resume button.
4. Refresh the status page at any point: it reads the real state from the server.
5. Reconcile: in the admin order page, **Check with Razorpay** re-reads the payments from Razorpay and settles the order with the same rules as the webhook.
6. Webhook: the Dashboard's webhook page can resend any delivery. Resending must report `duplicate` and change nothing.

The automated suite (`npm test`) covers signature verification, tampered amounts, order-id substitution, duplicate callbacks, repeated and out-of-order webhooks, timeouts, retries and already-paid orders against a temporary database and a fake gateway. It never calls Razorpay.

## Going live

1. Complete Razorpay KYC and activate the account.
2. Test Mode passes every check above.
3. Generate **Live** API keys, create a Live Mode webhook (same URL, new secret) and replace the three variables in production.
4. Place one small real order, confirm it reaches `paid`, then refund it from the Dashboard and record the refund on the admin order page.

## Admin

The admin order page shows, for online orders: payment status, whether the signature was verified, paid time, the amount sent in paise, the Razorpay order and payment ids, every payment attempt (with duplicates flagged), and a change log. Payment status on Razorpay orders is set by the verified flow; staff can only record a refund after payment (admin role) and every manual change is written to the log with the staff member's email.

## Known limits

- If Razorpay creates an order but the response is lost (timeout), the retry creates a second Razorpay order. The first is unused and harmless; only the one stored on our order can settle it.
- An order that was paid, then refunded in the Dashboard, is not updated automatically (no refund webhook is handled yet): record it on the admin order page.
- Orders are INR only, matching the catalogue.
