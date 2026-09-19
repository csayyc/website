# Contact page and inquiry routing — reconciled plan

Supersedes `contact-review.md` and `contact-review2.md`. Delete both once this is agreed.

## Problem

Every contact inquiry currently lands in one inbox. The form posts to Web3Forms
(`layouts/contact/list.html:63`), which delivers to `hello@csacalgary.org` regardless of what
the visitor selected. Membership is the only topic with any follow-up behaviour, and it works
by firing a second browser request to `/membership-notify` after Web3Forms accepts.

Consequences:

- Membership, sponsorship and programs are run by different teams, but no team gets notified directly.
- There is no "general question" option on the form, even though `hello@` exists for exactly that.
- `membershipNotifySecret` is rendered into page source. `docs/TECHNICAL.md:111` already concedes
  this "stops scripted abuse but not a determined attacker who reads the secret from the page source."
- `content/contact/_index.md:7` shows `info@csacalgary.org` as link text but links to `mailto:hello@`.

## Goal

One simple form for visitors. Correct team notified automatically behind it. No new monthly tooling cost.

## Decisions locked

| Decision | Choice |
|---|---|
| Volunteer inquiries | Route to `membership@` — no `volunteer@` mailbox exists, and volunteering is a people-team relationship |
| URL parameter | Accept both `?topic=` and `?type=`, so links already shared externally keep working |
| Response-time promise | None stated publicly |
| Organization field | Always shown, always optional, no conditional logic |
| `hello@` on the page | Kept, but demoted from a bordered card to one line of text under the form |

Existing mailboxes are `membership@`, `sponsorship@`, `programs@` and `hello@`. Each team address
has at least three people with access. No new mailboxes are needed.

## Routing table

Six visitor-facing choices, four destinations.

| Topic slug | Visitor sees | Goes to |
|---|---|---|
| `membership` | Join the chapter | `membership@csacalgary.org` |
| `sponsorship` | Sponsor or partner with us | `sponsorship@csacalgary.org` |
| `speaking` | Propose a talk or program | `programs@csacalgary.org` |
| `volunteer` | Volunteer with us | `membership@csacalgary.org` |
| `events` | Ask about an event | `programs@csacalgary.org` |
| `general` | Something else | `hello@csacalgary.org` |

Rules:

- The routing table lives server-side only. The browser sends a topic slug, never an address.
- An unrecognised or missing slug routes to `hello@`.
- If a team's destination variable is unset, that topic falls back to `hello@` rather than failing.
- `hello@` is the fallback and manual-triage inbox. It is **not** copied on every submission —
  each team mailbox is the permanent record for its own topics.

## Contact page

`layouts/contact/list.html`

- Shrink the hero. The form is the page's primary content, not a footnote under a banner.
- Heading: **How can we help?** Subtext: *Choose a topic and we'll send your message to the right
  volunteer team.* No response-time claim.
- Field order: topic, name, email, organization (optional), message.
- On mobile, the form comes first in document order; the four supporting blurbs and the direct-email
  card follow it. On desktop, keep the existing two-column layout using CSS ordering only.
- Drop the membership message prefill. Use topic-aware placeholder text in the message field instead.
- Keep the LinkedIn hint for the membership topic.
- Success state stays topic-aware in tone but never mentions which team was notified.
- Replace the "Prefer to email directly?" card with a single line of small text under the form:
  *Prefer email? Write to hello@csacalgary.org.* The card gives email equal visual weight to the
  form and invites people to bypass the routing, which turns back into manual triage.
- Keep `hello@` prominent in the error state — if a send fails, that address is the only thing
  between you and a lost inquiry.
- Preserve current accessible validation: `aria-invalid`, `role="alert"` error text, focus to first
  invalid field, disabled submit while sending.

Deep links: `?topic=<slug>#contact-form` preselects the topic and scrolls to the form.
`?type=<slug>` is read as an alias for the same values. Unknown values leave the topic unselected.

## Background process

Replace Web3Forms and `functions/membership-notify.js` with a single endpoint,
`functions/contact-submit.js`, on the Cloudflare Pages Functions already in use.

Request body:

```json
{
  "topic": "membership",
  "name": "Visitor name",
  "email": "visitor@example.com",
  "organization": "",
  "message": "Message",
  "botcheck": "",
  "turnstileToken": "..."
}
```

The function:

1. Accepts POST only, and requires an `Origin` header matching the site host.
2. Treats a filled honeypot as a successful no-op.
3. Verifies the Turnstile token server-side against Cloudflare's siteverify endpoint.
4. Validates every field and applies length caps. Escapes all visitor-supplied HTML.
5. Resolves the topic against the server-side routing table.
6. **Sends the team notification. This send is mandatory** — if it fails, return an error and tell
   the visitor to email `hello@` directly, so the inquiry is never silently lost.
   - Subject: `[Website][Sponsorship] Name — Organization`
   - `Reply-To`: the visitor, so the team just hits reply
   - Body: topic, contact details, message, timestamp, inquiry ID
