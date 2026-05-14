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
- `HUGO_PARAMS_web3formsKey`
- `HUGO_PARAMS_cloudflareAnalyticsToken`

## CMS

CMS files:

- `static/admin/index.html`
- `static/admin/config.yml`
- `functions/auth.js`
- `functions/callback.js`

Decap CMS is pinned in `static/admin/index.html`. Event fields in `static/admin/config.yml` should stay aligned with the event template fields used by `layouts/events/single.html`.
