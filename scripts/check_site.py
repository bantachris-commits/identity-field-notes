#!/usr/bin/env python3
"""Fail on broken local links/assets, malformed data, unsafe URLs, duplicate IDs, or generic editorial source URLs."""
from __future__ import annotations
import json
import re
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote,urlparse

ROOT=Path(__file__).resolve().parents[1]
IGNORED_SCHEMES={"mailto","tel"}
FORBIDDEN_SCHEMES={"javascript","data","vbscript","file"}
GENERIC_PATHS={"","/","/blog","/newsroom","/newsroom/press-releases","/press-releases","/resources","/iam/docs/release-notes"}
GENERIC_URLS={
 "https://techcommunity.microsoft.com/category/microsoft-entra/blog/microsoft-entra-blog",
 "https://www.microsoft.com/security/blog",
 "https://www.okta.com/blog/threat-intelligence",
 "https://www.beyondtrust.com/blog",
 "https://delinea.com/blog",
 "https://docs.cloud.google.com/iam/docs/release-notes",
}

class PageParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True);self.ids=set();self.refs=[]
    def handle_starttag(self,tag,attrs):
        d=dict(attrs)
        if d.get("id"):self.ids.add(d["id"])
        for attr in ("href","src","action"):
            if d.get(attr):self.refs.append((f"{tag}[{attr}]",d[attr]))

def page_info(path):
    p=PageParser();p.feed(path.read_text(encoding="utf-8"));return p

def scheme(raw):
    try:return urlparse(str(raw or "").strip()).scheme.lower()
    except Exception:return ""

def forbidden_url(raw):
    return scheme(raw) in FORBIDDEN_SCHEMES

def valid_http_url(raw):
    try:
        p=urlparse(str(raw or "").strip())
        return p.scheme.lower() in {"http","https"} and bool(p.netloc)
    except Exception:return False

def safe_story_url(raw):
    """Stories may link to an HTTP(S) source or a local IFN page, never an active/opaque scheme."""
    value=str(raw or "").strip()
    if not value:return False
    try:
        p=urlparse(value)
    except Exception:return False
    if p.scheme.lower() in FORBIDDEN_SCHEMES:return False
    if p.scheme:return p.scheme.lower() in {"http","https"} and bool(p.netloc)
    if p.netloc:return False
    return True

def local_target(source,raw):
    p=urlparse(raw)
    if p.scheme.lower() in IGNORED_SCHEMES or p.scheme.lower() in {"http","https"} or p.netloc:return None
    if p.scheme:return None
    path=unquote(p.path)
    target=source if not path else (ROOT/path.lstrip("/") if path.startswith("/") else source.parent/path)
    if path.endswith("/"):target=target/"index.html"
    return target.resolve(),p.fragment

def rel(path):
    try:return str(path.relative_to(ROOT))
    except ValueError:return str(path)

def generic_source(raw):
    p=urlparse(str(raw or ""))
    if p.scheme not in {"http","https"}:return False
    normalized=f"{p.scheme}://{p.netloc}{p.path}".rstrip('/').lower()
    if normalized in {x.rstrip('/').lower() for x in GENERIC_URLS}:return True
    return p.path.rstrip('/').lower() in GENERIC_PATHS

def scan_json_urls(errors,name,value,path="$"):
    """Catch dangerous schemes anywhere JSON uses a URL-like field."""
    if isinstance(value,dict):
        for key,item in value.items():
            child=f"{path}.{key}"
            if key.lower() in {"url","author_url","rss","href","src","action"} and isinstance(item,str) and item.strip() and forbidden_url(item):
                errors.append(f"data/{name} {child}: forbidden URL scheme {scheme(item)!r}")
            scan_json_urls(errors,name,item,child)
    elif isinstance(value,list):
        for i,item in enumerate(value):scan_json_urls(errors,name,item,f"{path}[{i}]")

def validate_notes(errors,name,items,require_featured=False):
    if not isinstance(items,list):
        errors.append(f"data/{name}: expected a list");return
    ids=[a.get("id") for a in items if isinstance(a,dict)]
    dupes=sorted({x for x in ids if x and ids.count(x)>1})
    if dupes:errors.append(f"data/{name}: duplicate ids: {', '.join(dupes)}")
    if require_featured:
        featured=sum(1 for a in items if isinstance(a,dict) and a.get('featured'))
        if featured!=1:errors.append(f"data/{name}: expected exactly one featured article, found {featured}")
    for i,a in enumerate(items):
        if not isinstance(a,dict):errors.append(f"data/{name}[{i}]: note must be an object");continue
        for field in ("id","date","title","dek","stories"):
            if not a.get(field):errors.append(f"data/{name}[{i}]: missing {field}")
        author=a.get("author") or {}
        if isinstance(author,dict) and author.get("url") and not valid_http_url(author.get("url")):
            errors.append(f"data/{name}[{i}].author.url: expected http/https URL")
        if isinstance(a.get("stories"),list):
            for j,story in enumerate(a["stories"]):
                if not isinstance(story,dict):errors.append(f"data/{name}[{i}].stories[{j}]: story must be an object");continue
                for field in ("title","summary","why","source","url"):
                    if not story.get(field):errors.append(f"data/{name}[{i}].stories[{j}]: missing {field}")
                if story.get("url") and not safe_story_url(story.get("url")):
                    errors.append(f"data/{name}[{i}].stories[{j}]: unsafe source URL {story.get('url')!r}")
                if generic_source(story.get("url")):errors.append(f"data/{name}[{i}].stories[{j}]: generic source URL {story.get('url')}")

