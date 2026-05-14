# Contributing Guide

This guide is for contributors editing the CSA Calgary website through Git, pull requests, or direct repository changes.

For non-technical content editing, see [INTERNAL_CONTRIBUTION.md](INTERNAL_CONTRIBUTION.md). For setup, build, deployment, and CMS internals, see [TECHNICAL.md](TECHNICAL.md).

## Local Workflow

```bash
npm install
npm run dev
npm run build
```

Use focused branches such as `add-july-workshop`, `update-board-profiles`, or `refresh-resources`.

## Common Edit Locations

| Change | Where |
| --- | --- |
| Events | `content/events/*.md` |
| Home page | `content/_index.md` |
| About | `content/about/_index.md` |
| Get Involved | `content/get-involved/_index.md` |
| Contact | `content/contact/_index.md` |
| Board members | `data/board.yaml` |
| Sponsors | `data/sponsors.yaml` |
| Resources | `data/resources.yaml` |
| Navigation/global links | `hugo.toml` |
| Layouts | `layouts/` |
| Styles | `assets/css/main.css` |

## Event Updates

Create events with:

```bash
hugo new events/2026-07-event-name.md
```

Set `draft: false` only when ready to publish. Confirm date, time, timezone, venue, RSVP link, LinkedIn link, sponsor references, and speaker approvals.

## Standards

- Keep copy practical, professional, community-first, and vendor-neutral.
- Use descriptive links, not "click here".
- Use approved public images only.
- Keep YAML indentation consistent.
- Run `npm run build` before merge.

## Review Checklist

- Content is accurate and approved.
- Links work.
- Images load.
- Mobile layout is acceptable.
- No private details or unapproved sponsor/speaker claims are published.
- Generated `public/` output is not committed unless intentionally required.
