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
prompt=f'''Today is {today}. Research upcoming public conferences/events and useful training resources for IAM, PAM, IGA, authentication/passkeys, non-human identity, identity threats and authorization. Focus on events after today with official event pages and training from credible vendors, standards groups or established education providers. Return ONLY JSON with keys events and training. events objects: date YYYY-MM-DD, end YYYY-MM-DD or empty, name, location, focus, url, type. training objects: provider,title,level,focus,url. Do not invent URLs. Keep at most 12 future events and 12 training resources. Prefer official source pages.'''
r=OpenAI().responses.create(model=MODEL,tools=[{'type':'web_search'}],input=prompt)
t=r.output_text.strip()
if t.startswith('```'):t=re.sub(r'^```(?:json)?\s*|\s*```$','',t)
try:d=json.loads(t)
except json.JSONDecodeError:d=json.loads(t[t.find('{'):t.rfind('}')+1])
def valid(u):
 p=urlparse(u);return p.scheme in ('http','https') and bool(p.netloc)
events=[]
for x in d.get('events',[]):
 if x.get('date','')>=today and valid(x.get('url','')):
  x['sponsored']=False;events.append(x)
training=[]
for x in d.get('training',[]):
 if valid(x.get('url','')):
  x['sponsored']=False;training.append(x)
if events:(ROOT/'data'/'events.json').write_text(json.dumps(events,indent=2)+'\n',encoding='utf-8')
if training:(ROOT/'data'/'training.json').write_text(json.dumps(training,indent=2)+'\n',encoding='utf-8')
print('Directories:',len(events),'events,',len(training),'training entries')
