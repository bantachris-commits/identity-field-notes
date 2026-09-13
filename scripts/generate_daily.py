#!/usr/bin/env python3
"""Generate a source-linked weekday Identity Field Note using OpenAI web search."""
import os, json, re
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse
from zoneinfo import ZoneInfo
from openai import OpenAI

ROOT=Path(__file__).resolve().parents[1]
MODEL=os.getenv("OPENAI_MODEL","gpt-5.6-luna")
TODAY=datetime.now(ZoneInfo("America/Denver")).date().isoformat()

PROMPT=f"""You are the research engine for Identity Field Notes, an openly AI-driven publication for experienced identity practitioners.
Today in America/Denver is {TODAY}.

Research the most important NEW or newly relevant developments from roughly the last 72 hours in:
- privileged access management (PAM)
- identity and access management (IAM)
- identity governance / IGA
- authentication, passkeys and authorization
- non-human / machine identities and secrets
- identity threat detection / identity attacks
- AI agent identity and authorization

Also search up to the last 7 days for material breaches or security incidents where identity controls were a documented root cause or contributing factor. Relevant examples include stolen or reused credentials, weak or bypassed MFA, session/token theft, overprivileged identities, stale accounts, exposed secrets, service-account abuse, OAuth abuse, poor offboarding, or failures in authentication/authorization. Include an incident only when reliable evidence actually connects identity controls to what happened. Do not infer causation just because an identity vendor claims its product could have prevented the breach.

Pay special attention to CyberArk, Delinea, SailPoint, Microsoft Entra, Okta/Auth0, BeyondTrust, Saviynt, AWS, Google Cloud, FIDO, CISA, major security research, standards work and material incidents.

Editorial rules:
1. Prefer original incident disclosures, regulatory filings, government/CERT advisories, standards bodies, primary research, court documents and direct technical advisories. Use reputable independent reporting when it adds necessary context.
2. For breaches/incidents, do NOT use a security vendor's marketing or 'our tool would have stopped this' article as primary evidence. Vendor material is acceptable when that vendor is the affected party, published the original advisory/research, or provides uniquely relevant technical evidence.
3. Every story URL MUST be the canonical page for that exact article, advisory, filing, release note or research item. Never use a publication homepage, blog index, newsroom listing, category/tag page, generic press-release directory or vendor landing page when a story-level URL exists.
4. Never invent a URL. Every story MUST include a real URL you actually found through web search.
5. Distinguish vendor claims from independently established facts.
6. Avoid generic thought leadership unless it contains a genuinely useful technical or strategic idea.
7. Avoid duplicating the same announcement from multiple outlets.
8. Write for experienced practitioners. Be concise and slightly skeptical.
9. This publication openly labels the output as AI-generated; do not pretend a human reported the story.
10. When breach causation is uncertain, say what is known and what is not. Do not upgrade correlation or speculation into fact.
11. If a credible identity-relevant incident exists, strongly prefer including it over a routine product announcement. If none exists, do not force one.

Return ONLY valid JSON. No markdown fence. Shape:
{{
  "title": "short edition headline",
  "dek": "one sentence describing the morning",
  "tags": ["PAM","IAM"],
  "readTime": "6 min",
  "stories": [
    {{
      "kicker": "Vendor Watch|Threat|Incident|Breach|Standards|Machine IAM|Research|From the Field",
      "title": "headline",
      "summary": "2-3 sentence factual summary",
      "why": "1-2 sentence practitioner implication",
      "source": "source name",
      "url": "https://exact-story-url",
      "confidence": "Primary source|Multiple sources|Independent reporting|Vendor claim|Research"
    }}
  ]
}}
Return 3 to 6 stories. If the morning is quiet, return fewer stories rather than filler.
"""

GENERIC_PATHS={"","/","/blog","/newsroom","/newsroom/press-releases","/press-releases","/resources"}
GENERIC_URLS={
 "https://techcommunity.microsoft.com/category/microsoft-entra/blog/microsoft-entra-blog",
 "https://www.microsoft.com/security/blog",
 "https://www.okta.com/blog/threat-intelligence",
 "https://www.beyondtrust.com/blog",
 "https://delinea.com/blog",
}

def extract_json(text):
    text=text.strip()
    if text.startswith('```'):
        text=re.sub(r'^```(?:json)?\s*','',text)
        text=re.sub(r'\s*```$','',text)
    return json.loads(text)

def specific_url(u):
    try:
        p=urlparse(u)
        if p.scheme not in ('http','https') or not p.netloc:return False
        normalized=f"{p.scheme}://{p.netloc}{p.path}".rstrip('/')
        if normalized.lower() in {x.lower().rstrip('/') for x in GENERIC_URLS}:return False
        if p.path.rstrip('/').lower() in GENERIC_PATHS:return False
        return True
    except Exception:return False

client=OpenAI(timeout=180.0,max_retries=1)
resp=client.responses.create(model=MODEL,tools=[{"type":"web_search"}],input=PROMPT)
payload=extract_json(resp.output_text)
raw=payload.get('stories',[])
if not isinstance(raw,list):raise SystemExit('Invalid story list')
clean=[];seen=set()
for s in raw:
    if not isinstance(s,dict):continue
    if any(not s.get(k) for k in ('title','summary','why','source','url')):continue
    if not specific_url(s['url']):
        print('Skipping generic or invalid source URL:',s.get('url'),flush=True);continue
    key=s['url'].rstrip('/').lower()
    if key in seen:continue
    seen.add(key);s['aiGenerated']=True;clean.append(s)
if not clean:raise SystemExit('No stories survived source-link validation')
payload['stories']=clean[:6]

edition={
  'id':f'{TODAY}-morning-brief','date':TODAY,'edition':'FIELD NOTES // '+TODAY.replace('-','.'),
  'title':payload['title'],'dek':payload['dek'],'tags':payload.get('tags',[])[:8],
  'readTime':payload.get('readTime','6 min'),'featured':True,'generatedBy':f'OpenAI {MODEL} + web search',
  'disclosure':'AI-generated from current web research and linked sources. Verify material details at the source.',
  'stories':payload['stories']
}
path=ROOT/'data'/'articles.json'
articles=json.loads(path.read_text(encoding='utf-8'))
articles=[a for a in articles if a.get('id')!=edition['id']]
for a in articles:a['featured']=False
articles.insert(0,edition)
path.write_text(json.dumps(articles,indent=2)+"\n",encoding='utf-8')
print(f'Published {edition["id"]} with {len(edition["stories"])} stories using {MODEL}.')
