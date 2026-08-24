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
- `HUGO_PARAMS_cloudflareAnalyticsToken`
- `RESEND_API_KEY`
- `MEMBERSHIP_FROM_EMAIL` (optional, defaults to `CSA Calgary <hello@csacalgary.org>`)

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

### Local Testing

Pages Functions don't run under plain `hugo server` — use Wrangler's local emulator instead:

1. Copy `.dev.vars.example` to `.dev.vars` and fill in a real `RESEND_API_KEY` (this file is gitignored and never committed).
2. Run `npm run functions:dev`. This builds the site once and serves it from `public/` via `wrangler pages dev`, with `functions/` running locally — no Cloudflare account or deploy required.
3. Visit the printed local URL (defaults to `http://127.0.0.1:8788`) and submit the contact form with "New membership" selected.

This is local-only: it doesn't touch the Cloudflare Pages dashboard config, doesn't deploy anything, and `.dev.vars` never leaves your machine.
