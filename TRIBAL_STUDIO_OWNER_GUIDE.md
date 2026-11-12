# Tribal Studio owner guide

Private planning workspace: https://thetribalkavalounge.com/studio (not included in the lounge public navigation).

- Use the same owner code as /insights. The browser holds it only in memory. Tracker reads/writes require server-side authorization.
- Public quote form: /events/venue (tribal-private-rental in Netlify Forms).
- Public vendor interest form: /vendor-market.html (tribal-vendor-interest in Netlify Forms).
- Rental form integration: verified tribal-private-rental submissions now automatically flow into the existing Studio Inquiries board through the Netlify-signed formSubmitted event (tribal-form-events.mjs). A deterministic ID prevents retry duplicates. The existing Netlify email notification for this form already alerts the owner. Vendor applications remain manual, not part of the rental booking pipeline.
- Each imported rental request begins at new, including date, time, guest count, requested add-ons, contact and a follow-up date. A request does not hold a date.
- Owner workflow: review availability, enter an approved quote amount and proposed deposit, optionally enter a Stripe-hosted payment link from the correct Tribal business account, save a lead as quoted/pending, and click Prepare quote email to review and send in the owner's email client. The site does not email customers without review or charge them automatically.
- Only after a deposit is verified with an actual reference (or explicitly waived) and staff check availability can a record be marked booked. Then the owner can prepare a confirmation email and open an editable Google Calendar event. These steps are owner-controlled; the deposit status is not currently verified by a Stripe webhook and the calendar is not written automatically.
- Payment-provider caveat: the currently connected Stripe account is named Buildry, not Tribal. Do not use Buildry Stripe payment links for Tribal until the right business Stripe account is linked. No Stripe API secret was installed, no payment collected, and no new Stripe account created.
- All new PII stays in the existing owner-gated Blobs store, and the Netlify Forms submission remains in Netlify's protected Forms list. Do not send customer contacts or payment credentials through public logs. Netlify form spam filtering runs before the event handler.
- Inquiries, vendors, follow-ups and draft/approved/published post statuses are stored in Netlify Blobs by tribal-ops. A post is only approved when the owner marks it approved and is only published when a verified URL is entered.
- Promo Studio downloads a 1080x1350 PNG using the existing actual lounge photo and produces editable copy. No social posting or automatic reminders are performed.
- Introductory venue offer: $250 for 3 hours on select off-peak dates only; plus $50 per approved additional 30 minutes. Add-on prices/dates are custom-confirmed. Venue maximum occupancy is 75 guests as confirmed by the owner; event layouts can support fewer.
- Vendor pop-up date and spaces are unconfirmed. Free booth consideration does not guarantee a slot.
- Public lounge homepage is at / and built from the approved Botanical Kava source without rental advertising.
