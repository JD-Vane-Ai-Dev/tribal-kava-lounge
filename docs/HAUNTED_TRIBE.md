# Haunted Tribe — October 30, 2026

## Confirmed offer

- Friday October 30 only, continuing into Saturday morning. Eastern time.
- Walkthrough windows: 7–10 PM and 10:30 PM–1:30 AM. One walkthrough per ticket; flexible across either window.
- Adult presale $10, door $15. Adult entry includes one free shell.
- Kids ages 5–12: presale $5, door $10; admission only, no drink entitlements.
- $25 shirt bundle, presale only, includes one admission, one shell, one BOGO redemption for kava/tea 9 PM–midnight. Sizes S/M/L/XL, chosen independently for every bundle. No extra adult ticket required for a bundle holder.
- Shirt is not required to be worn at the event. Wearing it on future visits gives 15% off drink tabs through December 31 (before January 1).
- Best costume: first $50 cash, second $25 bar tab. Judging time was not supplied, so none is invented.
- Buyer full name/email required. Multiple quantities; maximum 20 total admissions per order to bound checkout and payload size.
- Address: 770 S Military Trail, West Palm Beach, FL 33415; free parking.
- Flashing lights/strobes/scary scenes notice. Sales final except organizer-caused cancellation or failure to provide purchased admission/item.

## Site and deployment

The repository's actual canonical domain is `https://www.thetribalkavalounge.com` (not the earlier conversational shorthand). Event page `/haunted-tribe`; customer tickets `/haunted-tribe/tickets/`; staff check-in `/haunted-tribe/staff/`.

The main page has an ENTER THE HAUNT nav entry and a teaser after the existing hero. The event page uses the supplied shirt image, optimized as WebP. Palette follows the Claude brief: #0B0D0B, #3DFF7A, #C8102E, #EDE6D3. Schedule and pricing in the original brief are superseded by the owner's corrections above.

Existing site build and Azure Static Web Apps hosting are retained. Build copies the event directory separately from the SPA; no SPA catch-all intercepts the event route. Sitemap includes the landing page, never private ticket/staff pages. No account-wide Stripe branding/settings changes.

## Live activation — required before enabling checkout

These are not provisioned by this code change. Keep `HAUNT_PAYMENTS_ENABLED` unset/false until the live integration is verified. Missing settings fail closed with no PaymentIntent creation.

1. In the existing Azure Static Web App `tribal-kava-lounge-site`, resource group `tribal-kava-site-rg`, configure server-only application settings:
   - `STRIPE_SECRET_KEY`: authorized Vane Collective account key. Never commit or put in frontend.
   - `STRIPE_PUBLISHABLE_KEY`: matching account/mode public key, exposed through config only.
   - `STRIPE_WEBHOOK_SECRET`: endpoint signing secret.
   - `HAUNT_STORAGE_CONNECTION_STRING`: Azure Table Storage connection string. Provision private `HauntedTribeOrders` for live orders and `HauntedTribeTestOrders` for preview test orders. The server selects the table from the payment mode; test records never enter the live table.
   - `HAUNT_TOKEN_SECRET`: cryptographically random secret, at least 32 characters, stable for event lifetime. Rotation invalidates existing ticket links.
   - `HAUNT_EMAIL_CONNECTION_STRING`: Azure Communication Services Email connection string.
   - `HAUNT_EMAIL_FROM`: verified sender on that service.
   - `HAUNT_PAYMENT_MODE`: `test` on the isolated preview; `live` on production. Secret/restricted and publishable key prefixes must match this mode. Webhook events and retrieved payments must also match.
   - `HAUNT_PUBLIC_ORIGIN`: exact HTTPS origin with no trailing slash. For production use `https://www.thetribalkavalounge.com`; for tests use the deployed preview's `https://…azurestaticapps.net` origin. Receipt links and ticket QR destinations use this configured origin, never request headers. Test receipts are clearly labeled TEST.
   - Use separate preview/live application settings, Stripe webhook endpoints/secrets, and signing secrets. Keep the production `HAUNT_TOKEN_SECRET` stable after issuance. Prefer restricted Stripe keys with only the required PaymentIntent read/write and charge read permissions; configure webhook endpoints using separate administrative access.