def require_http_fields(errors,name,items,field="url"):
    if not isinstance(items,list):return
    for i,item in enumerate(items):
        if not isinstance(item,dict):continue
        value=item.get(field)
        if value and not valid_http_url(value):errors.append(f"data/{name}[{i}].{field}: expected http/https URL")

def main():
    errors=[]
    html_files=sorted(ROOT.glob("*.html"));parsed={p.resolve():page_info(p) for p in html_files}
    for page,info in parsed.items():
        for kind,raw in info.refs:
            if forbidden_url(raw):
                errors.append(f"{rel(page)}: {kind} -> {raw!r} uses forbidden {scheme(raw)}: scheme")
                continue
            target_info=local_target(page,raw)
            if target_info is None:continue
            target,fragment=target_info
            if not target.exists():errors.append(f"{rel(page)}: {kind} -> {raw!r} targets missing {rel(target)}");continue
            if fragment and target.suffix.lower()==".html":
                target_parser=parsed.get(target) or page_info(target);parsed[target]=target_parser
                if fragment not in target_parser.ids:errors.append(f"{rel(page)}: {kind} -> {raw!r} targets missing #{fragment} in {rel(target)}")

    json_files=sorted((ROOT/"data").glob("*.json"));parsed_json={}
    for path in json_files:
        try:
            parsed_json[path.name]=json.loads(path.read_text(encoding="utf-8"))
            scan_json_urls(errors,path.name,parsed_json[path.name])
        except Exception as exc:errors.append(f"{rel(path)}: invalid JSON: {exc}")
    try:json.loads((ROOT/"manifest.webmanifest").read_text(encoding="utf-8"))
    except Exception as exc:errors.append(f"manifest.webmanifest: invalid JSON: {exc}")

    validate_notes(errors,"articles.json",parsed_json.get("articles.json",[]),require_featured=True)
    validate_notes(errors,"market-archive.json",parsed_json.get("market-archive.json",[]))

    radar=parsed_json.get("radar.json",[])
    if isinstance(radar,list):
        urls=[]
        for i,item in enumerate(radar):
            if not isinstance(item,dict):errors.append(f"data/radar.json[{i}]: item must be an object");continue
            for field in ("date","title","source","url","note","score"):
                if item.get(field) in (None,""):errors.append(f"data/radar.json[{i}]: missing {field}")
            for field in ("source","title","note"):
                text=str(item.get(field) or "")
                if re.search(r"&(?:amp;)?(?:lt|gt|#?\w+);|<\/?[a-z](?:[^>]*>|[^>]*$)|\\[*#\[]",text,re.I):
                    errors.append(f"data/radar.json[{i}].{field}: contains encoded HTML or escaped Markdown")
            if item.get("url") and not valid_http_url(item.get("url")):errors.append(f"data/radar.json[{i}]: expected http/https source URL {item.get('url')!r}")
            if generic_source(item.get("url")):errors.append(f"data/radar.json[{i}]: generic source URL {item.get('url')}")
            if item.get('url'):urls.append(item['url'].rstrip('/').lower())
        dupes=sorted({u for u in urls if urls.count(u)>1})
        if dupes:errors.append(f"data/radar.json: duplicate URLs: {', '.join(dupes)}")

    events=parsed_json.get("events.json",[])
    if isinstance(events,list):
        ids=[e.get("id") for e in events if isinstance(e,dict) and e.get("id")];dupes=sorted({x for x in ids if ids.count(x)>1})
        if dupes:errors.append(f"data/events.json: duplicate event ids: {', '.join(dupes)}")
        for i,event in enumerate(events):
            if not isinstance(event,dict):errors.append(f"data/events.json[{i}]: event must be an object");continue
            for field in ("id","name","date","url"):
                if not event.get(field):errors.append(f"data/events.json[{i}]: missing {field}")
    require_http_fields(errors,"events.json",events)
    require_http_fields(errors,"training.json",parsed_json.get("training.json",[]))
    require_http_fields(errors,"jobs.json",parsed_json.get("jobs.json",[]))

    sources=parsed_json.get("sources.json",{}).get("sources",[]) if isinstance(parsed_json.get("sources.json",{}),dict) else []
    require_http_fields(errors,"sources.json",sources)
    for i,item in enumerate(sources):
        if isinstance(item,dict) and item.get("rss") and not valid_http_url(item.get("rss")):
            errors.append(f"data/sources.json[{i}].rss: expected http/https URL")

    feeds=parsed_json.get("feed-sources.json",{}).get("feeds",[]) if isinstance(parsed_json.get("feed-sources.json",{}),dict) else []
    require_http_fields(errors,"feed-sources.json",feeds)

    if errors:
        print("SITE INTEGRITY CHECK FAILED")
        for error in errors:print(" -",error)
        raise SystemExit(1)
    print(f"Site integrity OK: {len(html_files)} HTML pages, {len(json_files)} data files checked.")

if __name__=="__main__":main()
