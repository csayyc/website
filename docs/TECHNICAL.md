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
- `HUGO_PARAMS_web3formsKey`
- `HUGO_PARAMS_membershipNotifySecret` — must equal `MEMBERSHIP_NOTIFY_SECRET`
- `HUGO_PARAMS_cloudflareAnalyticsToken`
- `RESEND_API_KEY`
- `MEMBERSHIP_NOTIFY_SECRET`

### Deployment Workflow and Branch Previews

Pushing to `main` builds and deploys to production at [csacalgary.org](https://csacalgary.org).

Cloudflare Pages also builds **every other branch automatically** — no setup needed. Collaborators can preview changes on a live URL before merging:

- Push any branch (e.g. `staging`, `feature/board-refresh`) and it deploys to a stable URL: `https://<branch>.website-j8h.pages.dev` (e.g. `https://staging.website-j8h.pages.dev`). Each commit also gets its own URL: `https://<commit-hash>.website-j8h.pages.dev`.
- Open a PR against `main` and the PR's status checks include a **Deployment** link to that commit's preview URL — no Cloudflare account needed to view it.
- Suggested flow: branch → push → review the preview URL → open PR → merge to `main` to publish.

Notes:

- Preview deployments use the **Preview** environment's variables, which are configured separately from Production in the Pages dashboard. Preview intentionally does **not** have `RESEND_API_KEY`, so the membership acknowledgment email fails closed on previews and never sends real email; other Preview variables should mirror Production where needed.
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

## Membership Acknowledgment Email

When a visitor submits the contact form with "New membership" selected, the form (after Web3Forms accepts the submission) makes a best-effort call to `functions/membership-notify.js` at `/membership-notify`, which sends a personalized acknowledgment email via the Resend API using the submitted name and email. This is fire-and-forget from the browser — a failure here does not affect the visitor's Web3Forms submission or the success state they see.

Requires `RESEND_API_KEY` (Cloudflare Pages secret). The sending domain must be verified in Resend; this does not require changing the mailbox provider's MX records.

The endpoint is hardened against direct POST abuse (being used as an open email sender):

- The request must carry an `Origin` header matching the site host, so cross-site browser use is rejected.
- The request must carry an `X-Membership-Secret` header equal to the `MEMBERSHIP_NOTIFY_SECRET` Pages secret. The browser gets this value from the `membershipNotifySecret` Hugo param (`HUGO_PARAMS_membershipNotifySecret` build variable), rendered into the contact page. Set the same value in both places; if either is missing, the endpoint fails closed (500 if unconfigured, 403 on mismatch). This stops scripted abuse but not a determined attacker who reads the secret from the page source — a Cloudflare WAF rate-limiting rule on `/membership-notify` is a recommended additional layer.

Failures are logged via `console.error` (visible in Cloudflare Pages function logs); internal Resend error details are never returned to the client.

The email is sent from and replies to `membership@csacalgary.org` (hardcoded in `functions/membership-notify.js`), so intending members can reply directly into a mailbox monitored by the membership director. This mailbox must exist and be actively monitored — that's managed in the mailbox provider (PurelyMail), not this repo.

### Local Testing

Pages Functions don't run under plain `hugo server` — use Wrangler's local emulator instead:

1. Copy `.dev.vars.example` to `.dev.vars` and fill in a real `RESEND_API_KEY` and a `MEMBERSHIP_NOTIFY_SECRET` value (this file is gitignored and never committed). To exercise the full browser flow, set the same secret as the `membershipNotifySecret` param (e.g. in `hugo.toml` locally) so the contact page sends a matching `X-Membership-Secret` header.
2. Run `npm run functions:dev`. This builds the site once and serves it from `public/` via `wrangler pages dev`, with `functions/` running locally — no Cloudflare account or deploy required.
3. Visit the printed local URL (defaults to `http://127.0.0.1:8788`) and submit the contact form with "New membership" selected.

This is local-only: it doesn't touch the Cloudflare Pages dashboard config, doesn't deploy anything, and `.dev.vars` never leaves your machine.
