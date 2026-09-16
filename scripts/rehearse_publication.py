"""Exercise live model research and read-only dependencies without publishing or sending."""
import json
import os
from pathlib import Path
import runpy
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime
from unittest.mock import patch
from zoneinfo import ZoneInfo

from buttondown_lookup import find_email
import requests

ROOT = Path(__file__).resolve().parents[1]


def main():
    today = datetime.now(ZoneInfo('America/Denver')).date().isoformat()
    model = os.environ['OPENAI_MODEL']
    print(f'Selected repository model: {model}', flush=True)
    key = os.environ['BUTTONDOWN_API_KEY']
    email = find_email({'Authorization': f'Token {key}'}, f'{today}-morning-brief')
    status = email.get('status') if email else 'no edition yet'
    print(f'Buttondown read access OK; current edition status: {status}', flush=True)
    before = {name: (ROOT / name).read_bytes() for name in ('data/articles.json', 'data/radar.json')}
    with tempfile.TemporaryDirectory() as directory:
        root = Path(directory)
        for name in ('scripts', 'assets', 'data'):
            shutil.copytree(ROOT / name, root / name)
        path = root / 'data/articles.json'
        articles = json.loads(path.read_text())
        articles = [a for a in articles if a.get('date') != today or a.get('humanWritten') or a.get('contentType') == 'guest']
        path.write_text(json.dumps(articles))
        # Force the same discovery fallback tomorrow will use if Radar misses its run.
        (root / 'data/radar-status.json').unlink(missing_ok=True)
        subprocess.run([sys.executable, str(root / 'scripts/ensure_radar.py')], cwd=root, check=True)
        subprocess.run([sys.executable, str(root / 'scripts/generate_daily.py')], cwd=root, check=True)
        generated = json.loads(path.read_text())
        current = next((a for a in generated if a.get('date') == today and not a.get('humanWritten') and a.get('contentType') != 'guest'), None)
        # Use the production renderer with only Buttondown writes replaced in this process.
        writes = []
        original_get = requests.get
        class Response:
            def __init__(self, data): self.data = data
            def json(self): return self.data
            def raise_for_status(self): pass
        def get(url, **kwargs):
            if url.startswith('https://api.buttondown.com/'):
                return Response({'count': 0, 'results': []})
            return original_get(url, **kwargs)
        def capture(url, **kwargs):
            writes.append(kwargs['json'])
            return Response({'id': 'local-rehearsal-only'})
        sys.path.insert(0, str(root / 'scripts'))
        # Preview is forced draft; actual API mutations are also intercepted.
        with patch.dict(os.environ, BUTTONDOWN_MODE='draft', BUTTONDOWN_PREVIEW='true'), patch.object(requests, 'get', get), patch.object(requests, 'post', capture), patch.object(requests, 'patch', capture):
            if current:
                runpy.run_path(str(root / 'scripts/push_buttondown.py'), run_name='__main__')
                assert writes and all(x.get('status') == 'draft' for x in writes)
            else:
                from community_digest import load_voices
                from datetime import date, timedelta
                load_voices(root, (date.fromisoformat(today) - timedelta(days=1)).isoformat())
        highlights = len(current.get('stories', [])) if current else 0
    assert all((ROOT / name).read_bytes() == data for name, data in before.items())
    summary = f'Rehearsal passed: model={model}; highlights={highlights}; Buttondown={status}; production data unchanged; no emails created or sent.'
    print(summary, flush=True)
    if os.environ.get('GITHUB_STEP_SUMMARY'):
        with open(os.environ['GITHUB_STEP_SUMMARY'], 'a') as output:
            output.write(summary + '\n')


if __name__ == '__main__':
    main()
