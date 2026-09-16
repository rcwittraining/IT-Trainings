# Job Match & Apply Kit — `/job-matcher/`

A static, dependency-free tool that finds listings matching a resume, explains every
score, and assembles a send-ready application packet per job. Published at
<https://www.rcwittraining.in/job-matcher/>.

```
job-matcher/
├── index.html            UI shell, SEO metadata, JSON-LD; no AdSense loader (nested pages are excluded)
├── styles.css            self-contained styles, follows the site palette; print stylesheet for the letter
├── app.js                state, rendering, event wiring — the only file that touches the DOM
├── lib/
│   ├── text.js           normalisation, tokenising, dates, hash/dedupe helpers
│   ├── skills.js         skill + certification + role-family taxonomy, detection, region mapping
│   ├── resume.js         PDF / DOCX / RTF / TXT / paste extraction + profile parsing + ATS review
│   ├── matcher.js        scoring engine, gates, dedupe, ranking
│   ├── feeds.js          job-source adapters, fetch orchestration, listing import
│   ├── packets.js        cover letters, form answers, autofill sheet, CSV/JSON export
│   └── store.js          localStorage persistence (profile, targets, cache, packets, tracker)
└── data/
    ├── seed-profile.js   "founder draft" profile assembled from this site's public pages
    └── sample-jobs.js    synthetic listings so the tool is demonstrable offline
```

Every `lib/*.js` file is a UMD-style module: loaded by `<script>` in the browser and
`require()`d by the Node tests. No bundler, no build step, no CDN, no analytics, no
`package.json` — consistent with the rest of this repository.

## What it does

1. **Resume → profile.** `lib/resume.js` reads a file locally and extracts contact block,
   name, headline, years (explicit statement, else derived from the earliest date range),
   sections, employment lines, quantified achievements, certifications, education, plus a
   skills map with mention counts and evidence sentences. It also returns an **ATS readiness
   review** (12 transparent checks) so the CV can be fixed before it is sent anywhere.
2. **Targets.** Role families, search phrases, must-have skills, regions, work mode, listing
   age, score floor, salary floor, exclusion words, letter tone. Everything is saved and the
   whole board re-scores on change — filters are cheap, so they stay live.
3. **Find.** Public APIs only, fetched from the visitor's browser, three at a time, 15 s
   timeout, per-source status chips. Results are de-duplicated by apply URL and by
   title+company+location, cached, and re-sorted.
4. **Score.** `lib/matcher.js` sums six bands (skills 45, role/level 18, experience 12,
   location 10, credentials 8, freshness/completeness 7), then applies a **requirement gate**.
   Each band returns a sentence, which the "Why this score" panel prints verbatim.
5. **Packets.** Per job: cover letter in the chosen tone (built only from sentences and skills
   found in the resume), a draft answer for the questions ATS forms actually ask, a
   field-by-field autofill sheet, the keywords this posting uses that should also appear in the
   CV, and a gap plan that links to the free lab on this site for that skill.
   `Prepare packets for all` runs the queue (25 per run, yielding between jobs so the tab
   never locks).
6. **Track.** Statuses from `new` to `offer`, with a change history, notes, and CSV/JSON export.
   The whole workspace (profile, targets, packets, tracker) exports as one JSON file.

## What it deliberately does not do

| Not done | Why |
| --- | --- |
| Logging into Naukri / LinkedIn / Indeed / company portals, or submitting forms there | Those platforms prohibit automated access in their terms; accounts get restricted for it. A static GitHub Pages site also has no server that could hold such a session — and it must not. |
| Sending an application without a human | Mass-applying with an unreviewed template is how candidates get filtered at the screening call, and an auto-filled claim the applicant cannot defend is a misrepresentation risk. The tool prepares everything and stops at the click. |
| Inventing employers, dates, degrees, salaries, certifications | Anything not present in the resume is emitted as a `[FILL]` marker, counted in the UI, and the packet never reports "complete" while markers remain. |
| Scraping login-walled or robots-disallowed pages | Only documented public APIs. Source etiquette is enforced in code (see below). |
| Uploading or logging anything | No backend exists. Parsing, scoring, packets and storage all run in the tab; `tests/job-matcher.test.js` asserts there is no password field, no cookie write, no analytics, no ad loader. |

