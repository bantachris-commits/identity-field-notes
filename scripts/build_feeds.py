#!/usr/bin/env python3
import json, html
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SITE='https://identityfieldnotes.com'
articles=json.loads((ROOT/'data'/'articles.json').read_text(encoding='utf-8'))
def esc(s): return html.escape(str(s), quote=True)
items=[]
for a in articles[:30]:
    url=f'{SITE}/article.html?id={a["id"]}'
    desc=esc(a['dek'])
    items.append(f'<item><title>{esc(a["title"])}</title><link>{esc(url)}</link><guid>{esc(url)}</guid><description>{desc}</description><pubDate>{a["date"]} 13:00:00 GMT</pubDate></item>')
feed='<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Identity Field Notes</title><link>'+SITE+'</link><description>AI-driven, source-linked identity security news for practitioners.</description>'+''.join(items)+'</channel></rss>'
(ROOT/'feed.xml').write_text(feed,encoding='utf-8')
pages=['','index.html','radar.html','archive.html','events.html','training.html','community.html','jobs.html','sources.html','about.html','sponsor.html','privacy.html']
urls=[f'<url><loc>{SITE}/{p}</loc></url>' for p in pages]
urls += [f'<url><loc>{SITE}/article.html?id={a["id"]}</loc></url>' for a in articles]
(ROOT/'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+''.join(urls)+'</urlset>',encoding='utf-8')
print('Built feed.xml and sitemap.xml')
