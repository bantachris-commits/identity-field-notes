"""Offline regression tests: date selection, human voices, and safe email retries."""
import contextlib
import io
import json
import os
from pathlib import Path
import runpy
import shutil
import sys
import tempfile
import types
import unittest
from datetime import datetime, timedelta
from unittest.mock import patch
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
TODAY = datetime.now(ZoneInfo('America/Denver')).date()
YESTERDAY = (TODAY - timedelta(days=1)).isoformat()


class Response:
    ok = True
    status_code = 200
    def __init__(self, data): self.data = data
    def json(self): return self.data
    def raise_for_status(self): pass


class MorningRecapTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        shutil.copytree(ROOT / 'scripts', self.root / 'scripts')
        (self.root / 'data').mkdir()
        (self.root / 'assets').mkdir()
        (self.root / 'assets/config.js').write_text('supabaseUrl: "https://example.supabase.co", supabaseKey: "public-test"')
        self.write('articles', [])
        self.write('radar', [])

    def write(self, name, value):
        (self.root / f'data/{name}.json').write_text(json.dumps(value))

    def execute(self, name, modules, **env):
        sys.modules.pop('community_digest', None)
        with patch.dict(sys.modules, modules), patch.dict(os.environ, env), patch.object(sys, 'path', [str(self.root / 'scripts')] + sys.path), contextlib.redirect_stdout(io.StringIO()):
            try:
                return runpy.run_path(str(self.root / 'scripts' / name), run_name='__main__')
            except SystemExit as exc:
                if exc.code not in (0, None): raise

    def test_recap_selects_yesterday_candidates_even_if_previously_featured(self):
        url = 'https://example.com/news/identity'
        self.write('articles', [{'id':'old', 'date':'2000-01-01', 'stories':[{'url':url}]}])
        self.write('radar', [{'date':YESTERDAY,'url':url}, {'date':TODAY.isoformat(),'url':'https://example.com/news/today'}])
        story = {'title':'Identity change','summary':'Source-backed summary','why':'Practitioner impact','source':'Example','url':url,'published_date':YESTERDAY}
        def create(**kw):
            self.assertNotIn('https://example.com/news/today',kw['input'])
            return types.SimpleNamespace(output_text=json.dumps({'stories':[dict(story,published_date='2000-01-01'),dict(story,url='https://example.com/news/outside'),story,story]}))
        fake = types.SimpleNamespace(OpenAI=lambda **kw: types.SimpleNamespace(responses=types.SimpleNamespace(create=create)))
        before = (self.root/'data/radar.json').read_bytes()
        self.execute('generate_daily.py', {'openai':fake})
        edition = json.loads((self.root/'data/articles.json').read_text())[0]
        self.assertEqual(edition['date'],TODAY.isoformat())
        self.assertEqual(edition['coverageDate'],YESTERDAY)
        self.assertEqual(len(edition['stories']),1)
        self.assertEqual((self.root/'data/radar.json').read_bytes(),before)

    def test_existing_edition_and_empty_queue_do_not_call_ai(self):
        def forbidden(**kw): raise AssertionError('Unexpected AI request')
        fake = types.SimpleNamespace(OpenAI=forbidden)
        self.execute('generate_daily.py', {'openai':fake})
        self.write('articles',[{'id':'existing','date':TODAY.isoformat(),'stories':[]}])
        before=(self.root/'data/articles.json').read_bytes()
        self.execute('generate_daily.py', {'openai':fake})
        self.assertEqual((self.root/'data/articles.json').read_bytes(),before)

    def email_case(self, human=True, ai=False, existing=None, preview=False):
        aid=f'{TODAY.isoformat()}-morning-brief'
        if ai:
            self.write('articles',[{'id':aid,'date':TODAY.isoformat(),'coverageDate':YESTERDAY,'featured':True,'stories':[{'title':'AI highlight','url':'https://example.com/news/ai'}]}])
        voices=[{'submission_id':'abc','title':'<Human insight>','author_name':'Pat & Co','author_role':'Practitioner','pitch':'My own experience','published_at':YESTERDAY+'T12:00:00Z'}] if human else []
        writes=[]
        def get(url, **kw):
            if 'supabase.co' in url:
                params=kw['params']
                self.assertEqual([v for k,v in params if k=='select'],['submission_id,title,author_name,author_role,pitch,published_at'])
                self.assertEqual(len([1 for k,v in params if k=='published_at']),2)
                return Response(voices)
            return Response({'results':[] if existing is None else [{'id':'email','slug':aid,'status':existing}]})
        def mutation(method):
            def call(url, **kw):
                writes.append((method,kw['json']))
                return Response({'id':'email'})
            return call
        fake=types.SimpleNamespace(get=get,post=mutation('post'),patch=mutation('patch'))
        self.execute('push_buttondown.py',{'requests':fake},BUTTONDOWN_API_KEY='test',BUTTONDOWN_MODE='send',BUTTONDOWN_PREVIEW=str(preview).lower(),GITHUB_WORKFLOW='Publish weekday Field Note')
        return writes

    def test_human_only_email_with_escaped_byline_and_badge(self):
        writes=self.email_case()
        body=writes[0][1]['body']
        self.assertIn('HUMAN-CURATED',body)
        self.assertIn('HUMAN-WRITTEN',body)
        self.assertIn('&lt;Human insight&gt;',body)
        self.assertIn('Pat &amp; Co',body)
        self.assertIn('guest-submission.html?id=abc',body)
        self.assertEqual(writes[-1],('patch',{'status':'about_to_send'}))

    def test_human_section_precedes_ai_highlights(self):
        body=self.email_case(ai=True)[0][1]['body']
        self.assertLess(body.index('HUMAN-CURATED'),body.index('YESTERDAY’S NEWS'))

    def test_quiet_day_does_not_create_email(self):
        self.assertEqual(self.email_case(human=False),[])

    def test_queued_email_is_not_sent_twice(self):
        self.assertEqual(self.email_case(existing='about_to_send'),[])

    def test_preview_cannot_send(self):
        writes=self.email_case(ai=True,preview=True)
        self.assertTrue(all(payload['status']=='draft' for _,payload in writes))

    def test_publication_date_uses_denver_boundary(self):
        sys.modules.pop('community_digest',None)
        with patch.dict(sys.modules,{'requests':types.SimpleNamespace()}), patch.object(sys,'path',[str(self.root/'scripts')]+sys.path):
            from community_digest import publication_day
            self.assertEqual(publication_day('2026-09-15T05:59:59Z'),'2026-09-14')
            self.assertEqual(publication_day('2026-09-15T06:00:00Z'),'2026-09-15')
            self.assertEqual(publication_day('2026-01-15T06:59:59Z'),'2026-01-14')
            self.assertIsNone(publication_day('2026-09-15T00:00:00'))


if __name__ == '__main__': unittest.main()
