# CSA Calgary Chapter Website

Hugo + Tailwind CSS static site for the Cloud Security Alliance Calgary Chapter.

## Local Development

```bash
npm install
npm run dev
```

Open the local Hugo URL printed in the terminal, usually `http://localhost:1313/`.

## Production Build

```bash
npm run build
```

Cloudflare Pages settings:

- Build command: `npm ci && npm run build`
- Build output directory: `public`
- Environment variable: `HUGO_VERSION=0.161.1` or the Cloudflare-supported Hugo extended version you choose

## Required Manual Configuration

- Replace `your-org/csa-calgary` in `static/admin/config.yml` with the final GitHub repo.
- Configure Decap CMS authentication for GitHub before `/admin/` can publish changes.
- Add the real chapter email, social links, Formspree endpoint, sponsor logos, board bios, and approved photography.
