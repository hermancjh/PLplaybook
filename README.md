# PL Playbook Portal — Responsive HTML Prototype

A framework-free prototype (HTML + CSS + vanilla JS) of the website blueprint
designed in the preceding analysis, now extended with the 10 flagship
features recommended for a national resource. Content shown is
**representative**, not the verbatim playbook text. The original playbook
remains the single source of truth.

## What's in this folder

```
index.html        Homepage — hero, role-aware greeting, cycle nudge,
                   search, 3 pathway doors, featured resources, journeys
role.html         Pathway hub — Role / Challenge / Stage switcher,
                   all 14 pathways fully populated
topic.html        Topic index (A–Z) + one fully built Topic Detail (ToLP)
journey.html      Learning Journey detail — 4-step sequence with a live
                   progress dial, linked to the diagnostic tool
content.html      Content Detail page — the 5-level engagement ladder,
                   cycle nudge, and notes-enabled templates
diagnostic.html   NEW — school-context comparison against Lion Secondary
search.html       Search results + role-aware Download Centre
assets/css/styles.css   The full design system, in 21 labelled sections
assets/js/main.js       13 small vanilla-JS modules, no dependencies
```

Open `index.html` directly in a browser — every link is a relative path.

## The 10 flagship features, and where to find each one

| # | Feature | Where it lives | Module |
|---|---|---|---|
| 1 | Multi-pathway entry (no mandated route) | `role.html` — Role / Challenge / Stage switcher | `ModeSwitchModule` |
| 2 | Five-level depth ladder with time estimates | `content.html` | `TabsModule` |
| 3 | Persistent "your school's notes" on templates | ToLP cards on `content.html`, `search.html`, `index.html` | `NotesModule` |
| 4 | Alias-aware search | Search bar on every page | `SearchModule` |
| 5 | Cross-linked topic pages | `topic.html` → "Where this appears" | manual + tag system |
| 6 | Role-bundled downloads | "I am a…" picker (header, every page) + Download Centre | `RolePickerModule` |
| 7 | School-context diagnostic | `diagnostic.html` | `DiagnosticModule` |
| 8 | Facilitation guides as a distinct type | `content.html` Level 5, `search.html` Format facet | tagged in `searchIndex` |
| 9 | Cycle-aware review nudge | Banner on `index.html` and `content.html` | `CycleNudgeModule` |
| 10 | Section-anchored "Ask PDPO" channel | Floating button, every page | `AskPdpoModule` |

## Design system, in brief

- **Palette**: deep petrol/teal (`--primary`) + warm amber (`--accent`) on a
  cool sage-paper background.
- **Type**: Fraunces (display) + IBM Plex Sans (body/UI) + IBM Plex Mono
  (metadata — Part numbers, time estimates, tags).
- **Signature motif**: a small arc/ring — the 5-level indicator and the
  hero's ambient shape — drawn from the one true structural fact about this
  content: it's a recurring Plan→Implement→Review cycle, not a document.

## Why these 10 and not others

Each flagship feature was filtered against one test before being built:
*does this change what someone decides or does in their school, or does it
just make the resource feel more "interactive"?* Gamification, a
general-purpose chatbot, social-style sharing, and vanity analytics were all
considered and rejected on that test — see the original feature brief for
the full reasoning. The diagnostic tool (#7) in particular is built to
produce a short written comparison, deliberately not a score or badge, to
keep it a decision-support tool rather than a quiz.

## Accessibility decisions baked in

- Skip-to-content link, semantic landmarks, one `h1` per page.
- Visible focus ring (`:focus-visible`) on every interactive element.
- Tabs, accordions, and the new modal/role-menu follow WAI-ARIA Authoring
  Practices patterns (keyboard support, `aria-expanded`, `aria-haspopup`,
  `aria-modal`, Escape-to-close).
- `prefers-reduced-motion` respected throughout, including the new modal.
- All icon-only and floating-action buttons carry `aria-label`.

## State & persistence — read this before integrating

All "memory" in this prototype — selected role, visited cards, journey
progress, and **the new notes/diagnostic/Ask-PDPO submissions** — lives in
`PORTAL.state`, in memory, reset on reload. That's deliberate for a portable
static prototype. Each new module is commented at its definition in
`assets/js/main.js` with exactly what to replace when you wire in a real
backend:

- **RolePickerModule** → persist `PORTAL.state.role` per user (cookie,
  account, or SSO claim) instead of in-memory.
- **NotesModule** → replace `PORTAL.state.notes[id]` writes with a real save
  call (SharePoint list item, WP user meta, a small database row) keyed by
  user + template id.
- **CycleNudgeModule** → replace the `<select>` simulator with a real read
  of the school's term calendar (a REST call or platform calendar API).
- **AskPdpoModule** → replace the `ToastModule.show(...)` stub in the form
  submit handler with an actual POST to your ticketing system or a
  transactional email send, keeping the `currentContext()` section reference
  attached to the payload.
- **DiagnosticModule** → the comparison logic is plain JS string-building;
  no backend is required unless you want to log aggregate responses for
  PDPO's own visibility into common starting profiles across the NLC.

## Porting this into each target platform

**SharePoint (SPFx / Modern pages)**
Split each page's body into Script Editor / Embed web parts, or wrap the
whole thing as an SPFx web part. Move `PORTAL.state` to a SharePoint list
(one item per user) via the SPFx context and the REST API — this is where
notes, role, and diagnostic responses should land for real persistence.

**WordPress**
Convert each `.html` file into a page template. Enqueue `styles.css` via
`wp_enqueue_style`. Replace `PORTAL.searchIndex` with a WP REST API search
endpoint, and persist notes/role to user meta (`update_user_meta`).

**Webflow**
Recreate the CSS custom properties as Webflow variables and rebuild each
component as a Symbol. The JS modules can be pasted into Webflow's
page-level custom code largely as-is; swap `PORTAL.state` for Webflow's CMS
plus a member/identity tool if persistent per-user data is needed.

**Google Sites**
Use the "Embed" element to frame a hosted copy of these files (e.g. GitHub
Pages) rather than rebuilding natively — the new JS-driven features
(role picker, modal, nudge) need real script execution that the Sites
editor itself won't allow.

## What's deliberately mocked, not built

- **Search** runs against the in-page `PORTAL.searchIndex` array.
- **Downloads** and **the Ask-PDPO submission** show a toast instead of a
  real file/ticket — both have a single clearly-marked line to replace.
- **The cycle nudge** uses a manual term/week selector standing in for a
  real calendar read.
- **Infographics** in `content.html` Level 1 are simple inline SVGs standing
  in for the fuller diagrams recommended earlier.

