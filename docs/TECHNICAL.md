# Technical Reference

For public site purpose and content standards, see [README.md](../README.md). For contribution workflow, see [CONTRIBUTING.md](CONTRIBUTING.md).

## Stack

- Hugo
- Tailwind CSS
- Decap CMS at `/admin/`
- Cloudflare Pages Functions for CMS GitHub OAuth
- Cloudflare Pages hosting
- Cloudflare Web Analytics when `cloudflareAnalyticsToken` is configured

## Structure

```text
content/        Markdown pages and events
data/           YAML data for board, sponsors, resources
layouts/        Hugo templates
static/         Static files, images, admin CMS
functions/      Cloudflare Pages Functions
assets/css/     Tailwind source CSS
hugo.toml       Site config, params, navigation
```

## Content Locations

| Site Area | File or Folder |
| --- | --- |
| Home | `content/_index.md` |
| About | `content/about/_index.md` |
| Board page | `content/about/board/_index.md` |
| Board cards | `data/board.yaml` |
| Events | `content/events/*.md` |
| Get Involved | `content/get-involved/_index.md` |
| Sponsors | `data/sponsors.yaml` |
| Resources | `data/resources.yaml` |
| Contact | `content/contact/_index.md` |
| Navigation/global params | `hugo.toml` |

## Local Commands

```bash
npm install
npm run dev
npm run build
```

Production output is generated in `public/`.

## Cloudflare Pages

Recommended settings:

- Build command: `npm ci && npm run build`
- Build output directory: `public`
- `HUGO_VERSION=0.161.1`

Expected secrets/environment variables:

- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `CMS_ALLOWED_GITHUB_USERS` comma-separated GitHub usernames allowed to use Decap CMS
- `HUGO_PARAMS_turnstileSiteKey` — public Turnstile site key, rendered into the contact page at build time
- `HUGO_PARAMS_cloudflareAnalyticsToken`
- `RESEND_API_KEY`
- `TURNSTILE_SECRET_KEY`
- `CONTACT_MEMBERSHIP_TO`
- `CONTACT_SPONSORSHIP_TO`
- `CONTACT_PROGRAMS_TO`
- `CONTACT_GENERAL_TO`

### Deployment Workflow and Branch Previews

