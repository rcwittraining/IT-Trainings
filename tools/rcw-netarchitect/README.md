# RCW - NetArchitect — install guide

A free, browser-only HLD / LLD diagram studio for **www.rcwittraining.in**.
No backend, no accounts, no build step. Everything runs in the visitor's browser.

## 1. Upload (additive — nothing existing is touched)

Copy this whole folder into your GitHub Pages repository as:

```
tools/rcw-netarchitect/
├── index.html
├── styles.css
├── shapes.js
├── templates.js
├── app-core.js
├── app-editor.js
├── app-io.js
├── favicon.svg
└── og-image.png
```

Nothing else on the site needs to change. `index.html` already loads your
existing consent layer first (`../../rcw-consent.js`), exactly like
`tools/rcw-nixdetect/` does, so GA4 / AdSense consent behaviour is identical
to the rest of the site.

The app will be live at: **https://www.rcwittraining.in/tools/rcw-netarchitect/**

## 2. Add it to the catalogue (append one entry — do NOT replace the file)

Open `catalogue-data.js` and add this object anywhere inside the
`window.RCW_CATALOGUE = Object.freeze([ ... ])` array (e.g. after the
`rcw-nixdetect` entry). Keep the trailing comma rules valid:

```js
  {
    title: "RCW - NetArchitect",
    category: "HLD & LLD network, cloud and software-architecture diagram studio",
    badge: "HLD",
    accent: "#078be8",
    id: "rcw-netarchitect",
    targetUrl: "https://www.rcwittraining.in/tools/rcw-netarchitect/",
    contentType: "Tool",
    technology: "IT Architecture",
    subcategory: "Design & Documentation",
    group: "Tools"
  },
```

## 3. Optional

* `sitemap.xml` — add `<url><loc>https://www.rcwittraining.in/tools/rcw-netarchitect/</loc></url>`
  so Google indexes it faster (purely optional; robots.txt already allows it).
* `og-image.png` is the social-share preview referenced by the page's meta tags.

## What users get

* **9 starter templates** — Campus HLD, Hybrid cloud HLD, 3-tier web HLD, Security
  zones HLD, C4 container view, Branch office LLD, DC rack elevation LLD, blank HLD / LLD.
* **163 stencils** — network, security, cloud (generic AWS/Azure/GCP style), compute &
  storage, software/C4, zones & containers, LLD items (rack, patch panel, PDU, tables),
  flowchart/basic shapes, text, notes, images.
* **Visio-style editing** — click or drag to place, smart orthogonal / straight / curved
  connectors with fan-out, port labels, waypoints, containers that carry children,
  snap-to-grid, align/distribute, z-order, group duplicate, lock/hide, multi-page docs,
  undo/redo, keyboard shortcuts, right-click menu, properties panel, LLD attributes,
  auto legend, title block, revision table, data tables.
* **Design checks** — title block / legend present, default or duplicate labels, orphaned
  shapes, LLD port / IP completeness, Internet-without-firewall, direct Internet → datastore,
  WCAG contrast, tiny fonts, off-page shapes.
* **Export / download** — PNG (1×–4×, transparent option), SVG (with metadata), JPG,
  PDF (via print dialog, all pages), JSON project file (`.rcwna.json`, re-openable),
  CSV inventory + connection list. Work is auto-saved in the browser (localStorage).
* Fully client-side: nothing is uploaded anywhere.

## Privacy / compliance notes

* No cookies or tracking are set by the tool itself; only your existing consent layer.
* Files opened by users are validated against a strict schema (labels are text-only,
  colours are checked, links must be http(s)) so a malicious JSON file cannot inject scripts.
* Meta CSP restricts scripts to your own origin plus Google tag / AdSense domains.