## Sources and their etiquette

| Source | Auth | Notes |
| --- | --- | --- |
| `remotive` | none | Their API terms ask for a link back to each listing, attribution of the source, **and at most a few fetches a day**. Enforced: 6 h politeness floor (even on "force refresh"), per-job attribution, and the employer/remotive URL kept on the card. |
| `arbeitnow` | none | Direct-from-ATS listings (Greenhouse, SmartRecruiters, Teamtailor…), CORS enabled. |
| `greenhouse` / `lever` / `smartrecruiters` | none | The employers' own public board APIs, fanned out per company slug. Cleanest listings and real apply links. |
| `remoteok`, `muse`, `hnhiring` | none | Optional; `hnhiring` (Algolia comment search) is noisy by nature and off by default. |
| `adzuna`, `jsearch` | **user key** | Off unless a key is entered. Keys live in `localStorage`, are sent only to that API, and there is a delete button. JSearch is the route into Google-Jobs-style aggregators (LinkedIn/Indeed coverage) *through a documented API with its own terms* — not by scraping. |
| import | none | Paste or upload JSON/CSV/text listings for anything the APIs cannot reach, e.g. a portal export. |

Cache: `rcwjm.v1.cache` holds up to 400 listings per source, TTL 6 h, pruned after 14 days.
Auto-refresh is opt-in, runs only while the tab is open, and respects each source's floor.

## Score model, in one paragraph

Skills are the gate, not one voice among six. A listing is scored on weighted overlap between
the resume's skill map and the posting's requirement list (weighted by where the skill appears:
tag > "required" text > prose; a skill the candidate mentions 12× outranks one mentioned once),
then trimmed by role family and seniority, experience band, region/remote intent, credentials and
freshness. If nothing in the posting overlaps — or the title is outside the infrastructure/cloud/ops
domain this taxonomy serves — the non-skill bands are discounted by up to 50 %, because
"remote, well paid, posted an hour ago" is not a fit. Missing must-haves either block the listing
or cost 9 points each when blocking is switched off; a job is never "quietly" a bad match.

## Tests

```bash
node tests/job-matcher.test.js        # 62 logic checks: extraction, scoring order, dedupe,
                                      # packet honesty, import parsing, data + link integrity
node tests/job-matcher-dom.test.js    # 13 DOM checks (needs jsdom; skips itself without it)
python3 tests/adsense_audit.py       # site-wide publishing boundaries
```

`job-matcher.test.js` includes checks worth keeping when you edit this tool:

- every `lab` path in `lib/skills.js` must exist in the repo (no dead "close this gap" links);
- the sample listings must produce a real score spread, not a wall of 90 %;
- a packet built from an empty profile must be full of `[FILL]` markers and free of flattery;
- no source adapter may point at a login-walled portal or a credential endpoint;
- every id `app.js` looks up must exist in `index.html`, and no id may be duplicated.

## Extending

* **New source:** add an object to `SOURCES` in `lib/feeds.js` with `label`, `about`,
  `build(params, company, keys)`, `parse(json, params, company)` and optional
  `needsKey` / `requiredKeys` / `minIntervalMinutes` / `attribution`. It appears in step 6
  automatically. Emit only listings whose `applyUrl` belongs to the source or employer.
* **New skill:** add one row to `RAW` in `lib/skills.js` — `[canonical, category, weight, [aliases], {lab}]`.
  Keep aliases specific: bare `architecture` once matched "component architecture" and turned a
  React posting into a 45/45 skills score. Weights are 1–3; `lab` must be a real path in this repo.
* **Self-hosted proxy** for a source that forbids browser calls: point `build()` at your own
  same-origin path and keep credentials server-side. Do not paste secrets into this repo.

## Privacy notes for the site policy

No cookies set by this tool (the site-wide Google consent banner is separate and is covered by `privacy.html`), no analytics, no ad units, no server. `localStorage` keys are all
under `rcwjm.v1.*` and the page ships a "delete everything" control. The resume text never leaves
the device, which is also why the tool cannot offer a "we'll apply for you" service — by design.
