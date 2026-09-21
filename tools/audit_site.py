#!/usr/bin/env python3
"""
audit_site.py — see your site the way an AdSense reviewer's crawler sees it.

Fetches every URL in the live sitemap (or a list of URLs) WITHOUT executing
JavaScript, and reports per page: crawlable word count, title, meta description,
canonical, H1, noindex, and whether AdSense code is present.  Then prints the
readiness checklist that this site failed on 2026-09-21.

Run it before every resubmission.  Target:
  * 0 indexable pages with < 300 crawlable words
  * 0 duplicate meta descriptions among indexable pages
  * every indexable page has 1 H1, a unique description and a canonical

Usage:
    pip install requests beautifulsoup4 lxml      (one time)
    python3 tools/audit_site.py                   # audits https://www.rcwittraining.in/sitemap.xml
    python3 tools/audit_site.py --csv audit.csv   # also write a spreadsheet
    python3 tools/audit_site.py --sitemap https://example.com/sitemap.xml
"""
import argparse
import collections
import concurrent.futures as cf
import csv
import re
import statistics
import sys

import requests
from bs4 import BeautifulSoup

UA = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"
THIN = 300


def fetch(url):
    return requests.get(url, headers={"User-Agent": UA}, timeout=30, allow_redirects=True)


def analyse(url):
    try:
        r = fetch(url)
    except Exception as e:  # noqa
        return {"url": url, "status": "ERR", "error": str(e), "words": 0}
    soup = BeautifulSoup(r.text, "lxml")
    for t in soup(["script", "style", "noscript", "template", "svg"]):
        t.decompose()
    md = soup.find("meta", attrs={"name": "description"})
    canon = soup.find("link", rel="canonical")
    rob = soup.find("meta", attrs={"name": "robots"})
    text = soup.get_text(" ", strip=True)
    return {
        "url": url,
        "status": r.status_code,
        "title": (soup.title.string.strip() if soup.title and soup.title.string else ""),
        "description": md.get("content", "").strip() if md else "",
        "canonical": canon.get("href", "") if canon else "",
        "robots": rob.get("content", "") if rob else "",
        "h1": len(soup.find_all("h1")),
        "words": len(re.findall(r"\w+", text)),
        "adsense": "pagead2.googlesyndication.com" in r.text,
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--sitemap", default="https://www.rcwittraining.in/sitemap.xml")
    ap.add_argument("--csv")
    ap.add_argument("--workers", type=int, default=10)
    args = ap.parse_args()

    urls = re.findall(r"<loc>(.*?)</loc>", fetch(args.sitemap).text)
    print(f"{len(urls)} URLs in {args.sitemap}\n", file=sys.stderr)
    with cf.ThreadPoolExecutor(args.workers) as ex:
        rows = list(ex.map(analyse, urls))

    ok = [r for r in rows if r.get("status") == 200]
    indexable = [r for r in ok if "noindex" not in r["robots"].lower()]
    thin = [r for r in indexable if r["words"] < THIN]
    no_desc = [r for r in indexable if not r["description"]]
    no_canon = [r for r in indexable if not r["canonical"]]
    bad_h1 = [r for r in indexable if r["h1"] != 1]
    dup_desc = [(d, c) for d, c in collections.Counter(r["description"] for r in indexable if r["description"]).items() if c > 1]
    dup_title = [(d, c) for d, c in collections.Counter(r["title"] for r in indexable).items() if c > 1]
    non200 = [r for r in rows if r.get("status") != 200]

    def flag(n):
        return "PASS" if n == 0 else f"FAIL ({n})"

    print("=" * 72)
    print("ADSENSE READINESS — crawlable content (no JavaScript executed)")
    print("=" * 72)
    print(f"Pages in sitemap ............................ {len(rows)}")
    print(f"Pages returning 200 ......................... {len(ok)}")
    print(f"Indexable pages (no noindex) ................ {len(indexable)}")
    if indexable:
        ws = [r['words'] for r in indexable]
        print(f"Median crawlable words (indexable) .......... {statistics.median(ws):.0f}   (min {min(ws)}, max {max(ws)})")
    print()
    print(f"[{flag(len(non200))}]  every sitemap URL returns 200")
    print(f"[{flag(len(thin))}]  no indexable page under {THIN} crawlable words")
    print(f"[{flag(len(no_desc))}]  every indexable page has a meta description")
    print(f"[{flag(len(dup_desc))}]  no duplicate meta descriptions")
    print(f"[{flag(len(dup_title))}]  no duplicate titles")
    print(f"[{flag(len(no_canon))}]  every indexable page has a canonical")
    print(f"[{flag(len(bad_h1))}]  every indexable page has exactly one H1")
    print()
    if thin:
        print(f"--- {len(thin)} indexable pages under {THIN} words (fix or noindex + drop from sitemap) ---")
        for r in sorted(thin, key=lambda r: r["words"]):
            print(f"  {r['words']:>5}  {r['url']}")
        print()
    if dup_desc:
        print("--- duplicate meta descriptions ---")
        for d, c in dup_desc:
            print(f"  {c:>3} x  {d[:90]}")
        print()
    if non200:
        print("--- non-200 URLs ---")
        for r in non200:
            print(f"  {r.get('status')}  {r['url']}  {r.get('error','')}")
        print()

    if args.csv:
        with open(args.csv, "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=["url", "status", "words", "h1", "title", "description", "canonical", "robots", "adsense"])
            w.writeheader()
            for r in rows:
                w.writerow({k: r.get(k, "") for k in w.fieldnames})
        print(f"CSV written to {args.csv}")


if __name__ == "__main__":
    main()
