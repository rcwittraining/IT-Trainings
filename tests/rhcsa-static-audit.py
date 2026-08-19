#!/usr/bin/env python3
"""Static publication checks for the three stateful RHCSA preparation labs."""

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
}
FORBIDDEN = re.compile(r"github|codespaces|arena(?:\.ai)?|backend", re.I)


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def main() -> None:
    catalogue = json.loads((ROOT / "simulators.json").read_text())
    entries = catalogue["simulators"]
    ids = [entry["id"] for entry in entries]
    require(len(entries) == 117, f"expected 117 catalogue entries, got {len(entries)}")
    require(len(ids) == len(set(ids)), "catalogue IDs must be unique")

    fallback = (ROOT / "index.html").read_text()
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
