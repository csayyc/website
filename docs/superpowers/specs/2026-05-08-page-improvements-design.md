# Page Improvements Design Spec
Date: 2026-05-08
Status: Approved — ready for implementation

## Summary

Improve three pages (Get Involved, Sponsors, Resources) based on a UI/UX review. Design decisions were confirmed by the user via visual companion.

---

## Design Decisions (User Confirmed)

### Sponsors page — Tier A (subtle accent)
- Platinum card: orange border (`border-orange/40`), "Featured" badge (orange pill, top-right)
- Gold + Silver: standard cards, unchanged styling
- All three remain equal-width in a 3-col grid
- Add bullet benefit lists inside each card (3–4 items)
- Add "Why sponsor?" blurb section above the cards

### Get Involved page — CTA Option A (tiered with descriptions)
- Sidebar card gets a redesigned link list:
  - **Primary**: "Attend an event" — orange background button with sub-description "No commitment — just show up and learn"
  - **Secondary (3)**: grey surface cards (`bg-surface`) with title + one-line description each:
    - Volunteer: "Help run events and shape programming"
    - Propose a talk: "Share your cloud security expertise"
    - Sponsor: "Support accessible security education"
- Hero pills (Volunteer / Speak / Sponsor) become anchor links to `#volunteer`, `#speak`, `#sponsor` sections
- Add a stat bar in the hero: "150+ members · Events since 2024" (approximate, can be adjusted)
- Prose bullet list → 3 role sections with anchor IDs matching the hero pills

### Resources page
- Replace 4-link bullet list with resource cards (grid, 2-col on md+)
- Each card: category chip, title, 1-sentence description, external link arrow
- Category chips: "Certification", "Framework", "Guidance", "Research"
- "Coming Next" block: move below grid, full-width, restyled as a mailing list teaser pointing to `/contact/`
- Hero: keep as-is (no image needed, page is a library not a landing)

### Cross-cutting fixes (all pages)
- Hover state on existing cards: strengthen — add `hover:shadow-[0_28px_70px_-32px_rgba(30,76,115,0.35)]` alongside existing translate
- Add cross-links between pages:
  - Get Involved sidebar → link to `/sponsors/` from "Sponsor programming" CTA
  - Sponsors page → link to `/get-involved/` in the "Why sponsor?" intro copy
  - Resources page → link to `/events/` from "Coming Next" teaser

---

## File Map

| File | Change |
|---|---|
| `layouts/sponsors/list.html` | Platinum card accent + Featured badge; add benefits list; add Why Sponsor section |
| `layouts/get-involved/list.html` | Redesign sidebar CTAs (tiered); hero pill anchor links; add stat bar; restructure prose sections |
| `layouts/resources/list.html` | Replace prose article with resource card grid; move Coming Next below grid full-width |
| `content/resources/_index.md` | Keep links, add category and description frontmatter per link (or restructure as data file) |
| `data/sponsors.yaml` | Add `benefits` list field to each tier (3–4 bullet strings) |

---

## Implementation Tasks (in order)

### 1. Update `data/sponsors.yaml` — add benefits
Add a `benefits` list to each tier. Example:
```yaml
- name: "Platinum Partner Opportunity"
  tier: "Platinum"
  description: "Annual strategic support for chapter programming, venue access, and community development."
  url: "/contact/#contact-form"
  benefits:
    - "Logo on all event materials and website"
    - "Annual chapter naming recognition"
    - "Speaking slot at each event"
    - "Newsletter and social mentions"
- name: "Gold Partner Opportunity"
  tier: "Gold"
  description: "Support a focused event series, keynote session, or practical cloud security workshop."
  url: "/contact/#contact-form"
  benefits:
    - "Logo on event series materials"
    - "One speaking slot per sponsored event"
    - "Social media recognition"
- name: "Silver Partner Opportunity"
  tier: "Silver"
  description: "Help make individual meetups accessible with refreshments, logistics, or student support."
  url: "/contact/#contact-form"
  benefits:
    - "Logo placement at sponsored event"
    - "Verbal recognition at event"
```

