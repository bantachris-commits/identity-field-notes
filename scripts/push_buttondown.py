#!/usr/bin/env python3
"""Create or update a Buttondown digest from the newest non-guest Field Note.

Required: BUTTONDOWN_API_KEY
Optional: BUTTONDOWN_MODE=draft|send (default draft)
Optional: BUTTONDOWN_PREVIEW=true to create/update a separate, never-sent preview draft.

The manual GitHub workflow named "Create email digest draft" is automatically
preview mode. Normal weekday publishing keeps the real edition slug and duplicate
protection.
"""
import html
import json
import os
import re
from datetime import datetime
from pathlib import Path
from urllib.parse import urljoin

import requests

ROOT = Path(__file__).resolve().parents[1]
SITE = "https://identityfieldnotes.com/"
NAVY = "#102934"
AMBER = "#d18b18"
TEAL = "#0b5e68"
MUTED = "#5f6b6f"
CANVAS = "#e9eff1"
SHEET = "#ffffff"
COOL = "#f3f7f8"
COOL_2 = "#eaf1f2"
LINE = "#d6e0e2"
WARM_TAG = "#fff5df"
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


def e(value):
    return html.escape(str(value or ""), quote=True)


article = next((x for x in articles if x.get("featured") and not is_guest(x)), None)
if article is None:
    article = next((x for x in articles if not is_guest(x)), None)
if article is None:
    raise SystemExit("No non-guest Field Note found for the digest")

stories = article.get("stories") or []
canonical = f"{SITE}article.html?id={article['id']}"
slug = f"{article['id']}-preview" if preview else article["id"]
subject_prefix = "[PREVIEW] " if preview else ""
digest_date = human_date(article.get("date", ""))

try:
    events = json.loads((ROOT / "data" / "events.json").read_text(encoding="utf-8"))
except Exception:
    events = []
article_date = article.get("date") or ""
upcoming_events = [x for x in events if (x.get("date") or "") >= article_date][:3]

parts = [
    '<!-- buttondown-editor-mode: fancy -->',
    f'''<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="{CANVAS}" style="width:100%;background:{CANVAS};border-collapse:collapse;">
<tr><td style="padding:18px 14px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="{SHEET}" style="width:100%;background:{SHEET};border:1px solid {LINE};border-collapse:collapse;">
<tr><td style="padding:22px 20px;">''',
    f'''<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px 0;border-collapse:collapse;background:#ffffff;">
<tr><td style="padding:0 0 8px 0;border-bottom:1px solid {LINE};font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:1.35;font-weight:800;letter-spacing:1.15px;color:{AMBER};text-transform:uppercase;">AI-DRIVEN · SOURCE-LINKED · COMMUNITY-CORRECTED</td></tr>
<tr><td style="padding:18px 0 14px 0;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr>
<td width="56" valign="middle"><div style="width:42px;height:42px;line-height:42px;text-align:center;background:{AMBER};color:{NAVY};font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:800;letter-spacing:1px;">IFN</div></td>
<td valign="middle"><div style="font-family:Georgia,Times New Roman,serif;font-size:28px;line-height:1.08;font-weight:700;color:{NAVY};">Identity Field Notes</div><div style="font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:1.35;font-weight:700;letter-spacing:1.05px;color:{MUTED};text-transform:uppercase;margin-top:5px;">The AI-driven practitioner brief</div></td>
<td valign="middle" align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.4;color:{MUTED};white-space:nowrap;">{e(digest_date)}</td>
</tr></table>
</td></tr>
<tr><td style="border-top:4px solid {NAVY};padding:9px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:1.45;font-weight:700;letter-spacing:.65px;color:{MUTED};text-transform:uppercase;">PAM · IAM · IGA · NHI · ITDR · AUTHZ &nbsp; <span style="color:{TEAL};">//</span> &nbsp; I burn the tokens so you don&apos;t have to.</td></tr>
</table>''',
    f'''<div style="background:{COOL};border:1px solid {LINE};border-left:4px solid {NAVY};padding:16px 18px;margin:0 0 28px 0;">
<div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:800;letter-spacing:1px;color:{NAVY};text-transform:uppercase;margin-bottom:10px;">TL;DR // 60-second brief</div>''',
    '<ul style="margin:0;padding-left:20px;">',
]

if stories:
    for story in stories:
        kicker = story.get("kicker") or "Identity Security"
        title = story.get("title") or "Untitled story"
        parts.append(f'<li style="margin:0 0 9px 0;line-height:1.45;color:#202a2e;"><strong style="color:{NAVY};">{e(kicker)}:</strong> {e(title)}</li>')
else:
    parts.append('<li>Quiet morning. No story made the cut.</li>')
parts += ['</ul></div>']

