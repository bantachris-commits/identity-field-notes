#!/usr/bin/env python3
import json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
incoming=json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
path=ROOT/'data'/'articles.json';articles=json.loads(path.read_text(encoding='utf-8'))
articles=[a for a in articles if a.get('id')!=incoming.get('id')]
for a in articles:a['featured']=False
incoming['featured']=True;articles.insert(0,incoming)
path.write_text(json.dumps(articles,indent=2)+"\n",encoding='utf-8')
print('Published',incoming['id'])