Pushing to `main` builds and deploys to production at [csacalgary.org](https://csacalgary.org).

Cloudflare Pages also builds **every other branch automatically** — no setup needed. Collaborators can preview changes on a live URL before merging:

- Push any branch (e.g. `staging`, `feature/board-refresh`) and it deploys to a stable URL: `https://<branch>.website-j8h.pages.dev` (e.g. `https://staging.website-j8h.pages.dev`). Each commit also gets its own URL: `https://<commit-hash>.website-j8h.pages.dev`.
- Open a PR against `main` and the PR's status checks include a **Deployment** link to that commit's preview URL — no Cloudflare account needed to view it.
- Suggested flow: branch → push → review the preview URL → open PR → merge to `main` to publish.

Notes:

- Preview deployments use the **Preview** environment's variables, which are configured separately from Production in the Pages dashboard. Preview intentionally does **not** have `RESEND_API_KEY`, so the contact endpoint fails closed on previews and never sends real email; other Preview variables should mirror Production where needed.
- Preview URLs are public (unauthenticated). Don't merge anything to a branch if its content isn't ready to be seen.

## CMS

CMS files:

- `static/admin/index.html`
- `static/admin/config.yml`
- `functions/auth.js`
- `functions/callback.js`

Decap CMS is pinned in `static/admin/index.html`. Event fields in `static/admin/config.yml` should stay aligned with the event template fields used by `layouts/events/single.html`.

CMS protection layers:

- Decap uses GitHub sign-in against `csayyc/website`.
- `publish_mode: editorial_workflow` keeps CMS changes in Decap's review workflow before publishing.
- `functions/callback.js` requires `CMS_ALLOWED_GITHUB_USERS`; login fails closed if the variable is missing or the GitHub login is not listed.

## Contact Form and Inquiry Routing

The contact form posts JSON to `functions/contact-submit.js` at `/contact-submit`. The browser sends a topic slug — never an email address — and the function resolves the slug against a server-side routing table, then sends two emails via the Resend API:

1. **Team notification (mandatory).** Goes to the destination resolved from the routing table, with `Reply-To` set to the visitor so the team can simply hit reply. The subject is prefixed `[Website][<Topic>]` so mailbox rules work as a zero-config backstop if a variable is ever misconfigured. If this send fails, the function returns an error and the page tells the visitor to email `hello@csacalgary.org` directly, so an inquiry is never silently lost.
2. **Visitor acknowledgement (best-effort).** Topic-specific subject and copy, sent from the team address with `Reply-To` set to it. If this send fails it is only logged — the visitor still sees success, so nobody resubmits a duplicate because a thank-you email bounced.

Routing table (six topics, four destinations):

| Topic slug | Destination variable | Fallback |
| --- | --- | --- |
| `membership` | `CONTACT_MEMBERSHIP_TO` | `CONTACT_GENERAL_TO` |
| `sponsorship` | `CONTACT_SPONSORSHIP_TO` | `CONTACT_GENERAL_TO` |
| `speaking` | `CONTACT_PROGRAMS_TO` | `CONTACT_GENERAL_TO` |
| `volunteer` | `CONTACT_MEMBERSHIP_TO` | `CONTACT_GENERAL_TO` |
| `events` | `CONTACT_PROGRAMS_TO` | `CONTACT_GENERAL_TO` |
| `general` | `CONTACT_GENERAL_TO` | `hello@csacalgary.org` |

An unrecognised or missing slug routes to `general`. If a topic's destination variable is unset, the topic falls back to the general address rather than failing.

**Changing a recipient:** update the relevant `CONTACT_*_TO` variable in the Pages dashboard and redeploy. No code or template change is needed — the form and function never contain addresses. Keep destinations as aliases or group addresses so recipients can change as volunteer roles turn over; no personal address should ever be used.

Requires `RESEND_API_KEY` (Cloudflare Pages secret). The sending domain must be verified in Resend; this does not require changing the mailbox provider's MX records.

Abuse protection has three layers:

- A honeypot field; a filled honeypot is treated as a successful no-op and nothing is sent.
- A Cloudflare Turnstile widget on the form, verified server-side against the siteverify endpoint with `TURNSTILE_SECRET_KEY`. The public site key reaches the page via the `turnstileSiteKey` Hugo param (`HUGO_PARAMS_turnstileSiteKey` build variable).
- Rate limiting on `/contact-submit` is **not** currently configured. Cloudflare's WAF rate-limiting
  rules are gated on this account's plan. Turnstile is the working defence: tokens are verified
  server-side, fail closed, and Cloudflare marks each token consumed on verification, so a reused
  token is rejected as `timeout-or-duplicate`. Every email therefore costs the sender a freshly
  solved challenge.
- Residual risk: someone paying a challenge-solving service could still exhaust the Resend daily
  cap (100 emails/day, ~50 inquiries). That degrades safely — the team notification is the mandatory
  send. Watch for it with a Resend usage alert rather than assuming it cannot happen.
- If abuse does appear, the cheapest fix is an IP-keyed counter in Workers KV inside
  `functions/contact-submit.js`, not a plan upgrade.

The request must also carry an `Origin` header matching the site host, so cross-site browser use is rejected. Failures are logged via `console.error` (visible in Cloudflare Pages function logs); internal Resend and Turnstile error details are never returned to the client.

The team mailboxes (`membership@`, `sponsorship@`, `programs@`, `hello@` at `csacalgary.org`) must exist and be actively monitored — that's managed in the mailbox provider (PurelyMail), not this repo.

### Local Testing

Pages Functions don't run under plain `hugo server` — use Wrangler's local emulator instead:

1. Copy `.dev.vars.example` to `.dev.vars` and fill in a real `RESEND_API_KEY`, `TURNSTILE_SECRET_KEY`, and the four `CONTACT_*_TO` addresses (this file is gitignored and never committed). To exercise the full browser flow, also set the `turnstileSiteKey` param (e.g. via `HUGO_PARAMS_turnstileSiteKey` in the shell) so the contact page renders the Turnstile widget.
2. Run `npm run functions:dev`. This builds the site once and serves it from `public/` via `wrangler pages dev`, with `functions/` running locally — no Cloudflare account or deploy required.
3. Visit the printed local URL (defaults to `http://127.0.0.1:8788`) and submit the contact form for each topic.

This is local-only: it doesn't touch the Cloudflare Pages dashboard config, doesn't deploy anything, and `.dev.vars` never leaves your machine.