for index, story in enumerate(stories, 1):
    kicker = story.get("kicker") or "Identity Security"
    confidence = story.get("confidence") or "Source-linked"
    title = story.get("title") or "Untitled story"
    summary = story.get("summary") or ""
    why = story.get("why") or ""
    source = story.get("source") or "Original source"
    source_url = urljoin(SITE, story.get("url") or canonical)

    parts += [
        f'''<div style="margin:0 0 8px 0;"><span style="display:inline-block;background:{WARM_TAG};border:1px solid #ecd19b;padding:4px 7px;font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:800;letter-spacing:.8px;color:#8a5d0a;text-transform:uppercase;">{e(kicker)}</span><span style="font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:700;letter-spacing:.6px;color:{MUTED};text-transform:uppercase;margin-left:7px;">{e(confidence)}</span></div>''',
        f'<h2 style="font-family:Georgia,Times New Roman,serif;font-size:23px;line-height:1.25;color:{NAVY};margin:0 0 12px 0;">{index}. {e(title)}</h2>',
        f'<p style="font-size:16px;line-height:1.62;color:#202a2e;margin:0 0 14px 0;">{e(summary)}</p>',
    ]
    if why:
        parts.append(f'''<div style="background:#f8fbfb;border:1px solid {LINE};border-left:4px solid {TEAL};padding:12px 15px;margin:15px 0 17px 0;line-height:1.55;color:#202a2e;">
<strong style="color:{NAVY};">Why it matters:</strong> {e(why)}
</div>''')
    parts += [
        f'<p style="margin:0 0 26px 0;"><a href="{e(source_url)}" style="color:{TEAL};font-weight:700;text-decoration:underline;">Original source — {e(source)} ↗</a></p>',
        f'<div style="height:1px;background:{LINE};margin:0 0 28px 0;"></div>',
    ]

if upcoming_events:
    parts += [
        f'''<div style="background:#f7fafb;border:1px solid {LINE};border-top:3px solid {TEAL};padding:18px 18px 8px 18px;margin:0 0 28px 0;">
<div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:800;letter-spacing:1px;color:{NAVY};text-transform:uppercase;margin-bottom:5px;">Upcoming conferences</div>
<p style="margin:0 0 15px 0;color:{MUTED};">A few identity events coming up soon.</p>'''
    ]
    for event in upcoming_events:
        eid = event_id(event)
        event_url = event.get("url") or f"{SITE}events.html#{eid}"
        discuss_url = f"{SITE}events.html#{eid}"
        parts.append(f'''<div style="padding:0 0 14px 0;margin:0 0 14px 0;border-bottom:1px solid {LINE};">
<div style="font-weight:700;color:{NAVY};"><a href="{e(event_url)}" style="color:{NAVY};text-decoration:none;">{e(event.get('name', 'Identity event'))}</a></div>
<div style="font-size:14px;line-height:1.5;color:{MUTED};margin-top:4px;">{e(event_date(event))} · {e(event.get('location', 'Location TBA'))}</div>
<div style="margin-top:6px;"><a href="{e(discuss_url)}" style="color:{TEAL};font-weight:700;">Discuss with attendees on IFN →</a></div>
</div>''')
    parts.append('</div>')

parts += [
    f'''<div style="background:{NAVY};padding:18px 20px;margin:0 0 18px 0;color:#ffffff;">
<div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:800;letter-spacing:1px;color:{AMBER};text-transform:uppercase;margin-bottom:8px;">From the field</div>
<div style="font-size:15px;line-height:1.55;">Something missing, overstated, or wrong? Add evidence, field experience, or a correction directly under the story.</div>
<div style="margin-top:12px;"><a href="{e(canonical)}" style="color:#ffffff;font-weight:700;text-decoration:underline;">Read and discuss today&apos;s digest on Identity Field Notes →</a></div>
</div>''',
    f'<p style="font-size:12px;line-height:1.5;color:{MUTED};"><strong>Source first. AI summary second.</strong><br>{e(article.get("disclosure") or "This digest is AI-generated from linked sources. Verify important details at the original source.")}</p>',
    '</td></tr></table></td></tr></table>',
]

body = "\n".join(parts)
headers = {"Authorization": f"Token {key}", "Content-Type": "application/json"}
payload = {
    "subject": f"{subject_prefix}Identity Field Notes // {digest_date}",
    "slug": slug,
    "body": body,
    "canonical_url": canonical,
    "description": f"Today's identity-security digest for {digest_date}.",
    "commenting_mode": "disabled",
    "status": "draft",
    "template": "classic",
    "metadata": {
        "identity_field_notes_id": article["id"],
        "identity_field_notes_format": "morning-digest-v8",
        "identity_field_notes_preview": "true" if preview else "false",
    },
}

listing = requests.get("https://api.buttondown.com/v1/emails", headers=headers, timeout=30)
listing.raise_for_status()
existing = next((x for x in listing.json().get("results", []) if x.get("slug") == slug), None)
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
