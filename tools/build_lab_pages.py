#!/usr/bin/env python3
"""
build_lab_pages.py  —  RCW IT Training
=======================================
Pre-renders a crawlable, human-readable STUDY GUIDE into every JavaScript-only
lab page so that Google (AdSense reviewers + Googlebot) sees real content instead
of an empty <div id="labRoot"></div>.

Works with BOTH lab engines used on the site:
  1.  window.RCW_LAB = {...}              (lab-engine.js pages, e.g. /docker-compose/)
  2.  window.RCW_RHCSA_PRACTICE = {...}   (rhcsa-practice/*/config.js pages)

For every lab it writes:
  * <title> kept, plus a UNIQUE <meta name="description">, <link rel="canonical">,
    Open Graph tags and a LearningResource JSON-LD block
  * a static <article class="rcw-guide"> ABOVE #labRoot containing
        - H1, category eyebrow, lead paragraph, difficulty / time / objectives
        - the hand-written guide from  content/<lab-id>.md  (if present)
        - "What you will practise" (objectives from the config)
        - "Commands used in this lab" (from the config hints / workflow)
        - "Files present on the lab host" (from the config)
        - a "Start the interactive lab" button
  * <link rel="stylesheet" href="/lab-guide.css">  (self-hosted, CSP-safe)
  * OPTIONAL  <meta name="robots" content="noindex">  when there is NO hand-written
    guide yet (so thin pages stay out of the index until they are finished).
    Turn that behaviour off with  --index-all  once you are happy.

USAGE  (run from the ROOT of your GitHub Pages repository):

    python3 tools/build_lab_pages.py --dry-run          # report only
    python3 tools/build_lab_pages.py                    # write changes
    python3 tools/build_lab_pages.py --index-all        # never add noindex
    python3 tools/build_lab_pages.py --only docker-compose user-management

The script is idempotent: it replaces its own previous output (marked with
<!-- rcw-guide:start --> ... <!-- rcw-guide:end -->) on every run.

Zero dependencies (standard library only).  Python 3.8+.
"""
from __future__ import annotations

import argparse
import html
import json
import os
import re
import sys
from datetime import date
from pathlib import Path

SITE = "https://www.rcwittraining.in"
AUTHOR = "Pradeep Raju"
MARK_START = "<!-- rcw-guide:start -->"
MARK_END = "<!-- rcw-guide:end -->"
MIN_WORDS_FOR_INDEX = 450     # pages under this stay noindex unless --index-all


# ----------------------------------------------------------------------------
# tiny Markdown -> HTML converter (headings, paragraphs, lists, code, inline)
# ----------------------------------------------------------------------------
def md_to_html(md: str) -> str:
    out: list[str] = []
    lines = md.splitlines()
    i = 0
    in_ul = in_ol = False

    def close_lists():
        nonlocal in_ul, in_ol
        if in_ul:
            out.append("</ul>"); in_ul = False
        if in_ol:
            out.append("</ol>"); in_ol = False

    def inline(s: str) -> str:
        s = html.escape(s, quote=False)
        s = re.sub(r"`([^`]+)`", r"<code>\1</code>", s)
        s = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", s)
        s = re.sub(r"(?<!\*)\*([^*]+)\*(?!\*)", r"<em>\1</em>", s)
        s = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r'<a href="\2">\1</a>', s)
        return s

    while i < len(lines):
        ln = lines[i]
        if ln.strip().startswith("```"):
            close_lists()
            lang = ln.strip()[3:].strip()
            buf = []
            i += 1
            while i < len(lines) and not lines[i].strip().startswith("```"):
                buf.append(lines[i]); i += 1
            cls = f' class="language-{html.escape(lang)}"' if lang else ""
            out.append(f"<pre><code{cls}>{html.escape(chr(10).join(buf))}</code></pre>")
            i += 1
            continue
        m = re.match(r"^(#{1,6})\s+(.*)$", ln)
        if m:
            close_lists()
            lvl = min(len(m.group(1)) + 1, 6)          # '#' in md -> h2 (h1 is the lab title)
            out.append(f"<h{lvl}>{inline(m.group(2).strip())}</h{lvl}>")
            i += 1; continue
        m = re.match(r"^\s*[-*]\s+(.*)$", ln)
        if m:
            if in_ol: out.append("</ol>"); in_ol = False
            if not in_ul: out.append("<ul>"); in_ul = True
            out.append(f"<li>{inline(m.group(1))}</li>")
            i += 1; continue
        m = re.match(r"^\s*\d+[.)]\s+(.*)$", ln)
        if m:
            if in_ul: out.append("</ul>"); in_ul = False
            if not in_ol: out.append("<ol>"); in_ol = True
            out.append(f"<li>{inline(m.group(1))}</li>")
            i += 1; continue
        if ln.strip().startswith(">"):
            close_lists()
            out.append(f"<blockquote>{inline(ln.strip()[1:].strip())}</blockquote>")
            i += 1; continue
        if not ln.strip():
            close_lists(); i += 1; continue
        # paragraph: gather until blank line
        close_lists()
        buf = [ln.strip()]
        i += 1
        while i < len(lines) and lines[i].strip() and not re.match(r"^(#{1,6}\s|\s*[-*]\s|\s*\d+[.)]\s|```|>)", lines[i]):
            buf.append(lines[i].strip()); i += 1
        out.append(f"<p>{inline(' '.join(buf))}</p>")
    close_lists()
    return "\n".join(out)


