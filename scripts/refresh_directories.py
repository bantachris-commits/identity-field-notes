#!/usr/bin/env python3
"""Weekly update of upcoming identity conferences and useful training directories."""
import os,json,re
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse
from zoneinfo import ZoneInfo
from openai import OpenAI

ROOT=Path(__file__).resolve().parents[1]
MODEL=os.getenv('OPENAI_MODEL','gpt-5.6-luna')
today=datetime.now(ZoneInfo('America/Denver')).date().isoformat()

prompt=f'''Today is {today}. Research upcoming public conferences/events and useful training resources for IAM, PAM, IGA, authentication/passkeys, non-human identity, identity threats and authorization.

For events, deliberately check the identity market rather than relying only on broad conference rankings. Look for flagship or practitioner-relevant events from Okta, CyberArk, Delinea, SailPoint, Saviynt, BeyondTrust, Microsoft Entra, FIDO Alliance, OpenID Foundation, Gartner IAM, Identiverse, KuppingerCole/EIC and other materially relevant identity communities. Include vendor customer conferences when they have substantial practitioner content, but label them accurately through the event name/focus and do not treat sponsorship as editorial endorsement.

Event source rules:
- Only include events after today.
- Prefer the official dedicated page for the exact conference or city stop. Do not use a generic events directory or vendor homepage when a dedicated event page exists.
- A generic official events page is acceptable only when no dedicated page is available.
- Use verified dates and locations from the official source. Never invent a date, location or URL.
- Favor identity-focused events over broad security conferences unless the identity program is clearly material.

Training rules:
- Prefer credible vendor, standards-body or established education-provider resources.
- Link to the specific course or learning path rather than a generic training homepage when possible.

Return ONLY JSON with keys events and training. events objects: date YYYY-MM-DD, end YYYY-MM-DD or empty, name, location, focus, url, type. training objects: provider,title,level,focus,url. Keep at most 18 future events and 12 training resources.'''

r=OpenAI(timeout=180.0,max_retries=1).responses.create(model=MODEL,tools=[{'type':'web_search'}],input=prompt)
t=r.output_text.strip()
if t.startswith('```'):t=re.sub(r'^```(?:json)?\s*|\s*```$','',t)
try:d=json.loads(t)
except json.JSONDecodeError:d=json.loads(t[t.find('{'):t.rfind('}')+1])

def valid(u):
    try:
        p=urlparse(u);return p.scheme in ('http','https') and bool(p.netloc)
    except Exception:return False

def slug(s):return re.sub(r'[^a-z0-9]+','-',str(s or '').lower()).strip('-')[:80] or 'event'

events=[];seen=set()
for x in d.get('events',[]):
    if x.get('date','')<today or not valid(x.get('url','')):continue
    key=(x.get('date',''),str(x.get('name','')).lower())
    if key in seen:continue
    seen.add(key)
    x['id']=x.get('id') or f"{x.get('date','event')}-{slug(x.get('name'))}"
    x['sponsored']=False;events.append(x)
events.sort(key=lambda x:x.get('date',''))

training=[];seen_training=set()
for x in d.get('training',[]):
    if not valid(x.get('url','')):continue
    key=x.get('url','').rstrip('/').lower()
    if key in seen_training:continue
    seen_training.add(key);x['sponsored']=False;training.append(x)

if events:(ROOT/'data'/'events.json').write_text(json.dumps(events[:18],indent=2)+'\n',encoding='utf-8')
if training:(ROOT/'data'/'training.json').write_text(json.dumps(training[:12],indent=2)+'\n',encoding='utf-8')
print('Directories:',len(events[:18]),'events,',len(training[:12]),'training entries')
