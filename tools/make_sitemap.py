#!/usr/bin/env python3
"""
make_sitemap.py — regenerate sitemap.xml from the LOCAL repository, listing only
pages that deserve to be indexed.

Rules
  * include every *.html / */index.html under the repo root
  * EXCLUDE pages that contain <meta name="robots" content="noindex...">
  * EXCLUDE robots.txt-disallowed folders (admin, admin-restricted-tools, drafts, downloads)
  * EXCLUDE 404.html, google*.html verification files, and anything in --exclude
  * <lastmod> from git (last commit touching the file) when available, else file mtime

Usage (from repo root):
    python3 tools/make_sitemap.py                # writes sitemap.xml
    python3 tools/make_sitemap.py --dry-run      # print only
"""
import argparse
import datetime as dt
import re
import subprocess
from pathlib import Path

SITE = "https://www.rcwittraining.in"
SKIP_DIRS = {"admin", "admin-restricted-tools", "drafts", "downloads", ".git", "node_modules", "tools", "content", "Unselected files"}
SKIP_FILES = {"404.html"}


def lastmod(path: Path, root: Path) -> str:
    try:
        out = subprocess.run(["git", "log", "-1", "--format=%cs", "--", str(path.relative_to(root))],
                             cwd=root, capture_output=True, text=True, timeout=10).stdout.strip()
        if re.match(r"\d{4}-\d{2}-\d{2}$", out):
            return out
    except Exception:
        pass
    return dt.date.fromtimestamp(path.stat().st_mtime).isoformat()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=".")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--exclude", nargs="*", default=[], help="extra path substrings to exclude")
    args = ap.parse_args()
    root = Path(args.root).resolve()

    entries = []
    for p in sorted(root.rglob("*.html")):
        rel = p.relative_to(root)
        if set(rel.parts) & SKIP_DIRS or rel.name in SKIP_FILES or rel.name.startswith("google"):
            continue
        if any(x in str(rel) for x in args.exclude):
            continue
        txt = p.read_text(encoding="utf-8", errors="ignore")
        if re.search(r'<meta\s+name="robots"\s+content="[^"]*noindex', txt, re.I):
            continue
        if "<title" not in txt.lower():
            continue
        if rel.name == "index.html":
            url = SITE + "/" + ("/".join(rel.parts[:-1]) + "/" if len(rel.parts) > 1 else "")
        else:
            url = SITE + "/" + str(rel).replace("\\", "/")
        prio = "1.0" if url == SITE + "/" else "0.9" if rel.name != "index.html" and len(rel.parts) == 1 else "0.8"
        entries.append((url, lastmod(p, root), prio))

    xml = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for url, lm, prio in entries:
        xml.append(f"  <url><loc>{url}</loc><lastmod>{lm}</lastmod><priority>{prio}</priority></url>")
    xml.append("</urlset>")
    out = "\n".join(xml) + "\n"
    print(f"{len(entries)} indexable URLs")
    if args.dry_run:
        print(out[:3000])
    else:
        (root / "sitemap.xml").write_text(out, encoding="utf-8")
        print("sitemap.xml written")


if __name__ == "__main__":
    main()
