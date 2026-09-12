#!/usr/bin/env python3
"""Low-cost RSS supplement for Identity Radar."""
import json, hashlib, datetime, html, re
from pathlib import Path
import feedparser
ROOT=Path(__file__).resolve().parents[1]
sources=json.loads((ROOT/'data'/'feed-sources.json').read_text(encoding='utf-8'))
path=ROOT/'data'/'radar.json'; items=json.loads(path.read_text(encoding='utf-8')) if path.exists() else []
seen={x['id'] for x in items}
for src in sources['feeds']:
    if not src.get('enabled',True):continue
    feed=feedparser.parse(src['url'])
    for e in feed.entries[:20]:
        url=e.get('link','');title=html.unescape(e.get('title','').strip())
        if not url or not title:continue
        ident=hashlib.sha1(url.encode()).hexdigest()[:16]
        if ident in seen:continue
        raw=e.get('summary','');clean=re.sub('<[^>]+>',' ',raw);clean=re.sub(r'\s+',' ',clean).strip()
        published=e.get('published','')[:16]
        items.append({'id':ident,'date':datetime.date.today().isoformat(),'source':src['name'],'title':title,'url':url,'tags':src.get('tags',[]),'note':clean[:340] or 'New source item collected by RSS.','score':65})
        seen.add(ident)
items=items[-300:]
items.sort(key=lambda x:(x.get('date',''),x.get('score',0)),reverse=True)
path.write_text(json.dumps(items,indent=2)+"\n",encoding='utf-8')
print(f'Radar: {len(items)} items')
