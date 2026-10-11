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

Customer order access uses an HMAC capability in the URL fragment; request authorization uses the dedicated `X-Haunt-Ticket-Token` header because Azure Static Web Apps replaces the standard Authorization header. Customer ticket QR codes contain per-ticket signatures and point to the staff page. QR generation is local, not an external QR service. A signed ticket only identifies a ticket; it cannot authorize redemption. Redemption requires staff role and an atomic Table ETag update. Duplicate scans fail rather than consume twice. Entry is blocked during the 10–10:30 PM break, BOGO is blocked outside 9 PM–midnight, and kids have no drink buttons. Staff must still verify age. Kratom tea is 21+.

Any refund or dispute marks the entire order for review, conservatively blocking automated redemption; partial refunds need human handling. Delayed successful-payment events cannot restore a reviewed order. No automatic refund action is implemented.

Staff lookup uses exact normalized full buyer name or full order ID, max 20 returned orders. Staff scans with the phone's ordinary QR camera, so the site does not request camera permission. No shirt pickup button, as requested.

## Verification boundaries

`npm test` includes the existing site suite plus payment/redemption core tests. Tests cover server pricing, quantities/sizes, presale closure, both entry windows/break, BOGO boundaries and single redemption, kids restrictions, unpaid/refunded access, signed webhook/replay, buyer capability authentication, staff permissions and ETag concurrency.

No live payment, live email, live Azure persistence or full browser interaction is implied by passing these tests. Complete deployed browser and integration checks before live activation. Keep evidence for the deployed commit, Stripe test PaymentIntent/event, durable order, inbox message, and working test ticket link. Unit tests and preview deployment alone do not establish a live store.


## Deployment checkpoint — October 11, 2026

- Authenticated Azure read verified the named Static Web App in subscription `0fd71da0-a2ba-470a-ac27-fc5b7ef186ca`; Azure access is working in this session.
- Reused `stkimimcp0fd71da0` in `tribal-kava-automation-rg`. Created private `HauntedTribeOrders` and `HauntedTribeTestOrders`; a real test-table write/read succeeded. Runtime connections use separate table-scoped SAS credentials with query/add/update permissions, expiring February 1, 2027. Renew before expiry if order access is still required. No account-wide storage permission changes.
- Created `tribal-haunt-email` and `tribal-haunt-mailer` in `tribal-kava-site-rg`; linked the Azure-managed domain. Domain, SPF, both DKIM records and DMARC report Verified. Sender is `donotreply@bd3bd7e6-af1f-4648-819b-cd777ecfd0ad.azurecomm.net`.
- Configured storage, separate stable signing secrets, email connection/sender, payment mode and exact public origin separately for preview environment `9` and production. Existing settings preserved. Both keep `HAUNT_PAYMENTS_ENABLED=false`. Dedicated Stripe secret/restricted and publishable application keys remain missing. The preview webhook secret is configured; the production webhook is not created.
- The authorized delivery-only email to `jd@vaneai.tech` was accepted by ACS (operation `7b211658-0ac0-4016-b9f4-7463fb6cc95d`). It explicitly says it is not a ticket and no payment occurred. Azure delivery metrics subsequently confirmed failure (`554 5.7.7`). A second diagnostic send, operation `2925023e-f7af-4f2d-ba2c-98ac3540a4df`, also failed at `mx.zoho.com`: `MessageIntegrityFailure`, `Email policy violation detected`. Neither establishes inbox delivery. Diagnostic setting `haunted-tribe-email-delivery` now stores EmailSendMailOperational and EmailStatusUpdateOperational logs in the existing storage account. Do not weaken recipient spam policies to pass this check; identify the rejecting policy with Zoho message tracing/support and correct the sender or message configuration.
- Commit `05045ccc3807044870e63b1334e0600735196e4f`: local build, site checks, analytics and 31 API tests passed; GitHub run `38178680265` passed and deployed the review environment. Browser cart check: two adults, two kids and two independently sized bundles total $80. Real mobile payment interaction is unverified.
- Deployed preview config remains disabled; checkout POST returns 503 and unauthenticated staff lookup returns 401. Production `/haunted-tribe` still serves the main-site HTML. No merge or production deployment performed.
- Remaining gates: dedicated Stripe test/live application credentials; matching webhook endpoints/secrets; account eligibility for this event/bundle; deployed test payment and signed webhook; durable paid order; actual inbox ticket delivery and working ticket link; replay/failure/mobile checks. Staff onboarding does not block sales launch.

