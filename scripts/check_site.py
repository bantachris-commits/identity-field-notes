#!/usr/bin/env python3
"""Fail on broken local links/assets, missing anchors, malformed JSON, or duplicate content IDs."""
from __future__ import annotations

import json
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlparse

ROOT = Path(__file__).resolve().parents[1]
IGNORE_SCHEMES = {"mailto", "tel", "javascript", "data"}


class PageParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ids: set[str] = set()
        self.refs: list[tuple[str, str]] = []

    def handle_starttag(self, tag, attrs):
        d = dict(attrs)
        if d.get("id"):
            self.ids.add(d["id"])
        for attr in ("href", "src", "action"):
            value = d.get(attr)
            if value:
                self.refs.append((f"{tag}[{attr}]", value))


def page_info(path: Path):
    parser = PageParser()
    parser.feed(path.read_text(encoding="utf-8"))
    return parser


def local_target(source: Path, raw: str):
    p = urlparse(raw)
    if p.scheme in IGNORE_SCHEMES or p.scheme in {"http", "https"} or p.netloc:
        return None
    path = unquote(p.path)
    if not path:
        target = source
    elif path.startswith("/"):
        target = ROOT / path.lstrip("/")
    else:
        target = source.parent / path
    if path.endswith("/"):
        target = target / "index.html"
    return target.resolve(), p.fragment


def rel(path: Path) -> str:
    try:
        return str(path.relative_to(ROOT))
    except ValueError:
        return str(path)


def main():
    errors: list[str] = []
    html_files = sorted(ROOT.glob("*.html"))
    parsed = {p.resolve(): page_info(p) for p in html_files}

    for page, info in parsed.items():
        for kind, raw in info.refs:
            target_info = local_target(page, raw)
            if target_info is None:
                continue
            target, fragment = target_info
            if not target.exists():
                errors.append(f"{rel(page)}: {kind} -> {raw!r} targets missing {rel(target)}")
                continue
            if fragment and target.suffix.lower() == ".html":
                target_parser = parsed.get(target)
                if target_parser is None:
                    target_parser = page_info(target)
                    parsed[target] = target_parser
                if fragment not in target_parser.ids:
                    errors.append(f"{rel(page)}: {kind} -> {raw!r} targets missing #{fragment} in {rel(target)}")

    json_files = sorted((ROOT / "data").glob("*.json"))
    parsed_json = {}
    for path in json_files:
        try:
            parsed_json[path.name] = json.loads(path.read_text(encoding="utf-8"))
        except Exception as exc:
            errors.append(f"{rel(path)}: invalid JSON: {exc}")

    try:
        json.loads((ROOT / "manifest.webmanifest").read_text(encoding="utf-8"))
    except Exception as exc:
        errors.append(f"manifest.webmanifest: invalid JSON: {exc}")

    articles = parsed_json.get("articles.json", [])
    if isinstance(articles, list):
        ids = [a.get("id") for a in articles if isinstance(a, dict)]
        dupes = sorted({x for x in ids if x and ids.count(x) > 1})
        if dupes:
            errors.append(f"data/articles.json: duplicate article ids: {', '.join(dupes)}")
        for i, a in enumerate(articles):
            if not isinstance(a, dict):
                errors.append(f"data/articles.json[{i}]: article must be an object")
                continue
            for field in ("id", "date", "title", "dek", "stories"):
                if not a.get(field):
                    errors.append(f"data/articles.json[{i}]: missing {field}")
            if isinstance(a.get("stories"), list):
                for j, story in enumerate(a["stories"]):
                    if not isinstance(story, dict):
                        errors.append(f"data/articles.json[{i}].stories[{j}]: story must be an object")
                        continue
                    for field in ("title", "summary", "why", "source", "url"):
                        if not story.get(field):
                            errors.append(f"data/articles.json[{i}].stories[{j}]: missing {field}")

    events = parsed_json.get("events.json", [])
    if isinstance(events, list):
        ids = [e.get("id") for e in events if isinstance(e, dict) and e.get("id")]
        dupes = sorted({x for x in ids if ids.count(x) > 1})
        if dupes:
            errors.append(f"data/events.json: duplicate event ids: {', '.join(dupes)}")
        for i, event in enumerate(events):
            if not isinstance(event, dict):
                errors.append(f"data/events.json[{i}]: event must be an object")
                continue
            for field in ("name", "date", "url"):
                if not event.get(field):
                    errors.append(f"data/events.json[{i}]: missing {field}")

    if errors:
        print("SITE INTEGRITY CHECK FAILED")
        for error in errors:
            print(" -", error)
        raise SystemExit(1)

    print(f"Site integrity OK: {len(html_files)} HTML pages, {len(json_files)} data files checked.")


if __name__ == "__main__":
    main()
