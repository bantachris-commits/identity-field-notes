#!/usr/bin/env python3
"""Probe external URLs used by the public site.

Hard 404/410 responses fail. Auth walls, rate limits, bot blocks, and transient network
errors are reported as warnings because they do not necessarily mean a human-facing
link is broken.
"""
from __future__ import annotations

import json
import ssl
import urllib.error
import urllib.request
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
TIMEOUT = 12
UA = "IdentityFieldNotes-LinkCheck/1.0 (+https://identityfieldnotes.com/)"


class LinkParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.urls: set[str] = set()

    def handle_starttag(self, tag, attrs):
        d = dict(attrs)
        for attr in ("href", "src", "action"):
            value = d.get(attr, "")
            if value.startswith(("http://", "https://")):
                self.urls.add(value)


def walk_json(value, out: set[str]):
    if isinstance(value, dict):
        for v in value.values():
            walk_json(v, out)
    elif isinstance(value, list):
        for v in value:
            walk_json(v, out)
    elif isinstance(value, str) and value.startswith(("http://", "https://")):
        out.add(value)


def collect_urls() -> list[str]:
    urls: set[str] = set()
    for path in ROOT.glob("*.html"):
        parser = LinkParser()
        parser.feed(path.read_text(encoding="utf-8"))
        urls.update(parser.urls)
    for path in (ROOT / "data").glob("*.json"):
        try:
            walk_json(json.loads(path.read_text(encoding="utf-8")), urls)
        except Exception:
            pass
    return sorted(urls)


def check(url: str):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "text/html,application/xhtml+xml,*/*;q=0.8"})
    ctx = ssl.create_default_context()
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT, context=ctx) as response:
            return response.status, None
    except urllib.error.HTTPError as exc:
        return exc.code, None
    except Exception as exc:
        return None, str(exc)


def main():
    urls = collect_urls()
    broken = []
    warnings = []
    for url in urls:
        status, error = check(url)
        host = urlparse(url).netloc
        if status in (404, 410):
            broken.append((url, f"HTTP {status}"))
        elif error:
            warnings.append((url, error))
        elif status is not None and (status in (401, 403, 405, 429) or status >= 500):
            warnings.append((url, f"HTTP {status}"))
        else:
            print(f"OK {status}: {url}")

    if warnings:
        print("\nWARNINGS (may be bot blocks, auth walls, rate limits, or transient failures):")
        for url, reason in warnings:
            print(f" - {reason}: {url}")

    if broken:
        print("\nBROKEN EXTERNAL LINKS:")
        for url, reason in broken:
            print(f" - {reason}: {url}")
        raise SystemExit(1)

    print(f"\nExternal link probe complete: {len(urls)} URLs, {len(warnings)} warnings, no hard 404/410 responses.")


if __name__ == "__main__":
    main()