### Stripe pairing and remaining access boundary

- Official device-code CLI pairing succeeded. Real authenticated API reads verified sandbox `acct_1UKYZaPI7lrt9FUX` and live `acct_1ULElUAT0Dch1Twa`. CLI was returned to the sandbox after the live read. No live payment or account settings change was made.
- The live account reports `charges_enabled=true`, `payouts_enabled=true`, and active card payments, but an identity-verification challenge is currently/past due. Its business profile describes consulting, MCC 7392. These flags do not establish approval for the event or drink bundle. Resolve the outstanding verification in Stripe and confirm this business activity before activation.
- Sandbox endpoint `we_1UPVWNPI7lrt9FUXhxouF73G` targets the preview `/api/haunt/webhook` and subscribes to the three required events. Its signing secret was securely stored in preview settings. Endpoint is disabled until the preview application keys are configured; enable it before deployed payment testing. Other Stripe endpoints were preserved.
- The chat Stripe connector exposes the live account but no API-key issuance operation. Standard CLI API calls work; its extra `tools` plugin cannot start in this execution environment (`listen unix ... socket: operation not permitted`). CLI OAuth pairing is not a provisioned long-lived website credential. Do not copy CLI session tokens into application settings.
- Next credential step: through Stripe's supported Dashboard or an approved environment that supports key administration, create a dedicated restricted key with PaymentIntents read/write and Charges read, plus the matching publishable key. Configure `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY` directly in SWA preview environment `9` for the sandbox. Keep secrets out of chat and source control. Repeat with separate live credentials only after account eligibility is resolved. Production remains disabled throughout preview verification.
- Email investigation evidence: second rejection at `2026-10-11T22:47:31.354Z`, recipient `jd@vaneai.tech`, ACS operation above; diagnostic blob container `insights-logs-emailstatusupdateoperational`. No paid order, delivered ticket email, or working emailed paid-ticket link has been verified. Do not merge or activate until the integration gates above pass.


### Deployed sandbox payment — October 11, 2026

- User-provided sandbox secret and publishable keys are securely installed in preview `9`. The sandbox webhook is enabled. Preview checkout is enabled for testing only. Production has the explicitly authorized reused UnlockLine live restricted key and the supplied live publishable key; live checkout remains disabled. No credentials are stored in this document or source code.
- Browser purchase submitted full name and `jd@vaneai.tech`, two adults, two children, and two shirts (S and XL). Server/Stripe amount: $80.00. Payment Element accepted Stripe's test card; no real card charged.
- Durable test-table order `14dcc18efec790e5537521ecdc54217617ee`, PaymentIntent `pi_3UPWCuPI7lrt9FUX2t3x8pWa`: status paid, shirts S/XL, emailSent true after webhook fulfillment. emailSent records provider acceptance, not inbox delivery; Zoho search still returned no ticket email.
- The browser's returned ticket token matches the stable preview signing secret, but deployed ticket retrieval failed. The integration fix uses `X-Haunt-Ticket-Token` because the host reserves/replaces Authorization. Regression coverage simulates the platform header and rejects missing/forged buyer tokens. Verify the existing paid order after deploying this fix.
- The API's past_due identity challenge conflicts with the user's empty Dashboard requirements. Charges and payouts remain enabled and disabled_reason is null; this is an unresolved discrepancy, not a confirmed account restriction or a reason by itself that checkout cannot be built.
