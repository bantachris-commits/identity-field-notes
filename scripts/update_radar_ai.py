#!/usr/bin/env python3
"""Refresh Identity Radar with current web-search results using a cost-sensitive model."""
import os,json,re,hashlib
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse
from zoneinfo import ZoneInfo
from openai import OpenAI

ROOT=Path(__file__).resolve().parents[1]
MODEL=os.getenv('OPENAI_MODEL','gpt-5.6-luna')
now=datetime.now(ZoneInfo('America/Denver'))

GENERIC_PATHS={"","/","/blog","/newsroom","/newsroom/press-releases","/press-releases","/resources","/iam/docs/release-notes"}
GENERIC_URLS={
 'https://techcommunity.microsoft.com/category/microsoft-entra/blog/microsoft-entra-blog',
 'https://www.microsoft.com/security/blog',
 'https://www.okta.com/blog/threat-intelligence',
 'https://www.beyondtrust.com/blog',
 'https://delinea.com/blog',
 'https://docs.cloud.google.com/iam/docs/release-notes',
}
def specific_url(u):
    try:
        p=urlparse(u)
        if p.scheme not in ('http','https') or not p.netloc:return False
        normalized=f'{p.scheme}://{p.netloc}{p.path}'.rstrip('/').lower()
        if normalized in {x.rstrip('/').lower() for x in GENERIC_URLS}:return False
        if p.path.rstrip('/').lower() in GENERIC_PATHS:return False
        return True
    except Exception:return False

def valid_date(value):
    try:
        return datetime.strptime(str(value),'%Y-%m-%d').date().isoformat()
    except Exception:
        return now.date().isoformat()

prompt=f'''Today is {now.date().isoformat()} in America/Denver. Search the current web for NEW or newly relevant items from the last 36 hours that experienced PAM/IAM/IGA/identity-security practitioners might want in a reading queue. Cover the market broadly, including CyberArk/Palo Alto Networks, Delinea, BeyondTrust, Okta/Auth0, Microsoft Entra, SailPoint, Saviynt, Ping Identity, Descope, Semperis, AWS, Google Cloud, FIDO/OpenID, NHI/machine identity, passkeys, ITDR, OAuth/session/token abuse and AI-agent authorization.

Also look back up to 7 days for material breaches or incidents where reliable reporting or primary evidence identifies an identity-control failure or abuse as a root cause or contributing factor: compromised credentials, MFA bypass, token/session theft, excessive privilege, stale identities, exposed secrets, service-account abuse, OAuth abuse, authentication or authorization failures, federation/account-linking failures, or weak offboarding.

Source rules:
- Prefer original incident disclosures, regulatory filings, CISA/CERT/government material, standards bodies, primary technical research, and strong independent security reporting or analysis. When there is no primary incident disclosure, prefer dedicated security reporting such as Reuters, BleepingComputer or similarly rigorous sources over general-interest commentary.
- Every item URL must be the canonical page for the exact article, advisory, filing, press release or research item. Do not return a vendor homepage, generic blog index, newsroom listing, category/tag page, generic documentation page, release-notes index or press-release directory.
- If a development exists only as a release-note entry and there is no stable item-level or anchored URL, skip it rather than sending readers to a generic index.
- Before returning an item, verify that the destination page title/content actually matches the claimed story. If you cannot verify that, omit the item.
- Return the item's actual publication date from the source, not today's collection date.
- Do not surface vendor marketing that mainly argues "our product could have prevented this breach." A vendor source is fine when the vendor is the affected party or published the original advisory/research, or when a product announcement itself is materially relevant to identity practitioners.
- Do not infer identity causation when the evidence does not establish it.
- Prefer substantive incidents, technical research, material standards changes, acquisitions/platform shifts and meaningful product moves over generic thought leadership.
- Avoid duplicate coverage of the same development unless the second source adds substantial independent detail.
- Never invent URLs.

Return ONLY JSON: {{"items":[{{"source":"name","title":"title","url":"https://exact-item-url","published_date":"YYYY-MM-DD","tags":["PAM"],"note":"one-sentence reason to read","score":0}}]}}. Score practitioner relevance from 50-100. Return at most 12 items.'''
print(f'Radar search starting with model: {MODEL}',flush=True)
client=OpenAI(timeout=180.0,max_retries=1)
r=client.responses.create(model=MODEL,tools=[{'type':'web_search'}],input=prompt)
print('Radar search response received.',flush=True)
t=r.output_text.strip()
if t.startswith('```'):t=re.sub(r'^```(?:json)?\s*|\s*```$','',t)
try:payload=json.loads(t)
except json.JSONDecodeError:
    start,end=t.find('{'),t.rfind('}')
    if start<0 or end<start:raise
    payload=json.loads(t[start:end+1])
path=ROOT/'data'/'radar.json'
old=json.loads(path.read_text(encoding='utf-8')) if path.exists() else []
by_url={x.get('url'):x for x in old if x.get('url') and specific_url(x.get('url'))}
for x in payload.get('items',[]):
    u=x.get('url','')
    if not specific_url(u):
        print('Skipping generic or invalid source URL:',u,flush=True);continue
    by_url[u]={
      'id':hashlib.sha1(u.encode()).hexdigest()[:16],
      'date':valid_date(x.get('published_date')),'source':x.get('source','Source'),'title':x.get('title','Untitled'),
      'url':u,'tags':x.get('tags',[])[:6],'note':x.get('note','AI-collected reading candidate.'),
      'score':max(50,min(100,int(x.get('score',70))))
    }
items=list(by_url.values())
items.sort(key=lambda x:(x.get('date',''),x.get('score',0)),reverse=True)
path.write_text(json.dumps(items[:200],indent=2)+'\n',encoding='utf-8')
print('Radar updated:',len(items[:200]))
