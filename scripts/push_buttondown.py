#!/usr/bin/env python3
"""Create or update a Buttondown digest from the newest Field Note.

Required: BUTTONDOWN_API_KEY
Optional: BUTTONDOWN_MODE=draft|send (default draft)

Draft reruns update the existing matching draft. If the edition was already
sent, the script exits without sending it again.
"""
import os, json, requests
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
key=os.getenv('BUTTONDOWN_API_KEY')
if not key:raise SystemExit('BUTTONDOWN_API_KEY is not set')
mode=os.getenv('BUTTONDOWN_MODE','draft').lower()
if mode not in {'draft','send'}:raise SystemExit('BUTTONDOWN_MODE must be draft or send')
a=json.loads((ROOT/'data'/'articles.json').read_text(encoding='utf-8'))[0]
lines=[f'# {a["title"]}',a['dek'],'',f'*AI-driven identity news. I burn the tokens so you don’t have to.*','']
for s in a['stories']:
    lines += [f'## {s["title"]}',s['summary'],'',f'**Why it matters:** {s["why"]}','',f'[Original source — {s["source"]}]({s["url"]})','']
lines += ['---','','**AI disclosure:** This digest is AI-generated from linked sources. Verify important details at the original source.','','[Read and discuss on Identity Field Notes](https://identityfieldnotes.com/)']
body='\n'.join(lines)
headers={'Authorization':f'Token {key}','Content-Type':'application/json'}
payload={'subject':f'Identity Field Notes: {a["title"]}','slug':a['id'],'body':body,'canonical_url':f'https://identityfieldnotes.com/article.html?id={a["id"]}','description':a['dek'],'commenting_mode':'enabled','status':'draft','metadata':{'identity_field_notes_id':a['id']}}

# Find a matching edition before creating anything. This makes manual tests safe
# and prevents a scheduled rerun from sending the same edition twice.
listing=requests.get('https://api.buttondown.com/v1/emails',headers=headers,timeout=30)
listing.raise_for_status()
existing=next((e for e in listing.json().get('results',[]) if e.get('slug')==a['id']),None)
if existing and existing.get('status')=='sent':
    print('Buttondown email already sent for',a['id'],'- refusing to send twice.')
    raise SystemExit(0)

if existing:
    email_id=existing['id']
    r=requests.patch(f'https://api.buttondown.com/v1/emails/{email_id}',headers=headers,json=payload,timeout=30)
    r.raise_for_status()
    email=r.json()
    print('Updated existing Buttondown draft',email_id)
else:
    r=requests.post('https://api.buttondown.com/v1/emails',headers=headers,json=payload,timeout=30)
    r.raise_for_status()
    email=r.json()
    email_id=email['id']
    print('Created Buttondown email',email_id)

if mode=='send':
    p=requests.post(f'https://api.buttondown.com/v1/emails/{email_id}/publish',headers=headers,json={},timeout=30)
    p.raise_for_status()
    print('Published Buttondown email')
else:
    print('Left as draft. Set BUTTONDOWN_MODE=send to publish automatically.')
