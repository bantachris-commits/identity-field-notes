#!/usr/bin/env python3
"""Create or update a Buttondown digest from the newest non-guest Field Note.

Required: BUTTONDOWN_API_KEY
Optional: BUTTONDOWN_MODE=draft|send (default draft)
Optional: BUTTONDOWN_PREVIEW=true to create/update a separate, never-sent preview draft.

The manual GitHub workflow named "Create email digest draft" is automatically
preview mode. Normal weekday publishing keeps the real edition slug and duplicate
protection.
"""
import json
import os
import re
from datetime import datetime
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
workflow_name = os.getenv("GITHUB_WORKFLOW", "").strip().lower()
preview_flag = os.getenv("BUTTONDOWN_PREVIEW", "").strip().lower() in {"1", "true", "yes", "on"}
preview = preview_flag or workflow_name in {"create email digest draft", "create email digest preview"}
if preview:
    mode = "draft"

articles = json.loads((ROOT / "data" / "articles.json").read_text(encoding="utf-8"))

def is_guest(article):
    return article.get("contentType") == "guest" or article.get("humanWritten") is True

def human_date(value):
    try:
        d = datetime.strptime(value, "%Y-%m-%d")
        return f"{d.strftime('%B')} {d.day}, {d.year}"
    except Exception:
        return value

def slugify(value):
    value = re.sub(r"[^a-z0-9]+", "-", str(value or "").lower()).strip("-")
    return value[:80] or "event"

def event_id(event):
    return event.get("id") or f"{event.get('date', 'event')}-{slugify(event.get('name'))}"

def event_date(event):
    start = event.get("date") or ""
    end = event.get("end") or ""
    if not end or end == start:
        return human_date(start)
    try:
        a = datetime.strptime(start, "%Y-%m-%d")
        b = datetime.strptime(end, "%Y-%m-%d")
        if a.year == b.year and a.month == b.month:
            return f"{a.strftime('%B')} {a.day}-{b.day}, {a.year}"
    except Exception:
        pass
    return f"{human_date(start)} - {human_date(end)}"

article = next((x for x in articles if x.get("featured") and not is_guest(x)), None)
if article is None:
    article = next((x for x in articles if not is_guest(x)), None)
if article is None:
    raise SystemExit("No non-guest Field Note found for the digest")

stories = article.get("stories") or []
canonical = f"{SITE}article.html?id={article['id']}"
slug = f"{article['id']}-preview" if preview else article["id"]
subject_prefix = "[PREVIEW] " if preview else ""

try:
    events = json.loads((ROOT / "data" / "events.json").read_text(encoding="utf-8"))
except Exception:
    events = []
article_date = article.get("date") or ""
upcoming_events = [x for x in events if (x.get("date") or "") >= article_date][:3]

lines = [
    "# Identity Field Notes",
    "",
    f"Here's your identity-security digest for **{human_date(article.get('date', ''))}**.",
    "",
    "## TL;DR // 60-second brief",
    "",
]

if stories:
    for story in stories:
        kicker = story.get("kicker") or "Identity Security"
        title = story.get("title") or "Untitled story"
        lines.append(f"- **{kicker}: {title}**")
else:
    lines.append("- Quiet morning. No story made the cut.")

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

if upcoming_events:
    lines += ["## Upcoming conferences", "", "A few identity events coming up soon:", ""]
    for event in upcoming_events:
        eid = event_id(event)
        event_url = event.get("url") or f"{SITE}events.html#{eid}"
        discuss_url = f"{SITE}events.html#{eid}"
        lines += [
            f"- **[{event.get('name', 'Identity event')}]({event_url})** · {event_date(event)} · {event.get('location', 'Location TBA')}",
            f"  [Discuss with attendees on IFN]({discuss_url})",
        ]
    lines += ["", "---", ""]

lines += [
    "## From the field",
    "",
    "Something missing, overstated, or wrong? Add evidence, field experience, or a correction directly under the story.",
    "",
    f"[Read and discuss today's digest on Identity Field Notes]({canonical})",
    "",
    "**Source first. AI summary second.**",
    "",
    f"**AI disclosure:** {article.get('disclosure') or 'This digest is AI-generated from linked sources. Verify important details at the original source.'}",
]

body = "\n".join(lines)
headers = {"Authorization": f"Token {key}", "Content-Type": "application/json"}
payload = {
    "subject": f"{subject_prefix}IFN // {article['title']}",
    "slug": slug,
    "body": body,
    "canonical_url": canonical,
    "description": article.get("dek", ""),
    "commenting_mode": "disabled",
    "status": "draft",
    "metadata": {
        "identity_field_notes_id": article["id"],
        "identity_field_notes_format": "morning-digest-v3",
        "identity_field_notes_preview": "true" if preview else "false",
    },
}

listing = requests.get("https://api.buttondown.com/v1/emails", headers=headers, timeout=30)
listing.raise_for_status()
existing = next((e for e in listing.json().get("results", []) if e.get("slug") == slug), None)
if existing and existing.get("status") == "sent":
    if preview:
        raise SystemExit("The preview copy was manually sent in Buttondown. Delete it or change its slug before regenerating a preview.")
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
    print("Updated Buttondown preview draft" if preview else "Updated existing Buttondown draft", email_id)
else:
    response = requests.post(
        "https://api.buttondown.com/v1/emails",
        headers=headers,
        json=payload,
        timeout=30,
    )
    response.raise_for_status()
    email_id = response.json()["id"]
    print("Created Buttondown preview draft" if preview else "Created Buttondown email", email_id)

if mode == "send":
    publish = requests.post(
        f"https://api.buttondown.com/v1/emails/{email_id}/publish",
        headers=headers,
        json={},
        timeout=30,
    )
    publish.raise_for_status()
    print("Published Buttondown email")
elif preview:
    print("Preview mode: left as a separate draft and cannot auto-send.")
else:
    print("Left as draft. Set BUTTONDOWN_MODE=send to publish automatically.")
