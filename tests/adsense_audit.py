#!/usr/bin/env python3
"""Static checks for the site's AdSense/privacy publication boundaries.

This is intentionally a small dependency-free audit. It checks repository
invariants; it cannot test Google's account configuration or guarantee policy
approval.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PUBLISHER = "ca-pub-8225059092422989"
ADSENSE_LOADER = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"
OLD_CLIENT = "adsbygoogle.js?client=pub-8225059092422989"


def fail(errors: list[str], message: str) -> None:
    errors.append(message)


def main() -> int:
    errors: list[str] = []
    html_files = sorted(ROOT.rglob("*.html"))
    excluded_names = {
        "about.html",
        "rhcsa-videos.html",
        "privacy.html",
        "disclaimer.html",
        "terms-of-use.html",
        "open.html",
        "certification.html",
        # Conservative content boundary: these short pages remain public but
        # are not monetized until they receive a deeper content review.
        "ad-replication-dns-troubleshooting.html",
        "ad-trust-kerberos-gpo-troubleshooting.html",
        "aws-ec2-s3-ebs-troubleshooting.html",
        "aws-multi-account-security-baseline.html",
        "aws-resilience-disaster-recovery-patterns.html",
        "azure-vm-identity-troubleshooting.html",
        "commvault-jobs-clients-troubleshooting.html",
        "dell-poweredge-idrac-perc-troubleshooting.html",
        "gcp-access-iam-troubleshooting.html",
        "intune-enrollment-apps-troubleshooting.html",
        "linux-performance-ssh-troubleshooting.html",
        "microsoft-intune-compliance-conditional-access.html",
        "microsoft-intune-zero-touch-windows.html",
        "pure-flasharray-troubleshooting.html",
        "san-multipath-latency-troubleshooting.html",
        "truenas-snapshots-replication-disaster-recovery.html",
        "truenas-zfs-storage-architecture.html",
        "veeam-immutable-backup-design.html",
        "veeam-jobs-restore-troubleshooting.html",
        "veeam-recovery-objectives-and-testing.html",
        "vmware-cloud-foundation-network-security.html",
        "vmware-cloud-foundation-workload-domains.html",
        "vmware-snapshot-datastore-troubleshooting.html",
        "vmware-vcenter-network-troubleshooting.html",
    }

    for path in html_files:
        rel = path.relative_to(ROOT).as_posix()
        text = path.read_text(encoding="utf-8", errors="replace")
        has_loader = ADSENSE_LOADER in text
        is_roundup = (
            rel.startswith("microsoft-security-patch-roundup-")
            or rel.startswith("vendor-tech-certification-webinar-roundup-")
        )
        is_draft = rel.startswith("drafts/")

        if OLD_CLIENT in text:
            fail(errors, f"{rel}: uses the old client=pub- publisher parameter")
        if re.search(r'<iframe[^>]+\ssrc=["\'][^"\']*youtube(?:-nocookie)?\.com/embed/', text, re.I):
            fail(errors, f"{rel}: YouTube iframe has an eager src; use data-rcw-src for click-to-load")

        if is_draft and has_loader:
            fail(errors, f"{rel}: draft contains an AdSense loader")
        if is_roundup and has_loader:
            fail(errors, f"{rel}: roundup contains an AdSense loader")
        if rel in excluded_names and has_loader:
            fail(errors, f"{rel}: excluded page contains an AdSense loader")
        if len(Path(rel).parts) > 1 and has_loader:
            fail(errors, f"{rel}: nested page contains an AdSense loader")

        if is_draft and 'name="robots" content="noindex,nofollow"' not in text:
            fail(errors, f"{rel}: draft is missing noindex,nofollow")
        if rel.startswith("microsoft-security-patch-roundup-") and 'name="robots" content="noindex,follow"' not in text:
            fail(errors, f"{rel}: roundup is missing noindex,follow")

        if has_loader:
            if text.count(ADSENSE_LOADER) != 1:
                fail(errors, f"{rel}: expected exactly one AdSense loader")
            if f"adsbygoogle.js?client={PUBLISHER}" not in text:
                fail(errors, f"{rel}: loader does not use {PUBLISHER}")
            if "privacy.html#privacy-choices" not in text or "data-privacy-settings" not in text:
                fail(errors, f"{rel}: monetized page lacks the privacy-settings link")
            if "privacy-settings.js" not in text:
                fail(errors, f"{rel}: monetized page lacks the CMP settings bridge")
            if "rcw-consent.js" not in text:
                fail(errors, f"{rel}: monetized page lacks the shared privacy helper")
            elif text.index("rcw-consent.js") > text.index(ADSENSE_LOADER):
                fail(errors, f"{rel}: CMP callback queue is initialized after the AdSense loader")

    consent = (ROOT / "rcw-consent.js").read_text(encoding="utf-8")
    if ADSENSE_LOADER in consent:
        fail(errors, "rcw-consent.js: must not inject or load AdSense")
    if re.search(r"localStorage|sessionStorage|Google Analytics|gtag|analytics_storage", consent, re.I):
        fail(errors, "rcw-consent.js: contains custom storage or analytics code")
    if "googlefc.callbackQueue" not in consent or "showRevocationMessage" not in consent:
        fail(errors, "rcw-consent.js: missing Google CMP callback/revocation bridge")

    index = (ROOT / "index.html").read_text(encoding="utf-8")
    if index.index("rcw-consent.js") > index.index(ADSENSE_LOADER):
        fail(errors, "index.html: consent queue is initialized after the AdSense loader")

    ads_txt = (ROOT / "ads.txt").read_text(encoding="utf-8").strip()
    expected_ads_txt = "google.com, pub-8225059092422989, DIRECT, f08c47fec0942fa0"
    if ads_txt != expected_ads_txt:
        fail(errors, "ads.txt: seller authorization line is not the configured Google line")

    robots = (ROOT / "robots.txt").read_text(encoding="utf-8")
    if "Disallow: /drafts/" not in robots:
        fail(errors, "robots.txt: /drafts/ is not disallowed")

    sitemap = (ROOT / "sitemap.xml").read_text(encoding="utf-8")
    if "roundup-" in sitemap:
        fail(errors, "sitemap.xml: contains an excluded roundup URL")

    if errors:
        print("AdSense audit failed:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1

    monetized = sum(
        ADSENSE_LOADER in p.read_text(encoding="utf-8", errors="replace")
        for p in html_files
    )
    print(f"AdSense audit passed: {len(html_files)} HTML files checked; {monetized} monetized pages; excluded boundaries are clean.")
    print("Account-side CMP publication, page exclusions, ads.txt crawling, and AdSense approval still require live dashboard checks.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
