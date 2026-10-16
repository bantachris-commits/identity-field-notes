#!/usr/bin/env python3
"""Merge one-time recovery editions into data/articles.json without duplicating IDs."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ARTICLES = ROOT / "data" / "articles.json"
RECOVERY = ROOT / "data" / "recovery-2026-10.json"

articles = json.loads(ARTICLES.read_text(encoding="utf-8"))
recovery = json.loads(RECOVERY.read_text(encoding="utf-8"))


def normalize_story(story):
    # Keep recovery sources specific so the normal site validator can enforce
    # the same "receipts, not homepages" rule used for generated editions.
    if story.get("url") == "https://status.delinea.com/":
        story["url"] = "https://isdown.app/status/delinea/incidents/669426-platform-sso-login-failures-on-delinea-platform-us-eu-uk-ca-au-sea-and-uae"
        story["source"] = "Delinea incident record via IsDown"
        story["confidence"] = "Independent reporting"
    if (story.get("url") == "https://www.crowdstrike.com/en-us/blog/"
            and "October security release" in story.get("title", "")):
        story["url"] = "https://www.crowdstrike.com/en-us/blog/patch-tuesday-analysis-october-2026/"


for item in recovery:
    for story in item.get("stories", []):
        normalize_story(story)
for item in articles:
    for story in item.get("stories", []):
        normalize_story(story)

existing = {a.get("id"): a for a in articles if a.get("id")}
added = 0
for item in recovery:
    if item.get("id") not in existing:
        articles.append(item)
        added += 1

articles.sort(key=lambda a: (a.get("date", ""), a.get("id", "")), reverse=True)
latest_non_guest = next((a for a in articles if a.get("contentType") != "guest" and not a.get("humanWritten")), None)
for a in articles:
    if a.get("contentType") != "guest" and not a.get("humanWritten"):
        a["featured"] = bool(latest_non_guest and a.get("id") == latest_non_guest.get("id"))

ARTICLES.write_text(json.dumps(articles, indent=2) + "\n", encoding="utf-8")
print(f"Recovery backfill merged: {added} edition(s) added; {len(articles)} total records.")
