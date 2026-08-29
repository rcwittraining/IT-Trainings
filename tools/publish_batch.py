#!/usr/bin/env python3
"""Publish the next daily batch of troubleshooting articles.

Reads drafts/batch-NN/ (lowest unpublished number), copies its HTML files to
the site root, adds sitemap entries and homepage article cards, and records
the batch in tools/published_batches.txt. The surrounding workflow handles
commit and push. If the queue is empty, prints a notice and exits 0 so the
scheduled job simply idles until new drafts are added.
"""
import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DRAFTS = ROOT / "drafts"
MARKER = ROOT / "tools" / "published_batches.txt"
BASE = "https://www.rcwittraining.in"
SITEMAP_ANCHOR = '  <url><loc>https://www.rcwittraining.in/cissp-bootcamp/</loc>'
HOMEPAGE_ANCHOR = 'href="microsoft-security-patch-roundup-2026-08-25.html"'


def next_batch():
    if not DRAFTS.is_dir():
        return None
    done = set()
    if MARKER.exists():
        done = set(MARKER.read_text().split())
    for d in sorted(DRAFTS.glob("batch-*")):
        if d.name not in done and any(d.glob("*.html")):
            return d
    return None


def parse_meta(html, name):
    m = re.search(rf'<meta name="{name}" content="([^"]*)"', html)
    return m.group(1) if m else ""


def main():
    batch = next_batch()
    if batch is None:
        print("QUEUE EMPTY: no unpublished batch in drafts/. Nothing to do.")
        return 0

    files = sorted(batch.glob("*.html"))
    print(f"Publishing {batch.name}: {[f.name for f in files]}")

    sitemap_urls, cards = [], []
    for f in files:
        html = f.read_text(encoding="utf-8")
        shutil.copy(f, ROOT / f.name)
        sitemap_urls.append(f'  <url><loc>{BASE}/{f.name}</loc><priority>0.5</priority></url>\n')
        title = parse_meta(html, "rcw-title") or re.sub(
            r"\s*\|.*$", "", re.search(r"<title>([^<]*)</title>", html).group(1))
        card = parse_meta(html, "rcw-card") or "Detailed troubleshooting guide"
        cards.append(
            f'          <a class="article-card" href="{f.name}"><span class="article-icon" '
            f'aria-hidden="true">⌁</span><div><h3>{title}</h3><p>{card}</p>'
            f'<span class="article-go">Read article →</span></div></a>')

    # sitemap
    sm_p = ROOT / "sitemap.xml"
    sm = sm_p.read_text(encoding="utf-8")
    block = "".join(sitemap_urls)
    if SITEMAP_ANCHOR in sm:
        sm = sm.replace(SITEMAP_ANCHOR, block + SITEMAP_ANCHOR)
    else:
        sm = sm.replace("</urlset>", block + "</urlset>")
    sm_p.write_text(sm, encoding="utf-8")

    # homepage cards
    idx_p = ROOT / "index.html"
    idx = idx_p.read_text(encoding="utf-8")
    card_block = "\n" + "\n".join(cards)
    if HOMEPAGE_ANCHOR in idx:
        i = idx.index("\n", idx.index(HOMEPAGE_ANCHOR))
        idx = idx[:i] + card_block + idx[i:]
    else:  # fallback: after the last article card
        i = idx.rfind('Read article →</span></div></a>')
        i = idx.index("\n", i)
        idx = idx[:i] + card_block + idx[i:]
    idx_p.write_text(idx, encoding="utf-8")

    done = set(MARKER.read_text().split()) if MARKER.exists() else set()
    MARKER.write_text("\n".join(sorted(done | {batch.name})) + "\n", encoding="utf-8")
    print(f"Done. {len(files)} article(s) live; sitemap and homepage updated.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
