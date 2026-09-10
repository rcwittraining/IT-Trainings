# Google AdSense deployment and policy checklist

Publisher: `ca-pub-8225059092422989`

Site: `https://www.rcwittraining.in/`

Last reviewed: 10 September 2026

> This checklist improves the repository's implementation and publication
> hygiene. It cannot guarantee AdSense approval. Google makes the final
> decision after reviewing the live site, account, traffic, content, and
> regional privacy configuration.

## What the repository now does

- The AdSense loader uses the standard publisher parameter:
  `client=ca-pub-8225059092422989`.
- Static AdSense tags are limited to the public catalogue and longer original
  instructional/troubleshooting/design guides that are suitable for
  advertising.
- AdSense is removed from drafts, daily security-patch roundups, vendor/event
  roundups, `rhcsa-videos.html` (primarily a YouTube directory), and shorter
  guide/about pages that need more depth before monetisation.
- `open.html`, interactive labs, timed challenges, admin/restricted tools,
  certificate/assessment flows, and legal/privacy pages remain ad-free.
- `/ads.txt` contains the seller authorization line for this publisher.
- `privacy.html` describes AdSense, YouTube click-to-load behavior, privacy
  choices, regional rights, and the privacy contact.
- `rcw-consent.js` does not inject an AdSense tag, set a custom advertising
  consent cookie, or load analytics. It initializes Google's supported
  `googlefc.callbackQueue`, provides the CMP revocation bridge, and keeps
  YouTube embeds click-to-load.
- Draft pages have `noindex,nofollow` and are blocked by `robots.txt`; daily
  roundup pages have `noindex,follow` and are not in the sitemap.

Run the repository audit before deployment:

```bash
python3 tests/adsense_audit.py
```

## Required account-side actions

The following cannot be completed by editing this repository:

1. Sign in to the AdSense account that owns `ca-pub-8225059092422989`.
2. In **Sites**, add or verify `rcwittraining.in` using the live homepage.
3. Confirm that `https://www.rcwittraining.in/ads.txt` returns HTTP 200 and
   contains the exact authorized seller line.
4. In **Privacy & messaging**, create and publish the applicable Google-
   certified consent message for this site. Set the site's privacy-policy URL
   to `https://www.rcwittraining.in/privacy.html`.
5. Offer the legally required choices for the visitor's region, including a
   clear decline option and a manage-options path where applicable. Review the
   partners and purposes before publishing.
6. Configure the applicable advertising Consent Mode and US-state opt-out
   settings in the Google CMP dashboard. Do not enable analytics purposes for
   this site unless analytics is intentionally added and the privacy policy is
   changed.
7. In **Ads → Edit site → Page exclusions**, exclude the ad-free sections and
   flows listed below, even though the repository does not place static tags
   there. Dashboard exclusions are defense in depth if Auto ads settings
   change later.
8. Only after the live checks pass, request AdSense review from the account.

Do not store Google passwords, one-time codes, payment details, recovery
information, or private credentials in this repository.

## Auto ads page exclusions

If Auto ads is enabled, configure exclusions for at least:

| URL or section | Exclusion |
|---|---|
| `https://www.rcwittraining.in/open.html` | This page only |
| `https://www.rcwittraining.in/admin/` | All pages under section |
| `https://www.rcwittraining.in/admin-restricted-tools/` | All pages under section |
| `https://www.rcwittraining.in/downloads/` | All pages under section |
| `https://www.rcwittraining.in/labs/` | All pages under section |
| `https://www.rcwittraining.in/technical-quiz-agent/` | All pages under section |
| `https://www.rcwittraining.in/linux-challenge-1/` through `linux-challenge-10/` | All pages under each section |
| `https://www.rcwittraining.in/aws-cloud-challenge-1/` | All pages under section |
| `https://www.rcwittraining.in/production-outage-game/` | All pages under section |
| `https://www.rcwittraining.in/certification.html` | This page only |
| `https://www.rcwittraining.in/privacy.html` | This page only |
| `https://www.rcwittraining.in/disclaimer.html` | This page only |
| `https://www.rcwittraining.in/terms-of-use.html` | This page only |
| `/drafts/` | All draft pages |
| `*roundup*` and `rhcsa-videos.html` | Keep excluded from advertising unless a future content review establishes substantial original value |

The exact dashboard UI may group exclusions differently. Confirm exclusions
with the live preview tools before enabling Auto ads.

## Content and publication rules

- Monetize only pages with substantial, original instructional value and a
  clear purpose for the reader. The current conservative set contains 35
  pages, including the catalogue and longer guides. Do not treat a high page
  count as a reason to add ads.
- Shorter guides are still public for readers, but remain ad-free until they
  receive enough original explanation, examples, and practical context to
  justify a separate content review.
- Do not monetize pages that are mostly copied/aggregated links, automated
  feeds, video indexes, thin navigation, or unfinished drafts.
- Keep ads visually separate from buttons, answer controls, lab commands,
  timers, download links, and other elements that could cause accidental
  clicks.
- Never ask visitors to click ads, compensate them for ad interactions, or
  place ads where a user could mistake them for a control or a training result.
- Keep product and certification claims accurate, distinguish independent
  RCW content from vendor material, and maintain the legal/privacy links.
- Review each new article before adding an AdSense tag. A static tag is not an
  approval or a guarantee that the page is suitable for ads.

## Post-deployment checks

- [ ] `https://www.rcwittraining.in/ads.txt` returns HTTP 200 with the exact
      publisher line.
- [ ] Live page source uses `client=ca-pub-8225059092422989`; no page uses the
      old `client=pub-...` form.
- [ ] The homepage initializes `rcw-consent.js` before its AdSense loader.
- [ ] Drafts, roundup pages, `rhcsa-videos.html`, privacy/legal pages, labs,
      challenges, tools, and certificate flows contain no AdSense loader.
- [ ] Every monetized page links to the privacy policy and a privacy-settings
      control in its footer.
- [ ] The published Google CMP appears in a test region where it applies.
- [ ] Consent, decline, and manage-options behavior is tested on desktop and
      mobile; privacy settings successfully reopens the Google message after
      an initial choice.
- [ ] Dashboard page exclusions are applied before Auto ads is enabled.
- [ ] No ad appears inside an interactive task, timed challenge, restricted
      tool, certificate flow, or near a control where accidental clicks are
      likely.
- [ ] AdSense reports the site and `ads.txt` as eligible/authorized in the
      account. This is an account result, not a repository test.

## References

- [Google Publisher Policies](https://support.google.com/adsense/answer/10502938)
- [Google AdSense placement policies](https://support.google.com/adsense/answer/1346295)
- [Google Privacy & Messaging JavaScript API](https://developers.google.com/funding-choices/fc-api-docs)
- [How Google uses information from sites or apps that use its services](https://policies.google.com/technologies/partner-sites)
- [Google advertising technologies](https://policies.google.com/technologies/ads)