### 2. Update `layouts/sponsors/list.html`
- Add "Why Sponsor CSA Calgary?" section above cards with 2–3 benefit callouts
- In the card loop: detect `{{ if eq .tier "Platinum" }}` to apply featured styling:
  - Outer card class: add `border-orange/40 shadow-[0_28px_70px_-32px_rgba(242,125,66,0.45)]`
  - Add "Featured" badge: `<span class="...">Featured</span>` absolutely positioned top-right
- Render `benefits` list inside each card as a `<ul>` with checkmark bullets
- Change briefcase icon for Platinum to a star icon

### 3. Update `layouts/get-involved/list.html`
- Hero pills: change `<span>` to `<a href="#volunteer">`, `<a href="#speak">`, `<a href="#sponsor">`
- Add stat bar below pills: `<p class="mt-6 text-sm text-white/50">150+ members &middot; Events since 2024</p>`
- Sidebar CTAs: replace 4 flat `<a>` links with:
  - One orange primary CTA (Attend) with sub-description text
  - Three `bg-surface` secondary cards with sub-description text
- Main content: add `id="volunteer"`, `id="speak"`, `id="sponsor"` anchors around the prose or alongside it

### 4. Update `layouts/resources/list.html` and `content/resources/_index.md`
- Change layout to single-column: resource cards grid on top, Coming Next full-width below
- Replace `<article class="prose ...">{{ .Content }}</article>` with a Hugo range over a new data structure
- Option A (simplest): define resources as a data file `data/resources.yaml` with fields: `title`, `url`, `category`, `description`
- Option B: keep links in markdown content but add a custom shortcode for resource cards
- Recommendation: **use data file** (Option A) — keeps layout clean and content editable
- Coming Next block: full-width card with CTA to `/contact/` — "Want to know when archives go live? Get in touch."

### 5. Create `data/resources.yaml`
```yaml
- title: "Cloud Security Alliance"
  url: "https://cloudsecurityalliance.org/"
  category: "Organisation"
  description: "The global nonprofit driving cloud security standards and best practices."
- title: "CSA Security Guidance"
  url: "https://cloudsecurityalliance.org/research/guidance"
  category: "Guidance"
  description: "Comprehensive guidance for securing cloud environments across 14 domains."
- title: "CCSK Certificate"
  url: "https://cloudsecurityalliance.org/education/ccsk"
  category: "Certification"
  description: "Vendor-neutral cloud security certification recognised globally."
- title: "Cloud Controls Matrix"
  url: "https://cloudsecurityalliance.org/research/cloud-controls-matrix"
  category: "Framework"
  description: "Security control framework specifically designed for cloud computing."
```

---

## Design Tokens / Classes to Use

These are already defined in `tailwind.config.js` and existing layouts:

| Token | Value |
|---|---|
| `navy` | `#1E4C73` |
| `orange` | `#F27D42` |
| `surface` | `#EDF3F8` |
| `csa-slate` | `#4A5568` |
| `shadow-premium` | `0 24px 60px -32px rgba(30, 76, 115, 0.42)` |
| `eyebrow` class | small uppercase orange label — already defined |
| `card` class | white rounded-2xl border shadow — already defined |
| `container-premium` | max-width container — already defined |
| `section` class | vertical padding section wrapper — already defined |

## Existing Patterns to Follow

- Icon partial: `{{ partial "icon.html" (dict "name" "ICON_NAME" "class" "h-6 w-6") }}`
- Available icons used elsewhere: `briefcase`, `calendar`, `users` — check `layouts/partials/icon.html` for full list
- Hugo data access: `{{ range hugo.Data.sponsors }}` — same pattern works for `resources`
- Tier comparison in templates: `{{ if eq .tier "Platinum" }}`

---

## Out of Scope

- Navigation/header changes
- Mobile menu changes
- Contact page changes
- Any new pages
- Animation/motion (beyond existing hover transitions already on cards)