def word_count(s: str) -> int:
    return len(re.findall(r"\w+", re.sub(r"<[^>]+>", " ", s)))


def esc(s) -> str:
    return html.escape(str(s or ""), quote=True)


# ----------------------------------------------------------------------------
# config discovery
# ----------------------------------------------------------------------------
def _balanced_object(text: str, start: int) -> str | None:
    """Return the {...} object starting at text[start], honouring JSON strings
    (so braces inside strings such as "for i in {1..3}; do" do not end the scan)."""
    depth = 0
    in_str = False
    esc_next = False
    for i in range(start, len(text)):
        ch = text[i]
        if in_str:
            if esc_next:
                esc_next = False
            elif ch == "\\":
                esc_next = True
            elif ch == '"':
                in_str = False
            continue
        if ch == '"':
            in_str = True
        elif ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return text[start:i + 1]
    return None


def load_js_object(text: str, varname: str):
    """Extract `window.VAR = {...};` (optionally wrapped in Object.freeze) as JSON."""
    m = re.search(rf"window\.{varname}\s*=\s*(?:Object\.freeze\()?\s*\{{", text)
    if not m:
        return None
    raw = _balanced_object(text, m.end() - 1)
    if raw is None:
        return None
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        raw2 = re.sub(r",(\s*[}\]])", r"\1", raw)  # tolerate trailing commas
        try:
            return json.loads(raw2)
        except json.JSONDecodeError:
            return None


def discover(root: Path):
    """Yield (index_html_path, url_path, kind, config)"""
    for p in sorted(root.rglob("index.html")):
        rel = p.relative_to(root)
        parts = rel.parts
        if any(seg in ("node_modules", ".git", "drafts", "admin", "admin-restricted-tools", "downloads") for seg in parts):
            continue
        txt = p.read_text(encoding="utf-8", errors="ignore")
        cfg = load_js_object(txt, "RCW_LAB")
        if cfg:
            yield p, "/" + "/".join(parts[:-1]) + "/", "lab", cfg
            continue
        if "RCW_RHCSA_PRACTICE" in txt or (p.parent / "config.js").exists():
            cj = p.parent / "config.js"
            if cj.exists():
                cfg = load_js_object(cj.read_text(encoding="utf-8", errors="ignore"), "RCW_RHCSA_PRACTICE")
                if cfg:
                    yield p, "/" + "/".join(parts[:-1]) + "/", "rhcsa", cfg


