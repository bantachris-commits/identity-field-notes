#!/usr/bin/env python3
"""Fail on broken local links/assets, malformed data, duplicate IDs, or generic editorial source URLs."""
from __future__ import annotations
import json
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote,urlparse

ROOT=Path(__file__).resolve().parents[1]
IGNORE_SCHEMES={"mailto","tel","javascript","data"}
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

def local_target(source,raw):
    p=urlparse(raw)
    if p.scheme in IGNORE_SCHEMES or p.scheme in {"http","https"} or p.netloc:return None
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
        if isinstance(a.get("stories"),list):
            for j,story in enumerate(a["stories"]):
                if not isinstance(story,dict):errors.append(f"data/{name}[{i}].stories[{j}]: story must be an object");continue
                for field in ("title","summary","why","source","url"):
                    if not story.get(field):errors.append(f"data/{name}[{i}].stories[{j}]: missing {field}")
                if generic_source(story.get("url")):errors.append(f"data/{name}[{i}].stories[{j}]: generic source URL {story.get('url')}")

def main():
    errors=[]
    html_files=sorted(ROOT.glob("*.html"));parsed={p.resolve():page_info(p) for p in html_files}
    for page,info in parsed.items():
        for kind,raw in info.refs:
            target_info=local_target(page,raw)
            if target_info is None:continue
            target,fragment=target_info
            if not target.exists():errors.append(f"{rel(page)}: {kind} -> {raw!r} targets missing {rel(target)}");continue
            if fragment and target.suffix.lower()==".html":
                target_parser=parsed.get(target) or page_info(target);parsed[target]=target_parser
                if fragment not in target_parser.ids:errors.append(f"{rel(page)}: {kind} -> {raw!r} targets missing #{fragment} in {rel(target)}")

    json_files=sorted((ROOT/"data").glob("*.json"));parsed_json={}
    for path in json_files:
        try:parsed_json[path.name]=json.loads(path.read_text(encoding="utf-8"))
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

    if errors:
        print("SITE INTEGRITY CHECK FAILED")
        for error in errors:print(" -",error)
        raise SystemExit(1)
    print(f"Site integrity OK: {len(html_files)} HTML pages, {len(json_files)} data files checked.")

if __name__=="__main__":main()
