#!/usr/bin/env python3
"""Publish weekly vendor news, certification and publicly listed webinar roundups."""
import datetime as dt, html, json, re, urllib.parse, urllib.request, xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; TZ=dt.timezone(dt.timedelta(hours=5,minutes=30)); now=dt.datetime.now(TZ); cutoff=now-dt.timedelta(days=8)
vendors=['Broadcom','TrueNAS','Pure Storage','Dell Technologies','Microsoft','Google Cloud','AWS','Red Hat','NinjaOne','Ping Identity','Citrix']
queries={'Technology news':'news','Certification updates':'certification OR exam OR training','Webinars and events':'webinar OR virtual event OR event'}
def feed(q):
 u='https://news.google.com/rss/search?'+urllib.parse.urlencode({'q':q,'hl':'en-IN','gl':'IN','ceid':'IN:en'})
 return urllib.request.urlopen(u,timeout=30).read()
entries={k:[] for k in queries}
for kind,term in queries.items():
 for vendor in vendors:
  try:r=ET.fromstring(feed(f'"{vendor}" ({term}) when:8d'))
  except Exception as e: print('source unavailable:',vendor,kind,e);continue
  for x in r.findall('.//item'):
   title=(x.findtext('title') or '').strip();link=(x.findtext('link') or '').strip();date=x.findtext('pubDate') or ''
   try:when=parsedate_to_datetime(date).astimezone(TZ)
   except Exception:continue
   if when>=cutoff and title and link:entries[kind].append((when,title,link,vendor))
statefile=ROOT/'data/vendor-intelligence-state.json';state=json.loads(statefile.read_text()) if statefile.exists() else {'links':[]};seen=set(state['links'])
for k in entries:
 d={}
 for x in entries[k]:
  if x[2] not in seen:d[x[2]]=x
 entries[k]=sorted(d.values(),reverse=True)[:25]
if not any(entries.values()): print('No new vendor items.');raise SystemExit(0)
slug=f'vendor-tech-certification-webinar-roundup-{now:%Y-%m-%d}'; title=f'Weekly Technology, Certification & Webinar Roundup — {now:%B} {now.day}, {now:%Y}'
def section(kind):
 xs=entries[kind]
 if not xs:return '<p>No newly indexed items were found for this category during this run.</p>'
 return '<ul>'+''.join(f'<li><a href="{html.escape(link,quote=True)}" rel="noopener noreferrer">{html.escape(text)}</a><span> · {html.escape(vendor)} · {when:%d %b %Y}</span></li>' for when,text,link,vendor in xs)+'</ul>'
page=f'''<!doctype html><html lang="en"><head>\n  <script src="rcw-consent.js"></script><meta charset="utf-8"><meta name="robots" content="noindex,follow"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{html.escape(title)} | RCW IT Training</title><meta name="description" content="Weekly technology news, certification changes and webinar listings for enterprise IT vendors."><style>body{{margin:0;background:#f4f7fb;color:#101b3b;font:16px/1.7 system-ui,sans-serif}}header{{background:#061633;color:#fff;padding:18px 7%;border-bottom:4px solid #078be8}}header a{{color:#4bd7ff;float:right}}main{{max-width:900px;margin:auto;padding:36px 20px}}article{{background:#fff;border:1px solid #dce5f1;border-radius:18px;padding:30px;box-shadow:0 10px 28px #081f4515}}h1{{line-height:1.15}}h2{{margin-top:38px}}a{{color:#0758c8;font-weight:700}}li{{margin:13px 0}}span{{color:#5f6c84;font-size:14px}}.note{{background:#fff7df;border:1px solid #f1d16a;border-radius:12px;padding:16px}}</style></head><body><header><strong>RCW IT Training</strong><a href="/">← Back to home</a></header><main><article><p>Enterprise technology watch</p><h1>{html.escape(title)}</h1><p>Coverage: Broadcom, TrueNAS, Pure Storage, Dell Technologies, Microsoft, Google Cloud, AWS, Red Hat, NinjaOne, Ping Identity and Citrix.</p><p class="note"><strong>Reader note:</strong> This automated discovery roundup links to publicly indexed items. Confirm dates, registration requirements, pricing, availability and technical details with the original publisher before acting. Webinar titles may be announcements rather than confirmed sessions.</p><h2>Technology news</h2>{section('Technology news')}<h2>Certification updates</h2>{section('Certification updates')}<h2>Webinars and events</h2>{section('Webinars and events')}<h2>How to use this roundup</h2><ol><li>Open the original source before sharing or registering.</li><li>Validate certification policy changes with the vendor’s official certification portal.</li><li>Use change management and test plans before implementing product updates.</li></ol><p>Published {now:%d %B %Y} · RCW IT Training</p></article></main><footer style="margin-top:48px;padding:22px 18px 26px;text-align:center;background:#030d20;border-top:1px solid #163b66;color:#dce9f6;font:14px/1.6 Inter,system-ui,sans-serif"><nav style="display:flex;gap:20px;justify-content:center;flex-wrap:wrap"><a href="/disclaimer.html" style="color:#4bd7ff;text-decoration:none;font-size:13px;font-weight:600">Disclaimer</a><a href="/terms-of-use.html" style="color:#4bd7ff;text-decoration:none;font-size:13px;font-weight:600">Terms</a><a href="/privacy.html" style="color:#4bd7ff;text-decoration:none;font-size:13px;font-weight:600">Privacy</a><a href="/privacy.html#privacy-choices" data-privacy-settings style="color:#4bd7ff;text-decoration:none;font-size:13px;font-weight:600">Privacy and cookie settings</a><a href="/about.html" style="color:#4bd7ff;text-decoration:none;font-size:13px;font-weight:600">About</a><a href="mailto:info@rcwittraining.in" style="color:#4bd7ff;text-decoration:none;font-size:13px;font-weight:600">Contact</a></nav><p style="margin:12px auto 0;max-width:800px;font-size:12px;line-height:1.6;color:#8fa3b8">RCW IT Training is an independent educational platform. All product names, logos, and brands are the property of their respective owners and are used for identification and educational purposes only. This site shows advertising provided by Google AdSense; see the privacy policy for details and to change your consent choices.</p></footer></body></html>'''
(ROOT/(slug+'.html')).write_text(page)
# Homepage cards intentionally not published: roundups are noindex
# discovery pages and must not be part of the indexed content portfolio.
new=[x[2] for xs in entries.values() for x in xs];state['links']=list(dict.fromkeys(new+state['links']))[:3000];state['last_run']=now.isoformat();statefile.write_text(json.dumps(state,indent=2)+'\n');print('Created',slug)