# ----------------------------------------------------------------------------
# normalise both config styles into one shape
# ----------------------------------------------------------------------------
def normalise(kind: str, cfg: dict, url_path: str) -> dict:
    if kind == "lab":
        objectives = [(o.get("name", ""), o.get("desc", ""), o.get("points")) for o in cfg.get("objectives", [])]
        commands = list(cfg.get("hint", []))
        lead = cfg.get("lead") or " ".join(cfg.get("intro", [])) or cfg.get("briefCopy", "")
        return dict(
            id=cfg.get("id") or url_path.strip("/").split("/")[-1],
            title=cfg.get("headline") or cfg.get("title", ""),
            category=cfg.get("category", "Hands-on lab"),
            difficulty=(cfg.get("difficulty") or "").title(),
            minutes=cfg.get("minutes", 10),
            host=cfg.get("host", ""),
            user=cfg.get("user", ""),
            lead=lead,
            objectives=objectives,
            commands=commands,
            files=cfg.get("files", {}) or {},
            scenario=cfg.get("incident", ""),
            points=100,
        )
    # rhcsa practice
    actions = cfg.get("actions", [])
    objectives = [(o.get("title", ""), o.get("detail", ""), o.get("points"))
                  for o in cfg.get("objectives", [])]
    if not objectives:                       # older configs: derive from facts
        facts = cfg.get("facts", {}) or {}
        for a in actions:
            sets = a.get("sets", [])
            name = facts.get(sets[0], sets[0]) if sets else a.get("command", "")
            objectives.append((name, f"Run `{a.get('command','')}`", None))
    commands = [w.get("command") for w in cfg.get("workflow", []) if w.get("command")] or [a.get("command") for a in actions]
    return dict(
        id=cfg.get("id") or url_path.strip("/").split("/")[-1],
        title=cfg.get("title", ""),
        category=f"RHCSA Certification Practice · {cfg.get('domain','')} · {cfg.get('technology','')}",
        difficulty="RHCSA / EX200",
        minutes=cfg.get("minutes", 10),
        host="rhel10-practice",
        user="student",
        lead=cfg.get("scenario", ""),
        objectives=objectives,
        commands=commands,
        files={},
        scenario=cfg.get("scenario", ""),
        points=100,
        number=cfg.get("number"),
        total=cfg.get("total"),
        official=cfg.get("officialObjectivesUrl"),
    )


# ----------------------------------------------------------------------------
# HTML generation
# ----------------------------------------------------------------------------
def build_article(n: dict, guide_html: str, url: str) -> str:
    obj_items = "".join(
        f"<li><strong>{esc(name)}</strong>{(' — ' + esc(desc)) if desc else ''}"
        f"{f' <span class=rcw-pts>{pts} pts</span>' if pts else ''}</li>"
        for name, desc, pts in n["objectives"]
    )
    cmd_rows = "".join(f"<li><code>{esc(c)}</code></li>" for c in n["commands"])
    files_block = ""
    if n["files"]:
        items = []
        for path, body in n["files"].items():
            snippet = esc(body.strip()[:600])
            items.append(f"<li><code>{esc(path)}</code><pre><code>{snippet}</code></pre></li>")
        files_block = f"<h2>Files present on the lab host</h2><ul class=rcw-files>{''.join(items)}</ul>"

    facts = [f"<li><strong>{esc(n['difficulty'])}</strong><span>level</span></li>" if n['difficulty'] else "",
             f"<li><strong>{len(n['objectives'])}</strong><span>objectives</span></li>",
             f"<li><strong>{esc(n['minutes'])} min</strong><span>target time</span></li>",
             f"<li><strong>{n['points']}</strong><span>points + certificate</span></li>"]
    number_line = ""
    if n.get("number"):
        number_line = f"<p class=rcw-number>Task {n['number']} of {n['total']} in the RHCSA practice series. " \
                      f"Mapped to the published <a href=\"{esc(n.get('official'))}\" rel=\"nofollow noopener\">EX200 skill areas</a>.</p>"

    return f"""{MARK_START}
<article class="rcw-guide" id="guide">
  <nav class="rcw-crumbs" aria-label="Breadcrumb"><a href="/">Home</a> › <a href="/#labs">Labs</a> › <span>{esc(n['title'])}</span></nav>
  <p class="rcw-eyebrow">{esc(n['category'])}</p>
  <h1>{esc(n['title'])}</h1>
  <p class="rcw-lead">{esc(n['lead'])}</p>
  {number_line}
  <ul class="rcw-facts">{''.join(facts)}</ul>
  <p class="rcw-cta"><a class="rcw-btn" href="#labRoot">Start the interactive lab ↓</a>
     <span>Free · runs in your browser · no login</span></p>

  {guide_html}

  <h2>What you will practise</h2>
  <ol class="rcw-objectives">{obj_items}</ol>

  <h2>Commands used in this lab</h2>
  <ul class="rcw-commands">{cmd_rows}</ul>
  {files_block}

  <p class="rcw-byline">Written and maintained by <a href="/about.html">{AUTHOR}</a>, enterprise infrastructure architect.
     Found a mistake? <a href="/contact.html">Tell us</a> — corrections are published with credit.</p>
</article>
{MARK_END}"""


