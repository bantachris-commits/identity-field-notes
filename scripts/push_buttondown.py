#!/usr/bin/env python3
"""Create or update a Buttondown digest from the newest non-guest Field Note.

Required: BUTTONDOWN_API_KEY
Optional: BUTTONDOWN_MODE=draft|send (default draft)

Draft reruns update the existing matching draft. If the edition was already
sent, the script exits without sending it again.
"""
import json
import os
from pathlib import Path
from urllib.parse import urljoin

import requests

ROOT = Path(__file__).resolve().parents[1]
SITE = "https://identityfieldnotes.com/"
key = os.getenv("BUTTONDOWN_API_KEY")
if not key:
    raise SystemExit("BUTTONDOWN_API_KEY is not set")
mode = os.getenv("BUTTONDOWN_MODE", "draft").lower()
if mode not in {"draft", "send"}:
    raise SystemExit("BUTTONDOWN_MODE must be draft or send")

articles = json.loads((ROOT / "data" / "articles.json").read_text(encoding="utf-8"))

def is_guest(article):
    return article.get("contentType") == "guest" or article.get("humanWritten") is True

article = next((x for x in articles if x.get("featured") and not is_guest(x)), None)
if article is None:
    article = next((x for x in articles if not is_guest(x)), None)
if article is None:
    raise SystemExit("No non-guest Field Note found for the digest")

stories = article.get("stories") or []
canonical = f"{SITE}article.html?id={article['id']}"
edition = article.get("edition") or f"FIELD NOTES // {article.get('date', '')}"

lines = [
    "# Identity Field Notes",
    "",
    f"**{edition}**",
    "",
    f"## {article['title']}",
    "",
    article.get("dek", ""),
    "",
    "*AI-driven identity news. I burn the tokens so you don't have to.*",
    "",
    f"[Read today's digest and join the practitioner discussion]({canonical})",
    "",
    "---",
    "",
    "## In 60 seconds",
    "",
]

if stories:
    for story in stories:
        kicker = story.get("kicker") or "Identity Security"
        title = story.get("title") or "Untitled story"
        lines.append(f"- **{kicker}: {title}**")
else:
    lines.append("- No stories were generated for this edition.")

lines += ["", "---", ""]

for index, story in enumerate(stories, 1):
    kicker = story.get("kicker") or "Identity Security"
    confidence = story.get("confidence") or "Source-linked"
    title = story.get("title") or "Untitled story"
    summary = story.get("summary") or ""
    why = story.get("why") or ""
    source = story.get("source") or "Original source"
    source_url = urljoin(SITE, story.get("url") or canonical)

    lines += [
        f"## {index}. {title}",
        "",
        f"**{kicker} · {confidence}**",
        "",
        summary,
        "",
    ]
    if why:
        lines += [f"> **Why it matters:** {why}", ""]
    lines += [f"[Original source — {source}]({source_url})", "", "---", ""]

lines += [
    "## From the field",
    "",
    "Something missing, overstated, or wrong? Add evidence, field experience, or a correction directly under the story.",
    "",
    f"[Read and discuss this edition on Identity Field Notes]({canonical})",
    "",
    "**Source first. AI summary second.**",
    "",
    f"**AI disclosure:** {article.get('disclosure') or 'This digest is AI-generated from linked sources. Verify important details at the original source.'}",
    "",
    "Identity Field Notes · IAM, PAM, IGA, NHI and identity security",
]

body = "\n".join(lines)
headers = {"Authorization": f"Token {key}", "Content-Type": "application/json"}
payload = {
    "subject": f"IFN // {article['title']}",
    "slug": article["id"],
    "body": body,
    "canonical_url": canonical,
    "description": article.get("dek", ""),
    "commenting_mode": "disabled",
    "status": "draft",
    "metadata": {
        "identity_field_notes_id": article["id"],
        "identity_field_notes_format": "morning-digest-v2",
    },
}

# Find a matching edition before creating anything. This makes manual tests safe
# and prevents a scheduled rerun from sending the same edition twice.
listing = requests.get("https://api.buttondown.com/v1/emails", headers=headers, timeout=30)
listing.raise_for_status()
existing = next((e for e in listing.json().get("results", []) if e.get("slug") == article["id"]), None)
if existing and existing.get("status") == "sent":
    print("Buttondown email already sent for", article["id"], "- refusing to send twice.")
    raise SystemExit(0)

if existing:
    email_id = existing["id"]
    response = requests.patch(
        f"https://api.buttondown.com/v1/emails/{email_id}",
        headers=headers,
        json=payload,
        timeout=30,
    )
    response.raise_for_status()
    print("Updated existing Buttondown draft", email_id)
else:
    response = requests.post(
        "https://api.buttondown.com/v1/emails",
        headers=headers,
        json=payload,
        timeout=30,
    )
    response.raise_for_status()
    email_id = response.json()["id"]
    print("Created Buttondown email", email_id)

if mode == "send":
    publish = requests.post(
        f"https://api.buttondown.com/v1/emails/{email_id}/publish",
        headers=headers,
        json={},
        timeout=30,
    )
    publish.raise_for_status()
    print("Published Buttondown email")
else:
    print("Left as draft. Set BUTTONDOWN_MODE=send to publish automatically.")
