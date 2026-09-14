"""Normalize untrusted Radar text from RSS feeds and model output."""
import html
import re


def plain_text(raw):
    """Return readable text from nested entities, HTML, or escaped Markdown."""
    text = str(raw or "")

    # Some feeds encode their HTML more than once (for example &amp;lt;p&amp;gt;).
    for _ in range(4):
        decoded = html.unescape(text)
        if decoded == text:
            break
        text = decoded

    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"<[^>]*$", " ", text)
    text = re.sub(r"\\([\\`*_{}\[\]()#+.!>-])", r"\1", text)
    text = re.sub(r"!\[([^]]*)\]\([^)]*\)", r"\1", text)
    text = re.sub(r"\[([^]]+)\]\([^)]*\)", r"\1", text)
    text = re.sub(r"(?:^|\s)#{1,6}\s*", " ", text)
    text = text.replace("**", "").replace("__", "").replace("`", "")
    text = re.sub(r"\)(?=\s|$)", "", text)
    return re.sub(r"\s+", " ", text).strip()


def normalize_item(item):
    if not isinstance(item, dict):
        return item
    cleaned = dict(item)
    for field in ("source", "title", "note"):
        if field in cleaned:
            cleaned[field] = plain_text(cleaned[field])
    return cleaned