def build_head(n: dict, url: str, description: str, noindex: bool) -> str:
    ld = {
        "@context": "https://schema.org",
        "@type": "LearningResource",
        "name": n["title"],
        "description": description,
        "url": url,
        "learningResourceType": "Hands-on lab",
        "educationalLevel": n["difficulty"] or "Beginner",
        "timeRequired": f"PT{int(n['minutes'] or 10)}M",
        "isAccessibleForFree": True,
        "inLanguage": "en",
        "author": {"@type": "Person", "name": AUTHOR, "url": f"{SITE}/about.html"},
        "publisher": {"@type": "Organization", "name": "RCW IT Training", "url": SITE},
        "dateModified": date.today().isoformat(),
    }
    parts = [
        MARK_START,
        f'<meta name="description" content="{esc(description)}">',
        f'<link rel="canonical" href="{esc(url)}">',
        f'<meta property="og:type" content="article">',
        f'<meta property="og:title" content="{esc(n["title"])} · RCW IT Training">',
        f'<meta property="og:description" content="{esc(description)}">',
        f'<meta property="og:url" content="{esc(url)}">',
        f'<meta name="author" content="{esc(AUTHOR)}">',
        '<link rel="stylesheet" href="/lab-guide.css">',
        f'<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>',
    ]
    if noindex:
        parts.append('<meta name="robots" content="noindex,follow">')
    parts.append(MARK_END)
    return "\n  ".join(parts)


def make_description(n: dict, guide_md: str | None) -> str:
    # 1) explicit front-matter "description:" line in the md wins
    if guide_md:
        m = re.search(r"^description:\s*(.+)$", guide_md, flags=re.M)
        if m:
            return m.group(1).strip()[:158]
    base = f"{n['title']}: free hands-on {n['category'].split('•')[0].strip()} lab. {n['lead']}".strip()
    if len(base) < 90 and n["commands"]:
        base += " Practise " + ", ".join(c.split()[0] for c in n["commands"][:3]) + " in a browser terminal."
    return (base[:155] + "…") if len(base) > 158 else base


def strip_previous(txt: str) -> str:
    return re.sub(re.escape(MARK_START) + r".*?" + re.escape(MARK_END) + r"\s*", "", txt, flags=re.S)


def inject(txt: str, head_block: str, article: str) -> str:
    txt = strip_previous(txt)
    # remove any pre-existing description/canonical to avoid duplicates
    txt = re.sub(r'\s*<meta\s+name="description"[^>]*>', "", txt, flags=re.I)
    txt = re.sub(r'\s*<link\s+rel="canonical"[^>]*>', "", txt, flags=re.I)
    txt = re.sub(r"</head>", f"  {head_block}\n</head>", txt, count=1, flags=re.I)
    if 'id="labRoot"' in txt:
        txt = txt.replace('<div id="labRoot"></div>', article + '\n  <div id="labRoot"></div>', 1)
    else:
        # rhcsa-practice engine: it currently does  document.body.innerHTML = ...
        # which would wipe the article in the rendered DOM. We add a #labRoot mount
        # point after the article; patch_practice_engine() makes the engine use it.
        m = re.search(r"<body[^>]*>", txt)
        if m:
            txt = txt[:m.end()] + "\n" + article + '\n  <div id="labRoot"></div>' + txt[m.end():]
    return txt


