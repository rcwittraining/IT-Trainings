#!/usr/bin/env python3
"""Static publication checks for the stateful RHCSA preparation labs."""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LABS = {
    "rhcsa-storage-build": ("Persistent Storage Build Challenge", 6),
    "rhcsa-system-operations": ("Boot, Timers and Recovery Challenge", 6),
    "rhcsa-network-selinux": ("Network, SELinux and Privilege Challenge", 7),
    "rhcsa-user-lifecycle": ("User Lifecycle and Orphaned Home Challenge", 7),
}
FORBIDDEN = re.compile(r"github|codespaces|arena(?:\.ai)?|backend", re.I)


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def main() -> None:
    catalogue = json.loads((ROOT / "simulators.json").read_text())
    entries = catalogue["simulators"]
    ids = [entry["id"] for entry in entries]
    require(len(entries) == 180, f"expected 180 catalogue entries, got {len(entries)}")
    require(len(ids) == len(set(ids)), "catalogue IDs must be unique")
    require(len({entry["targetUrl"] for entry in entries}) == len(entries), "catalogue URLs must be unique")
    original_fields = ("title", "category", "badge", "accent", "id", "targetUrl")
    original_records = [{key: item.get(key) for key in original_fields} for item in entries[:118]]
    original_digest = hashlib.sha256(json.dumps(original_records, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
    require(original_digest == "2bb5de58d64aeaf4754198225d1fff5629f38aff0e85f0d445c102a6ff300cdc", "one or more of the 118 published catalogue records changed")
    required_metadata = {"contentType", "technology", "subcategory", "group"}
    require(all(required_metadata <= entry.keys() for entry in entries), "catalogue categorisation metadata is incomplete")
    practice_entries = [entry for entry in entries if entry["group"] == "RHCSA Certification Practice"]
    require(len(practice_entries) == 62, f"expected 62 RHCSA practice entries, got {len(practice_entries)}")

    fallback = (ROOT / "catalogue-data.js").read_text()
    homepage = (ROOT / "index.html").read_text()
    require('src="catalogue-data.js"' in homepage and 'src="catalogue.js"' in homepage, "homepage catalogue scripts are missing")
    for control in ("technologyFilter", "typeFilter", "groupFilter", "subcategoryFilter"):
        require(f'id="{control}"' in homepage, f"homepage {control} is missing")
    require("RHCSA Certification Practice" in homepage and "rhcsa-practice/" in homepage, "RHCSA practice group feature is missing")
    engine = (ROOT / "rhcsa-challenge-engine.js").read_text()
    css = (ROOT / "rhcsa-challenge.css").read_text()
    require("@media(max-width:820px)" in css and "@media(max-width:560px)" in css, "responsive breakpoints are missing")
    require("Linux Challenge Champion" in engine, "certificate designation is missing")
    require("Pradeep Raju" in engine and "RCW IT Training" in engine, "certificate issuer or signer is missing")
    require("application/pdf" in engine and "Download PDF certificate" in engine, "PDF certificate support is missing")
    require("__RCW_ENABLE_TEST__ === true" in engine, "test hook must remain disabled by default")

    portrait_hashes = set()
    for slug, (title, objective_count) in LABS.items():
        matches = [entry for entry in entries if entry["id"] == slug]
        require(len(matches) == 1, f"{slug} must appear exactly once in catalogue")
        require(matches[0]["title"] == title, f"unexpected title for {slug}")
        require(matches[0]["targetUrl"] == f"https://www.rcwittraining.in/{slug}/", f"unexpected URL for {slug}")
        require(f'"id": "{slug}"' in fallback, f"{slug} missing from homepage fallback")

        folder = ROOT / slug
        index = (folder / "index.html").read_text()
        config = (folder / "config.js").read_text()
        guide = (folder / "LAB_GUIDE.md").read_text()
        portrait = folder / "assets" / "pradeep-raju.jpg"
        require(portrait.is_file() and portrait.stat().st_size > 10_000, f"portrait missing for {slug}")
        portrait_hashes.add(hashlib.sha256(portrait.read_bytes()).hexdigest())
        for reference in ("../passport.js", "config.js", "../rhcsa-challenge-engine.js", "../rhcsa-challenge.css"):
            require(reference in index, f"{reference} missing from {slug}/index.html")
        require("connect-src 'none'" in index and "object-src 'none'" in index, f"CSP controls missing for {slug}")
        points = [int(value) for value in re.findall(r"points:\s*(\d+)", config)]
        require(len(points) == objective_count, f"unexpected objective count for {slug}")
        require(sum(points) == 100, f"points must total 100 for {slug}")
        require("RHCSA-aligned preparation exercise" in guide, f"alignment disclaimer missing from {slug} guide")
        require("not an official exam environment" in guide, f"official-status disclaimer missing from {slug} guide")
        require("Linux Challenge Champion" in guide and "Pradeep Raju" in guide, f"certificate details missing from {slug} guide")
        learner_files = "\n".join((index, config, guide))
        require(not FORBIDDEN.search(learner_files), f"learner-facing hosting or implementation term found in {slug}")

    require(len(portrait_hashes) == 1, "all certificates should use the same approved portrait")
    print("RHCSA static catalogue, assets, scoring, certificate, CSP, responsive and terminology checks passed.")


if __name__ == "__main__":
    main()