2. Register Stripe webhook `https://www.thetribalkavalounge.com/api/haunt/webhook` for `payment_intent.succeeded`, `charge.refunded`, and `charge.dispute.created`.
3. Verify the ACS email domain and sender, then verify actual delivery of the test ticket to `jd@vaneai.tech` in Zoho. Provider acceptance alone is not inbox-delivery proof.
4. Confirm the ordinary Stripe payment arrangement and applicable tax treatment. The connected account defaults to Managed Payments; its in-person event restriction caused earlier Payment Link creation to fail. A per-link switch was rejected by automatic review. No account defaults were changed. This implementation uses Payment Element/PaymentIntents for ordinary payments, but live enablement remains gated until that setup is approved and verified. Listed advertised prices are charged as supplied; this implementation does not calculate/remit taxes or add a surcharge.
5. Verify Stripe enabled payment methods and bank payout settings, then use the isolated preview with test credentials to complete success, decline, redirect/3DS, a real signed webhook, durable order retrieval, inbox delivery, the emailed ticket link, and duplicate webhook delivery without duplicate fulfillment. Check mobile checkout and ensure failed/unpaid payments grant no admission and customer pages contain no actionable redemption controls. Do not charge a real card for testing.
6. Set `HAUNT_PAYMENTS_ENABLED=true` only when the above services are configured and checked. This is an event checkout switch, not a Stripe account-wide settings change.

## Staff setup — may follow sales launch

Staff onboarding is not a prerequisite for selling tickets. Keep staff endpoints protected while it is deferred. Before event operations, invite authorized staff through Azure Static Web Apps role management with custom role `haunted-staff`; staff signs in with Microsoft. Verify name lookup, simultaneous duplicate entry, free shell and BOGO timing. The platform and application both enforce the staff role. Do not expose this API directly outside SWA or trust client-provided identity headers on a separately hosted Function App. Never weaken authentication to unblock sales.

## Payment and ticket behavior

Server calculates totals from quantities/sizes. Submitted prices are ignored. Buyer terms acceptance is required. Presale closes October 30 at 7 PM Eastern. Frontend locks the cart once the Payment Element is mounted; edit destroys that element and starts a new request ID. Stripe idempotency reuses a persisted checkout on retry.

Azure Table entity stores the order, immutable cart, PaymentIntent ID and individual ticket redemptions. Never an in-memory ticket store. Paid entitlement requires Stripe retrieval confirming succeeded, correct currency, full expected amount, event metadata and order ID. Signed webhooks send customer confirmation with a private ticket link. The ticket page also reconciles successful payments if the webhook has not arrived. ACS uses a deterministic operation ID for retryable receipt delivery; failed email returns a failed webhook response so Stripe can retry.

Customer order access uses an HMAC capability in the URL fragment; request authorization uses a bearer header. Customer ticket QR codes contain per-ticket signatures and point to the staff page. QR generation is local, not an external QR service. A signed ticket only identifies a ticket; it cannot authorize redemption. Redemption requires staff role and an atomic Table ETag update. Duplicate scans fail rather than consume twice. Entry is blocked during the 10–10:30 PM break, BOGO is blocked outside 9 PM–midnight, and kids have no drink buttons. Staff must still verify age. Kratom tea is 21+.

Any refund or dispute marks the entire order for review, conservatively blocking automated redemption; partial refunds need human handling. Delayed successful-payment events cannot restore a reviewed order. No automatic refund action is implemented.

Staff lookup uses exact normalized full buyer name or full order ID, max 20 returned orders. Staff scans with the phone's ordinary QR camera, so the site does not request camera permission. No shirt pickup button, as requested.

## Verification boundaries

`npm test` includes the existing site suite plus payment/redemption core tests. Tests cover server pricing, quantities/sizes, presale closure, both entry windows/break, BOGO boundaries and single redemption, kids restrictions, unpaid/refunded access, signed webhook/replay, buyer capability authentication, staff permissions and ETag concurrency.

No live payment, live email, live Azure persistence or full browser interaction is implied by passing these tests. Complete deployed browser and integration checks before live activation. Keep evidence for the deployed commit, Stripe test PaymentIntent/event, durable order, inbox message, and working test ticket link. Unit tests and preview deployment alone do not establish a live store.
