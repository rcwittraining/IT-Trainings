#!/usr/bin/env python3
"""Preserve the published catalogue, add explicit metadata, and append 62 RHCSA tasks."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOGUE = ROOT / "simulators.json"
MANIFEST = ROOT / "rhcsa-practice" / "manifest.json"
PRACTICE_GROUP = "RHCSA Certification Practice"


def content_type(item: dict) -> str:
    title = item["title"].lower()
    item_id = item["id"]
    if item_id == "technical-quiz-agent":
        return "Quiz"
    if "simulator" in title or item_id == "rhel10-practice-terminal":
        return "Simulator"
    if "challenge" in title or item_id in {"production-outage-game", "linux-folder-challenge"}:
        return "Challenge"
    return "Lab"


def technology(item: dict) -> str:
    title = item["title"].lower()
    category = item.get("category", "")
    item_id = item["id"]
    if item_id == "technical-quiz-agent": return "Multi-technology"
    if item_id == "production-outage-game": return "IT Architecture"
    if "bedrock" in title or "ecs" in title or "aws" in title or category.startswith("AWS"): return "AWS"
    if "azure" in title or category.startswith("Azure") or category.startswith("Microsoft Azure"): return "Microsoft Azure"
    if "gcp" in title or "gcloud" in title or category.startswith("Google Cloud"): return "Google Cloud"
    if "on-premises llm" in title or category.startswith("Private AI"): return "Private AI"
    if "vmware" in title: return "Virtualisation"
    if "truenas" in title: return "Storage Platforms"
    if category.startswith(("RHEL", "RHEL 10", "Red Hat", "Linux")): return "Linux and RHEL"
    if category.startswith("Kubernetes"): return "Kubernetes"
    if category.startswith("Containers"): return "Containers"
    if category.startswith("DevOps"): return "DevOps"
    if category.startswith("Databases"): return "Databases"
    if category.startswith("Networking"): return "Networking"
    if category.startswith("Security"): return "Cybersecurity"
    if category.startswith("Programming"): return "Programming"
    if category.startswith("Cloud"): return "AWS"
    if category.startswith("IT Architecture"): return "IT Architecture"
    return category.split(" • ")[0] or "Infrastructure"


def subcategory(item: dict) -> str:
    parts = [part.strip() for part in item.get("category", "").split("•") if part.strip()]
    primary = technology(item)
    if len(parts) >= 2:
        ignored = {"Linux", "RHEL", "RHEL 10", "Red Hat", "AWS", "Azure", "Microsoft Azure", "GCP", "Google Cloud", "DevOps", "Programming", "Databases", "Security", "Networking", "Containers"}
        choices = [part for part in parts if part not in ignored]
        if choices:
            return choices[-1]
        return parts[-1]
    title = item["title"].lower()
    if primary == "Kubernetes": return "Cluster Operations"
    if "simulator" in title: return "Certification Practice"
    if item["id"] == "production-outage-game": return "Incident Response"
    return "Core Skills"


def group_name(item: dict) -> str:
    kind = content_type(item)
    if item["id"].startswith("rhcsa-"):
        return "RHCSA Challenges"
    if kind == "Simulator":
        return "Exam Simulators"
    if kind == "Quiz":
        return "Adaptive Learning"
    if kind == "Challenge":
        return "Hands-on Challenges"
    return "Technology Labs"


def main() -> None:
    payload = json.loads(CATALOGUE.read_text())
    existing = [item for item in payload["simulators"] if not item["id"].startswith("rhcsa-practice-")]
    if len(existing) != 118:
        raise SystemExit(f"Expected 118 preserved catalogue records, found {len(existing)}")
    original_fields = ("title", "category", "badge", "accent", "id", "targetUrl")
    original_records = [{key: item.get(key) for key in original_fields} for item in existing]
    original_digest = hashlib.sha256(json.dumps(original_records, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
    if original_digest != "2bb5de58d64aeaf4754198225d1fff5629f38aff0e85f0d445c102a6ff300cdc":
        raise SystemExit("One or more of the 118 published catalogue records changed")

    enriched = []
    for original in existing:
        item = dict(original)
        item["contentType"] = content_type(item)
        item["technology"] = technology(item)
        item["subcategory"] = subcategory(item)
        item["group"] = group_name(item)
        enriched.append(item)

    manifest = json.loads(MANIFEST.read_text())
    practice = []
    for task in manifest["tasks"]:
        practice.append({
            "title": f"RHCSA Task {task['number']:02d}: {task['title']}",
            "category": f"RHEL 10 • {task['domain']} • {task['technology']}",
            "badge": "RHCSA",
            "accent": "#1261a6",
            "id": task["id"],
            "targetUrl": f"https://www.rcwittraining.in/rhcsa-practice/{task['number']:02d}-{task['slug']}/",
            "contentType": "Challenge Lab",
            "technology": "Red Hat Enterprise Linux",
            "subcategory": task["technology"],
            "group": PRACTICE_GROUP,
            "seriesUrl": "https://www.rcwittraining.in/rhcsa-practice/",
            "taskNumber": task["number"],
        })

    output = {
        "updatedAt": "2026-08-21T12:00:00.000Z",
        "simulators": enriched + practice,
    }
    ids = [item["id"] for item in output["simulators"]]
    urls = [item["targetUrl"] for item in output["simulators"]]
    if len(ids) != 180 or len(ids) != len(set(ids)) or len(urls) != len(set(urls)):
        raise SystemExit("Catalogue uniqueness or count validation failed")
    CATALOGUE.write_text(json.dumps(output, indent=2, ensure_ascii=False) + "\n")
    (ROOT / "catalogue-data.js").write_text(
        "window.RCW_CATALOGUE = Object.freeze(" +
        json.dumps(output["simulators"], indent=2, ensure_ascii=False) +
        ");\n"
    )
    print(f"Preserved {len(enriched)} existing records and added {len(practice)} RHCSA practice tasks")


if __name__ == "__main__":
    main()
