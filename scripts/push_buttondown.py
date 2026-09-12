#!/usr/bin/env python3
"""Create a Buttondown digest from the newest Field Note.

Required: BUTTONDOWN_API_KEY
Optional: BUTTONDOWN_MODE=draft|send (default draft)

`send` creates the email, then calls Buttondown's publish endpoint immediately.
"""
import os, json, requests
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
key=os.getenv('BUTTONDOWN_API_KEY')
if not key:raise SystemExit('BUTTONDOWN_API_KEY is not set')
mode=os.getenv('BUTTONDOWN_MODE','draft').lower()
a=json.loads((ROOT/'data'/'articles.json').read_text(encoding='utf-8'))[0]
lines=[f'# {a["title"]}',a['dek'],'',f'*AI-driven identity news. I burn the tokens so you don’t have to.*','']
for s in a['stories']:
    lines += [f'## {s["title"]}',s['summary'],'',f'**Why it matters:** {s["why"]}','',f'[Original source — {s["source"]}]({s["url"]})','']
lines += ['---','','**AI disclosure:** This digest is AI-generated from linked sources. Verify important details at the original source.','','[Read and discuss on Identity Field Notes](https://identityfieldnotes.com/)']
body='\n'.join(lines)
headers={'Authorization':f'Token {key}','Content-Type':'application/json'}
payload={'subject':f'Identity Field Notes: {a["title"]}','slug':a['id'],'body':body,'canonical_url':f'https://identityfieldnotes.com/article.html?id={a["id"]}','description':a['dek'],'commenting_mode':'enabled','status':'draft'}
r=requests.post('https://api.buttondown.com/v1/emails',headers=headers,json=payload,timeout=30);r.raise_for_status();email=r.json();print('Created Buttondown email',email.get('id'))
if mode=='send':
    p=requests.post(f'https://api.buttondown.com/v1/emails/{email["id"]}/publish',headers=headers,json={},timeout=30);p.raise_for_status();print('Published Buttondown email')
else:print('Left as draft. Set BUTTONDOWN_MODE=send to publish automatically.')
