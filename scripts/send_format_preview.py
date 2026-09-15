"""Send a separate format preview to the newsletter's sole subscriber."""
import hashlib
import json
import os
from pathlib import Path
import runpy
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

import requests

ROOT = Path(__file__).resolve().parents[1]
key = os.environ['BUTTONDOWN_API_KEY']
headers = {'Authorization': f'Token {key}', 'Content-Type': 'application/json'}
today = datetime.now(ZoneInfo('America/Denver')).date()
with tempfile.TemporaryDirectory() as directory:
    root = Path(directory)
    for name in ('scripts', 'assets', 'data'):
        shutil.copytree(ROOT / name, root / name)
    path = root / 'data/articles.json'
    articles = json.loads(path.read_text(encoding='utf-8'))
    # Generate yesterday's recap in this temporary checkout only.
    articles = [a for a in articles if a.get('date') != today.isoformat()
                or a.get('humanWritten') or a.get('contentType') == 'guest']
    path.write_text(json.dumps(articles), encoding='utf-8')
    subprocess.run([sys.executable, str(root / 'scripts/generate_daily.py')], cwd=root, check=True)
    articles = json.loads(path.read_text(encoding='utf-8'))
    if not any(a.get('date') == today.isoformat() and not a.get('humanWritten') and a.get('contentType') != 'guest' for a in articles):
        articles.insert(0, {'id': f'{today.isoformat()}-morning-brief', 'date': today.isoformat(),
            'coverageDate': (today-timedelta(days=1)).isoformat(), 'featured': True, 'stories': [],
            'disclosure': 'Format preview only. Any sample Community Voice is explicitly labeled and is not a published contribution.'})
        path.write_text(json.dumps(articles), encoding='utf-8')
    sys.path.insert(0, str(root / 'scripts'))
    import community_digest
    original_load = community_digest.load_voices
    def preview_voices(root_path, coverage_date):
        voices = original_load(root_path, coverage_date)
        if voices:
            return voices
        return [{'id': 'layout-example', 'title': 'Sample Community Voice — layout preview only',
            'author': 'Example byline (not a real contributor)', 'role': 'Preview sample',
            'excerpt': 'This clearly labeled sample demonstrates where newly published human contributions will appear: below the 60-second brief and above the full article highlights, with an author byline, excerpt, and link. It is not a published article.',
            'url': 'https://identityfieldnotes.com/guest-voices.html'}]
    community_digest.load_voices = preview_voices
    os.environ['BUTTONDOWN_PREVIEW'] = 'true'
    os.environ['BUTTONDOWN_MODE'] = 'draft'
    publisher = root / 'scripts/push_buttondown.py'
    template = publisher.read_text(encoding='utf-8')
    # One preview per template revision; retries retain the same duplicate guard.
    revision = hashlib.sha256(template.encode('utf-8')).hexdigest()[:12]
    original_slug = 'slug = f"{article[\'id\']}-preview" if preview else article["id"]'
    if original_slug not in template:
        raise SystemExit('Preview slug configuration changed; no email sent.')
    template = template.replace(original_slug, original_slug.replace('-preview"', f'-preview-{revision}"'), 1)
    publisher.write_text(template, encoding='utf-8')
    result = runpy.run_path(str(publisher), run_name='__main__')
    email_id = result['email_id']
    # The owner explicitly authorized newsletter delivery and confirmed they are the sole subscriber.
    response = requests.patch(f'https://api.buttondown.com/v1/emails/{email_id}',
        headers=headers, json={'status': 'about_to_send'}, timeout=30)
    if not response.ok:
        print(f'Preview send rejected (HTTP {response.status_code}): {response.text.replace(key, "[REDACTED]")[:1500]}', flush=True)
    response.raise_for_status()
    print('Buttondown accepted the format preview for the sole subscriber. Production articles and the sent edition were not modified.', flush=True)
