# Google AdSense deployment checklist

Publisher: `ca-pub-8225059092422989`

Site: `https://www.rcwittraining.in/`

Last updated: 28 August 2026

## Website implementation

- [x] Add the AdSense loader to the public catalogue homepage (`index.html`).
- [x] Add the loader to all informational content pages (troubleshooting guides,
      design guides, RHCSA pages, and the technology/patch roundups).
- [x] Do not add AdSense to `open.html`, `/admin/`, timed challenges, lab interfaces, or certificate views.
- [x] Publish root `/ads.txt` with the exact publisher ID.
- [x] Add the 21 previously unlisted informational pages to `sitemap.xml`.

### Correction, 28 August 2026

The checklist previously claimed the AdSense code was already present on the
homepage, the RHCSA page, and the privacy page. **It was not present in any HTML
file in this repository.** The script was only injected at runtime by
`rcw-consent.js`, and only after a visitor clicked *Accept all*:

```js
if (choice === "accepted") { loadAdsense(); }
```

A crawler never clicks *Accept all*, so `adsbygoogle.js` was never requested, the
site generated no ad requests, and Google never crawled `ads.txt` — which is why
AdSense reported *"ads.txt not found / last crawled: not applicable"*.

The loader is now a static `<head>` tag on the informational pages, so Google can
verify `ads.txt` regardless of consent. Ad **personalisation** remains gated by
Consent Mode v2 in `rcw-consent.js`. `loadAdsense()` is now idempotent and will
not inject a second copy where the static tag already exists.

Note on `privacy.html`: the loader is deliberately **not** placed there, matching
the Auto ads exclusion table below. Google's consent-revocation link comes from
the certified CMP, not from the ad script, so nothing is lost.
- [x] Publish a dedicated privacy and cookie policy.
- [x] Add persistent Privacy and cookie settings links.
- [x] Correct the older disclaimer wording that said no information was collected.

The website code is complete. The account-side steps below must be completed by the AdSense account owner.

## Connect and request review

1. Sign in to Google AdSense.
2. Go to **Sites** and select `rcwittraining.in`.
3. Use **AdSense code snippet** as the verification method.
4. Select **Verify** after this website update is live.
5. Confirm that the displayed publisher ID is `pub-8225059092422989`.
6. Check that AdSense can read `https://www.rcwittraining.in/ads.txt`.
7. Select **Request review**.

## Google-certified CMP and Consent Mode

Use Google's CMP rather than a custom banner.

1. In AdSense, open **Privacy & messaging**.
2. Open the **European regulations** card.
3. Create or open the message for `rcwittraining.in`.
4. Set the privacy policy URL to `https://www.rcwittraining.in/privacy.html`.
5. Select the three-choice design: **Consent**, **Do not consent**, and **Manage options**.
6. Review the ad partners shown in the message. Keep only partners intended for use.
7. Publish the message.
8. Return to the European regulations card and open **Settings**.
9. Enable **Consent mode for advertising purposes**. This supplies the Consent Mode advertising signals for ad storage, ad personalization, and ad user data.
10. Leave **Consent mode for analytics purposes** disabled while the site does not use Google Analytics. Enable it only if analytics is intentionally added and the privacy policy is updated.
11. Confirm that consent revocation is active. Google can add its own footer revocation link; the site's **Privacy and cookie settings** links also call Google's revocation API.
12. If AdSense offers to create a European regulations message during site review, choose Google's CMP and then verify the settings above.

Also review **US state regulations** in Privacy & messaging and publish the applicable opt-out message if Google indicates that it applies to site traffic.

## Auto ads scope and exclusions

Prefer Auto ads only on the catalogue and informational content. Do not place ads inside tasks, timed incidents, secure launchers, or certificate flows.

In **Ads → Edit site → Page exclusions**, add these safeguards if Auto ads is enabled globally:

| URL or section | Exclusion type |
|---|---|
| `https://www.rcwittraining.in/open.html` | This page only |
| `https://www.rcwittraining.in/technical-quiz-agent/` | All pages under section |
| `https://www.rcwittraining.in/admin/` | All pages under section |
| `https://www.rcwittraining.in/linux-challenge-1/` | All pages under section |
| `https://www.rcwittraining.in/linux-challenge-2/` | All pages under section |
| `https://www.rcwittraining.in/linux-challenge-3/` | All pages under section |
| `https://www.rcwittraining.in/linux-challenge-4/` | All pages under section |
| `https://www.rcwittraining.in/aws-cloud-challenge-1/` | All pages under section |
| `https://www.rcwittraining.in/production-outage-game/` | All pages under section |
| `https://www.rcwittraining.in/privacy.html` | This page only |
| `https://www.rcwittraining.in/disclaimer.html` | This page only |

The current repository does not include the AdSense tag on the launcher, admin, or interactive challenge pages. The dashboard exclusions provide defense in depth if site-wide code is added later.

*29 August 2026:* `rcw-consent.js` no longer injects the AdSense script at all. Only the approved informational pages carry the static loader, so with Auto ads enabled, ads can only ever appear on those pages; labs, challenges, admin and certificate flows cannot receive injected ads regardless of dashboard settings.

## Post-deployment checks

- [ ] `https://www.rcwittraining.in/ads.txt` returns HTTP 200 and the exact publisher line.
- [ ] The homepage source contains `ca-pub-8225059092422989` once.
- [ ] The launcher and interactive lab source do not contain AdSense code.
- [ ] The privacy policy is linked from the homepage.
- [ ] An EEA/UK/Swiss location receives the published European regulations message.
- [ ] **Do not consent** and **Manage options** are available.
- [ ] **Privacy and cookie settings** reopens the Google consent message after an initial choice.
- [ ] AdSense reports the site as verified and `ads.txt` as authorized.
- [ ] Auto ads exclusions are applied before Auto ads is enabled.
- [ ] Check desktop and mobile layouts for accidental-click risk and disruptive placements.

Do not store Google passwords, one-time codes, payment details, recovery information, or private credentials in this repository.