def patch_practice_engine(root: Path, dry_run: bool) -> None:
    """One-line change so the RHCSA engine renders into #labRoot instead of
    replacing the whole <body> (which would delete the static guide)."""
    for js in root.rglob("practice-engine.js"):
        src = js.read_text(encoding="utf-8", errors="ignore")
        old = "document.body.innerHTML ="
        new = "(document.getElementById('labRoot') || document.body).innerHTML ="
        if old in src and new not in src:
            print(f"patching {js.relative_to(root)}: mount into #labRoot instead of <body>")
            if not dry_run:
                js.write_text(src.replace(old, new, 1), encoding="utf-8")


def patch_lab_engine_h1(root: Path, dry_run: bool) -> None:
    """The lab engine renders its own <h1>; demote it to <h2> so each page has one H1
    (the static guide's). Purely cosmetic for SEO; safe to skip."""
    for js in root.rglob("lab-engine.js"):
        src = js.read_text(encoding="utf-8", errors="ignore")
        old = "<h1>${C.headline || C.title}</h1>"
        new = "<h2 class=\"h1\">${C.headline || C.title}</h2>"
        if old in src:
            print(f"patching {js.relative_to(root)}: engine <h1> -> <h2>")
            if not dry_run:
                js.write_text(src.replace(old, new, 1), encoding="utf-8")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=".", help="repository root (default: cwd)")
    ap.add_argument("--content", default="content", help="folder with <lab-id>.md guides")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--index-all", action="store_true", help="never write noindex")
    ap.add_argument("--only", nargs="*", help="only process these lab ids")
    args = ap.parse_args()

    root = Path(args.root).resolve()
    content_dir = (root / args.content) if not Path(args.content).is_absolute() else Path(args.content)
    patch_practice_engine(root, args.dry_run)
    patch_lab_engine_h1(root, args.dry_run)
    rows = []
    for path, url_path, kind, cfg in discover(root):
        n = normalise(kind, cfg, url_path)
        if args.only and n["id"] not in args.only and url_path.strip("/").split("/")[-1] not in args.only:
            continue
        url = SITE + url_path
        md_file = content_dir / f"{n['id']}.md"
        alt = content_dir / f"{url_path.strip('/').split('/')[-1]}.md"
        guide_md = None
        for cand in (md_file, alt):
            if cand.exists():
                guide_md = cand.read_text(encoding="utf-8")
                break
        guide_html = ""
        if guide_md:
            body = re.sub(r"^---.*?---\s*", "", guide_md, flags=re.S)  # drop front-matter
            body = re.sub(r"^description:.*$", "", body, flags=re.M)
            guide_html = md_to_html(body)
        desc = make_description(n, guide_md)
        article = build_article(n, guide_html, url)
        words = word_count(article)
        noindex = (not args.index_all) and words < MIN_WORDS_FOR_INDEX
        head = build_head(n, url, desc, noindex)
        rows.append((url_path, n["id"], kind, words, bool(guide_md), noindex))
        if not args.dry_run:
            txt = path.read_text(encoding="utf-8", errors="ignore")
            path.write_text(inject(txt, head, article), encoding="utf-8")

    # ---- report ----
    rows.sort(key=lambda r: (r[5], -r[3]))
    print(f"{'URL':60} {'kind':6} {'words':>6} {'guide':5} {'index?':6}")
    for url_path, lid, kind, words, has_md, noindex in rows:
        print(f"{url_path:60} {kind:6} {words:6d} {'yes' if has_md else '-':5} {'NO' if noindex else 'yes':6}")
    total = len(rows); indexed = sum(1 for r in rows if not r[5]); with_md = sum(1 for r in rows if r[4])
    print(f"\n{total} lab pages · {with_md} have hand-written guides · {indexed} will be indexable"
          f" (≥{MIN_WORDS_FOR_INDEX} words) · {total-indexed} kept noindex until a guide is written")
    if args.dry_run:
        print("\n(dry run — nothing written)")
    else:
        print("\nDone. Next: copy site-files/lab-guide.css to the repo root, run tools/audit_site.py, "
              "then regenerate sitemap.xml with only indexable URLs.")


if __name__ == "__main__":
    main()
