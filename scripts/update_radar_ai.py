#!/usr/bin/env python3
"""Refresh Identity Radar with current web-search results using a cost-sensitive model."""
import os, json, re, hashlib
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse
from zoneinfo import ZoneInfo
from openai import OpenAI
ROOT=Path(__file__).resolve().parents[1]
MODEL=os.getenv('OPENAI_MODEL','gpt-5.6-luna')
now=datetime.now(ZoneInfo('America/Denver'))
prompt=f'''Today is {now.date().isoformat()} in America/Denver. Search the current web for NEW or newly relevant items from the last 36 hours that experienced PAM/IAM/IGA/identity-security practitioners might want in a reading queue. Include privileged access, Entra/Okta/Auth0, SailPoint/Saviynt, CyberArk/Delinea/BeyondTrust, passkeys/FIDO, NHI/machine identity, identity attacks, OAuth/session/token abuse, and AI-agent authorization.

Also look back up to 7 days for material breaches or incidents where reliable reporting or primary evidence identifies an identity-control failure or abuse as a root cause or contributing factor: compromised credentials, MFA bypass, token/session theft, excessive privilege, stale identities, exposed secrets, service-account abuse, OAuth abuse, authentication or authorization failures, or weak offboarding.

Source rules:
- Prefer original incident disclosures, regulatory filings, CISA/CERT/government material, standards bodies, primary technical research, and strong independent security reporting or analysis.
- Do not surface vendor marketing that mainly argues "our product could have prevented this breach." A vendor source is fine when the vendor is the affected party or published the original advisory/research.
- Do not infer identity causation when the evidence does not establish it.
- Prefer substantive incidents and technical research over routine product promotion when relevance is similar.
- Never invent URLs.

Return ONLY JSON: {{"items":[{{"source":"name","title":"title","url":"https://real-url","tags":["PAM"],"note":"one-sentence reason to read","score":0}}]}}. Score practitioner relevance from 50-100. Return at most 10 items.'''
print(f'Radar search starting with model: {MODEL}', flush=True)
client=OpenAI(timeout=180.0,max_retries=1)
r=client.responses.create(model=MODEL,tools=[{'type':'web_search'}],input=prompt)
print('Radar search response received.', flush=True)
t=r.output_text.strip()
if t.startswith('```'): t=re.sub(r'^```(?:json)?\s*|\s*```$','',t)
try: payload=json.loads(t)
except json.JSONDecodeError:
    start,end=t.find('{'),t.rfind('}')
    if start<0 or end<start: raise
    payload=json.loads(t[start:end+1])
path=ROOT/'data'/'radar.json'
old=json.loads(path.read_text(encoding='utf-8')) if path.exists() else []
by_url={x.get('url'):x for x in old if x.get('url')}
for x in payload.get('items',[]):
    u=x.get('url',''); p=urlparse(u)
    if p.scheme not in ('http','https') or not p.netloc: continue
    by_url[u]={
      'id':hashlib.sha1(u.encode()).hexdigest()[:16],
      'date':now.date().isoformat(),'source':x.get('source','Source'),'title':x.get('title','Untitled'),
      'url':u,'tags':x.get('tags',[])[:6],'note':x.get('note','AI-collected reading candidate.'),
      'score':max(50,min(100,int(x.get('score',70))))
    }
items=list(by_url.values())
items.sort(key=lambda x:(x.get('date',''),x.get('score',0)),reverse=True)
path.write_text(json.dumps(items[:250],indent=2)+'\n',encoding='utf-8')
print('Radar updated:',len(items[:250]))
