#!/usr/bin/env python3
"""Low-cost RSS supplement for Identity Radar."""
import json, hashlib, datetime, html, re
from pathlib import Path
from urllib.parse import urlparse
import feedparser

ROOT=Path(__file__).resolve().parents[1]
sources=json.loads((ROOT/'data'/'feed-sources.json').read_text(encoding='utf-8'))
path=ROOT/'data'/'radar.json'; items=json.loads(path.read_text(encoding='utf-8')) if path.exists() else []

def specific_url(raw):
    try:
        p=urlparse(str(raw or '').strip())
        return p.scheme in ('http','https') and bool(p.netloc)
    except Exception:
        return False

def plain_text(raw):
    text=html.unescape(str(raw or ''))
    text=re.sub(r'<[^>]+>',' ',text)
    text=html.unescape(text)
    return re.sub(r'\s+',' ',text).strip()

# Heal previously collected RSS content as well as new entries. This keeps the
# stored JSON clean even if an older feed supplied entity-encoded HTML.
for item in items:
    if not isinstance(item,dict):continue
    if item.get('title'):item['title']=plain_text(item['title'])
    if item.get('note'):item['note']=plain_text(item['note'])

seen={x['id'] for x in items if isinstance(x,dict) and x.get('id')}
for src in sources['feeds']:
    if not src.get('enabled',True):continue
    feed=feedparser.parse(src['url'])
    for e in feed.entries[:20]:
        url=str(e.get('link','') or '').strip();title=plain_text(e.get('title',''))
        if not specific_url(url) or not title:continue
        ident=hashlib.sha1(url.encode()).hexdigest()[:16]
        if ident in seen:continue
        clean=plain_text(e.get('summary',''))
        items.append({'id':ident,'date':datetime.date.today().isoformat(),'source':src['name'],'title':title,'url':url,'tags':src.get('tags',[]),'note':clean[:340] or 'New source item collected by RSS.','score':65})
        seen.add(ident)
items=items[-300:]
items.sort(key=lambda x:(x.get('date',''),x.get('score',0)),reverse=True)
path.write_text(json.dumps(items,indent=2)+"\n",encoding='utf-8')
print(f'Radar: {len(items)} items')