7. **Sends the visitor acknowledgement best-effort** — topic-specific subject and copy, `Reply-To`
   set to the relevant team address. If this fails, log it and still report success, so nobody
   resubmits a duplicate because a thank-you email bounced.
8. Returns consistent JSON. Never leaks provider errors to the browser.

The subject prefix makes mailbox rules work as a zero-config backstop if a variable is ever
misconfigured.

## Abuse protection

The form emails whatever address a visitor types, from a verified domain. That needs three layers,
not one:

1. Honeypot field (already present).
2. Turnstile, validated server-side.
3. ~~A Cloudflare WAF rate-limit rule on `/contact-submit`.~~ **Skipped — gated on this account's
   plan.** Turnstile carries this instead: tokens are single-use (Cloudflare rejects a reused token
   as `timeout-or-duplicate`), so each email costs the sender a freshly solved challenge. Residual
   risk is exhausting the Resend daily cap, which fails safe. Add an IP-keyed Workers KV counter in
   the function if abuse ever shows up.

## Environment variables

```text
RESEND_API_KEY
TURNSTILE_SECRET_KEY
HUGO_PARAMS_turnstileSiteKey   # public site key, build-time
CONTACT_MEMBERSHIP_TO
CONTACT_SPONSORSHIP_TO
CONTACT_PROGRAMS_TO
CONTACT_GENERAL_TO
```

Four destinations, not six — volunteer and events resolve to existing teams in code.

Team addresses should stay aliases or group addresses so recipients can change as volunteer roles
turn over, without a code change. No personal address ever enters the repo.

## Removals

- Web3Forms: `web3formsKey` param, the `access_key` hidden input, the `api.web3forms.com` fetch
- `functions/membership-notify.js` and `MEMBERSHIP_NOTIFY_SECRET`
- `membershipNotifySecret` param and its rendered value in page source
- `formspreeEndpoint` (already unused, in `hugo.toml`)
- Corresponding sections of `docs/TECHNICAL.md`

Verify with:

```bash
rg "web3forms|membership-notify|membershipNotifySecret|formspreeEndpoint"
```

## Build sequence

One sequential pass — this is one template, one function, and a link update. It does not need
parallel workstreams.

1. `functions/contact-submit.js` with the routing table and both email paths.
2. `layouts/contact/list.html` — layout, field order, topic select, dual-param handling, JSON submit.
3. CTA links: `layouts/index.html:71`, `layouts/partials/footer.html:8`,
   `layouts/membership/list.html:9,77`, `layouts/sponsors/list.html:103`,
   `layouts/partials/sponsor-bar.html:18`, `layouts/get-involved/list.html:40`, `data/sponsors.yaml`.
4. Fix the `info@` / `hello@` mismatch in `content/contact/_index.md:7`.
5. Config and docs: `hugo.toml`, `.dev.vars.example`, `docs/TECHNICAL.md` — including how to change
   a recipient without touching the form.
6. Remove the Web3Forms and membership-notify paths.

## Testing

- `npm run build` passes.
- `npm run functions:dev` and submit each of the six topics; confirm each reaches the right address.
- Every `?topic=` value preselects; every legacy `?type=` value preselects; unknown values do not.
- Form visible within the first mobile viewport after arriving from a topic CTA.
- Keyboard and screen-reader validation still works.
- Honeypot submission returns success and sends nothing.
- Missing or invalid Turnstile token is rejected.
- Simulated team-notification failure shows the `hello@` fallback.
- Simulated acknowledgement failure still shows success.
- Preview environment sends no real email unless explicitly configured.

## Operational setup

Outside the repo:

- Confirm `membership@`, `sponsorship@`, `programs@` each resolve to a group with its three owners.
- Create the Turnstile widget; add site key and secret to Pages.
- Add the four `CONTACT_*_TO` variables to Production.
- ~~Add the WAF rate-limit rule on `/contact-submit`.~~ Skipped — plan-gated. Set a Resend usage
  alert instead, so an unexpected spike is visible.
- Keep Preview delivery disabled or pointed at a test address.

## Cost

No new monthly cost at chapter volume.

- Cloudflare Pages Functions free tier: 100,000 requests/day.
- Resend free tier: 3,000 emails/month, 100/day. At two emails per inquiry that covers ~50 inquiries
  per day. The daily cap is the one to watch — because the team notification is the mandatory send
  and the acknowledgement is best-effort, hitting it degrades to "team still gets it" rather than
  losing an inquiry.
- Replaces Web3Forms, whose free tier caps at 250 submissions/month and whose routing features are
  a paid plan.

## Definition of done

- One form covers all six common inquiry types.
- Visitors never see or need to understand the routing.
- Every inquiry reaches a monitored team address; `hello@` catches anything unclassified.
- Visitors get an appropriate acknowledgement.
- All site CTAs preselect the right topic, and previously shared `?type=` links still work.
- Mobile users reach the form immediately.
- Web3Forms, the membership-only path, and the browser-exposed secret are gone.
- Build, responsive, accessibility, spam and failure-path checks pass.
