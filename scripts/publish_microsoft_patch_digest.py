#!/usr/bin/env python3
"""Create a weekly Microsoft Security Update Guide article from the official MSRC RSS feed."""
from __future__ import annotations
import datetime as dt, html, json, re, urllib.request, xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
RSS='https://api.msrc.microsoft.com/update-guide/rss'
TZ=dt.timezone(dt.timedelta(hours=5,minutes=30))
now=dt.datetime.now(TZ); cutoff=now-dt.timedelta(days=8)
feed=urllib.request.urlopen(RSS,timeout=30).read()
root=ET.fromstring(feed)
items=[]
for n in root.findall('.//item'):
    title=(n.findtext('title') or '').strip(); link=(n.findtext('link') or '').strip(); pub=(n.findtext('pubDate') or '').strip()
    try: when=parsedate_to_datetime(pub).astimezone(TZ)
    except Exception: continue
    if when>=cutoff and title and link: items.append((when,title,link))
items.sort(reverse=True)
state_path=ROOT/'data/microsoft-patch-digest-state.json'
state=json.loads(state_path.read_text()) if state_path.exists() else {'published_links':[]}
seen=set(state.get('published_links',[])); items=[x for x in items if x[2] not in seen]
if not items:
    print('No new MSRC RSS entries this week; no article created.')
    raise SystemExit(0)
# Cap an unexpectedly busy feed, while retaining direct official references.
items=items[:30]
slug=f'microsoft-security-patch-roundup-{now:%Y-%m-%d}'
title=f'Microsoft Security Patch Roundup — Week of {now:%B} {now.day}, {now:%Y}'
li='\n'.join(f'<li><a href="{html.escape(link,quote=True)}" rel="noopener noreferrer">{html.escape(text)}</a> <span>({when:%d %b %Y})</span></li>' for when,text,link in items)
page=f'''<!doctype html><html lang="en"><head>\n  <script src="rcw-consent.js"></script><meta charset="utf-8"><script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=pub-8225059092422989" crossorigin="anonymous"></script><meta name="viewport" content="width=device-width,initial-scale=1"><title>{html.escape(title)} | RCW IT Training</title><meta name="description" content="Weekly Microsoft security patch and vulnerability update roundup based on the official MSRC Security Update Guide."><link rel="canonical" href="https://www.rcwittraining.in/{slug}.html"><style>:root{{--n:#061633;--i:#101b3b;--b:#078be8;--c:#4bd7ff;--p:#f4f7fb;--m:#5f6c84;--l:#dce5f1}}*{{box-sizing:border-box}}body{{margin:0;background:var(--p);color:var(--i);font:16px/1.68 Inter,system-ui,sans-serif}}.top{{background:linear-gradient(112deg,#020a18,#06142c);border-bottom:4px solid var(--b);color:#fff;padding:16px 22px;display:flex;align-items:center;gap:14px}}.mark{{border:1px solid var(--c);border-radius:10px;color:var(--c);font-size:11px;font-weight:900;padding:10px 7px}}.brand{{font-weight:800}}.brand small{{display:block;color:#9eb6d7;font-size:11px;text-transform:uppercase}}.home{{margin-left:auto;color:var(--c);text-decoration:none;font-weight:700}}.wrap{{max-width:850px;margin:auto;padding:42px 22px 70px}}.hero,.content{{background:#fff;border:1px solid var(--l);border-radius:20px;padding:34px;box-shadow:0 10px 28px #081f4515}}.content{{margin-top:22px}}.ey{{color:#0769be;font-size:12px;font-weight:850;letter-spacing:1.4px;text-transform:uppercase}}h1{{font-size:clamp(30px,5vw,47px);line-height:1.12;margin:10px 0 16px}}.lead{{font-size:19px;color:#42516b}}li{{margin:13px 0}}a{{color:#0758c8;font-weight:700}}span{{color:var(--m);font-size:14px}}.note{{background:#fff7df;border:1px solid #f1d16a;border-radius:14px;padding:18px}}@media(max-width:550px){{.hero,.content{{padding:24px}}}}</style></head><body><header class="top"><span class="mark">RCW</span><span class="brand">RCW IT Training<small>Weekly security update</small></span><a class="home" href="/">← Back to home</a></header><main class="wrap"><article><div class="hero"><div class="ey">Microsoft security updates</div><h1>{html.escape(title)}</h1><p class="lead">Official Microsoft Security Response Center updates published during the past week, collected for patch planning and review.</p><p>Published {now:%d %B %Y} · RCW IT Training</p></div><div class="content"><p class="note"><strong>Important:</strong> Review the linked Microsoft advisory, affected-product information and available mitigations before deployment. This roundup is an index of official notices, not a substitute for change testing or incident response guidance.</p><h2>Official MSRC updates</h2><ul>{li}</ul><h2>Recommended next steps</h2><ol><li>Identify affected assets and confirm update applicability.</li><li>Prioritise actively exploited or internet-facing risk according to your organisation’s process.</li><li>Test patches in a representative ring, deploy in approved windows and verify service health.</li><li>Record exceptions, mitigations and the next review date.</li></ol><p>Source: <a href="https://api.msrc.microsoft.com/update-guide/rss">Microsoft Security Update Guide RSS feed</a>.</p></div></article></main><footer style="margin-top:48px;padding:22px 18px 26px;text-align:center;background:#030d20;border-top:1px solid #163b66;color:#dce9f6;font:14px/1.6 Inter,system-ui,sans-serif"><nav style="display:flex;gap:20px;justify-content:center;flex-wrap:wrap"><a href="/disclaimer.html" style="color:#4bd7ff;text-decoration:none;font-size:13px;font-weight:600">Disclaimer</a><a href="/terms-of-use.html" style="color:#4bd7ff;text-decoration:none;font-size:13px;font-weight:600">Terms</a><a href="/privacy.html" style="color:#4bd7ff;text-decoration:none;font-size:13px;font-weight:600">Privacy</a><a href="/privacy.html#privacy-choices" data-privacy-settings style="color:#4bd7ff;text-decoration:none;font-size:13px;font-weight:600">Privacy and cookie settings</a><a href="/about.html" style="color:#4bd7ff;text-decoration:none;font-size:13px;font-weight:600">About</a><a href="mailto:info@rcwittraining.in" style="color:#4bd7ff;text-decoration:none;font-size:13px;font-weight:600">Contact</a></nav><p style="margin:12px auto 0;max-width:800px;font-size:12px;line-height:1.6;color:#8fa3b8">RCW IT Training is an independent educational platform. All product names, logos, and brands are the property of their respective owners and are used for identification and educational purposes only. This site shows advertising provided by Google AdSense; see the privacy policy for details and to change your consent choices.</p></footer></body></html>'''
(ROOT/f'{slug}.html').write_text(page)
index=ROOT/'index.html'; src=index.read_text(); marker='          <!-- automated-microsoft-patch-articles -->'
card=f'''          <a class="article-card" href="{slug}.html"><span class="article-icon" aria-hidden="true">⚑</span><div><h3>{html.escape(title)}</h3><p>Microsoft Security · Weekly official patch update roundup</p><span class="article-go">Read article →</span></div></a>\n'''
if marker not in src: raise RuntimeError('Homepage article marker is missing')
index.write_text(src.replace(marker,card+marker,1))
state['published_links']=list(dict.fromkeys([x[2] for x in items]+state.get('published_links',[])))[:1000]
state['last_run']=now.isoformat(); state_path.write_text(json.dumps(state,indent=2)+'\n')
print('Created',slug+'.html','with',len(items),'official MSRC entries.')
