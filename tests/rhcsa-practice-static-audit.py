#!/usr/bin/env python3
"""Static audit for the 62 original RHCSA Certification Practice tasks."""
from __future__ import annotations

import hashlib
import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PRACTICE = ROOT / "rhcsa-practice"
FORBIDDEN = re.compile(r"ExamTopics|codespaces|arena(?:\.ai)?|backend code", re.I)
DOMAIN_COUNTS = {
    "Essential Tools": 11,
    "Software Management": 4,
    "Shell Scripting": 4,
    "Running Systems": 10,
    "Local Storage": 6,
    "File Systems": 5,
    "System Maintenance": 6,
    "Networking": 4,
    "Users and Groups": 4,
    "Security": 8,
}


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def load_config(path: Path) -> dict:
    text = path.read_text()
    prefix = "window.RCW_RHCSA_PRACTICE = Object.freeze("
    require(text.startswith(prefix) and text.rstrip().endswith(");"), f"invalid generated config wrapper: {path}")
    return json.loads(text[len(prefix):].rstrip()[:-2])


def main() -> None:
    manifest = json.loads((PRACTICE / "manifest.json").read_text())
    tasks = manifest["tasks"]
    require(manifest["total"] == 62 and len(tasks) == 62, "practice manifest must contain 62 tasks")
    require([task["number"] for task in tasks] == list(range(1, 63)), "practice task numbering must be contiguous")
    require(len({task["id"] for task in tasks}) == 62, "practice task IDs must be unique")
    require(Counter(task["domain"] for task in tasks) == Counter(DOMAIN_COUNTS), "published skill-domain task counts changed")

    catalogue = json.loads((ROOT / "simulators.json").read_text())["simulators"]
    entries = [item for item in catalogue if item.get("group") == "RHCSA Certification Practice"]
    require(len(entries) == 62, "catalogue must expose exactly 62 RHCSA practice tasks")
    require({item["id"] for item in entries} == {task["id"] for task in tasks}, "manifest and catalogue practice IDs differ")
    require(all(item["contentType"] == "Challenge Lab" for item in entries), "practice content type must be Challenge Lab")
    require(all(item["technology"] == "Red Hat Enterprise Linux" for item in entries), "practice technology metadata is inconsistent")

    engine = (PRACTICE / "practice-engine.js").read_text()
    core = (PRACTICE / "practice-core.js").read_text()
    css = (PRACTICE / "practice.css").read_text()
    group_index = (PRACTICE / "index.html").read_text()
    group_js = (PRACTICE / "group.js").read_text()
    require("Linux Challenge Champion" in engine, "certificate designation is missing")
    require("RCW IT Training" in engine and "Pradeep Raju" in engine, "certificate issuer or signer is missing")
    require("application/pdf" in engine and "Download PDF certificate" in engine, "PDF certificate support is missing")
    require("score(session)" in core and "objectiveState(session)" in core and "reset" in core, "state evaluation or reset support is missing")
    require("@media (max-width: 900px)" in css and "@media (max-width: 590px)" in css, "practice UI responsive breakpoints are missing")
    require("62 original" in group_index and "taskSearch" in group_index, "practice group landing page is incomplete")
    require("rcw_rhcsa_practice_progress" in group_js, "practice group progress support is missing")
    require("registration" not in group_index.lower() and "sign in" not in group_index.lower(), "practice group must remain publicly accessible")

    portrait = PRACTICE / "assets" / "pradeep-raju.jpg"
    require(portrait.is_file() and portrait.stat().st_size > 10_000, "approved certificate portrait is missing")
    require(hashlib.sha256(portrait.read_bytes()).hexdigest() == "118cd520d49d9c260471a52611a5d39f7870161c4aa9db34690aca9c0b783b40", "certificate portrait changed")

    seen_urls = set()
    for task in tasks:
        number = task["number"]
        folder = PRACTICE / f"{number:02d}-{task['slug']}"
        require(folder.is_dir(), f"task folder missing: {folder.name}")
        for name in ("index.html", "config.js", "LAB_GUIDE.md"):
            require((folder / name).is_file(), f"{name} missing from {folder.name}")

        index = (folder / "index.html").read_text()
        guide = (folder / "LAB_GUIDE.md").read_text()
        config = load_config(folder / "config.js")
        require(config["number"] == number and config["total"] == 62, f"numbering mismatch in {folder.name}")
        require(config["id"] == task["id"] and config["title"] == task["title"], f"manifest mismatch in {folder.name}")
        require(config["domain"] == task["domain"] and config["technology"] == task["technology"], f"categorisation mismatch in {folder.name}")
        require(len(config["objectives"]) == 3, f"expected three scored objectives in {folder.name}")
        require(sum(item["points"] for item in config["objectives"]) == 100, f"score must total 100 in {folder.name}")
        require({item["id"] for item in config["objectives"]} == {"assess", "implement", "validate"}, f"objective model changed in {folder.name}")
        require(len(config["actions"]) >= 3 and len(config["workflow"]) >= 3, f"insufficient state flow in {folder.name}")
        for action in config["actions"]:
            re.compile(action["pattern"])
        require(all(fact in config["facts"] for objective in config["objectives"] for fact in objective["requires"]), f"undefined scoring fact in {folder.name}")
        require(config["objectives"][-1]["requires"] == ["verified"], f"explicit final verification missing in {folder.name}")

        expected_url = f"https://www.rcwittraining.in/rhcsa-practice/{folder.name}/"
        entry = next(item for item in entries if item["id"] == task["id"])
        require(entry["targetUrl"] == expected_url, f"catalogue URL mismatch for {folder.name}")
        require(expected_url not in seen_urls, f"duplicate practice URL: {expected_url}")
        seen_urls.add(expected_url)

        for reference in ("../../passport.js", "config.js", "../practice-core.js", "../practice-engine.js", "../practice.css"):
            require(reference in index, f"{reference} missing from {folder.name}/index.html")
        require("connect-src 'none'" in index and "object-src 'none'" in index, f"CSP controls missing in {folder.name}")
        require("not an official exam environment" in guide, f"independent-status disclaimer missing in {folder.name}")
        require("original RCW IT Training" in guide, f"original-work statement missing in {folder.name}")
        require("100 points" in guide and "Linux Challenge Champion" in guide and "Pradeep Raju" in guide, f"score or certificate details missing in {folder.name}")
        require("One valid workflow" in guide and "Verification" in guide, f"learner workflow missing in {folder.name}")
        require(not FORBIDDEN.search("\n".join((index, guide, json.dumps(config)))), f"forbidden proprietary or implementation term in {folder.name}")

    require(len(seen_urls) == 62, "practice URLs must be independent and unique")
    generated_dirs = [path for path in PRACTICE.iterdir() if path.is_dir() and re.match(r"^\d{2}-", path.name)]
    require(len(generated_dirs) == 62, f"unexpected generated practice directory count: {len(generated_dirs)}")
    print("62-task RHCSA practice manifest, catalogue, scoring, workflows, CSP, certificate, responsive UI and originality checks passed.")


if __name__ == "__main__":
    main()
