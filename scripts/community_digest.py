"""Read public Community Voices first published on one Denver calendar day."""
import json
import re
from datetime import date, datetime, time, timedelta
from urllib.parse import quote, urlparse
from zoneinfo import ZoneInfo

import requests

DENVER = ZoneInfo('America/Denver')


def publication_day(value):
    if not value:
        return None
    try:
        if len(value) == 10:
            return date.fromisoformat(value).isoformat()
        stamp = datetime.fromisoformat(value.replace('Z', '+00:00'))
        if stamp.tzinfo is None:
            return None
        return stamp.astimezone(DENVER).date().isoformat()
    except (ValueError, TypeError):
        return None


def load_voices(root, coverage_date):
    config = (root / 'assets' / 'config.js').read_text(encoding='utf-8')
    def setting(name):
        match = re.search(r'\b' + name + r'\s*:\s*"([^"\n]*)"', config)
        if not match or not match[1]:
            raise RuntimeError(f'Missing public community setting: {name}')
        return match[1]
    base = setting('supabaseUrl').rstrip('/')
    if urlparse(base).scheme != 'https':
        raise RuntimeError('Community API must use HTTPS')
    key = setting('supabaseKey')
    day = date.fromisoformat(coverage_date)
    start = datetime.combine(day, time.min, DENVER)
    end = datetime.combine(day + timedelta(days=1), time.min, DENVER)
    voices = []
    offset = 0
    while True:
        response = requests.get(base + '/rest/v1/published_guest_voices',
            headers={'apikey': key, 'Accept': 'application/json'},
            params=[('select', 'submission_id,title,author_name,author_role,pitch,published_at'),
                    ('published_at', 'gte.' + start.isoformat()),
                    ('published_at', 'lt.' + end.isoformat()),
                    ('order', 'published_at.asc,submission_id.asc'), ('limit', '200'), ('offset', str(offset))],
            timeout=30)
        response.raise_for_status()
        rows = response.json()
        if not isinstance(rows, list):
            raise RuntimeError('Invalid public Community Voices response')
        for item in rows:
            if publication_day(item.get('published_at')) != coverage_date:
                continue
            voices.append({'id': str(item['submission_id']), 'title': item.get('title') or 'Community Voice',
                'author': item.get('author_name') or 'Guest contributor', 'role': item.get('author_role') or '',
                'excerpt': (item.get('pitch') or '')[:500],
                'url': 'https://identityfieldnotes.com/guest-submission.html?id=' + quote(str(item['submission_id']), safe='')})
        if len(rows) < 200:
            break
        offset += len(rows)
    # Older, repository-published Guest Voices also have a public publication date.
    articles = json.loads((root / 'data' / 'articles.json').read_text(encoding='utf-8'))
    for item in articles:
        if not (item.get('humanWritten') is True or item.get('contentType') == 'guest'):
            continue
        if publication_day(item.get('published_at') or item.get('date')) != coverage_date:
            continue
        author = item.get('author') or {}
        voices.append({'id': str(item['id']), 'title': item.get('title') or 'Community Voice',
            'author': author.get('name') or 'Guest contributor', 'role': author.get('role') or '',
            'excerpt': (item.get('dek') or '')[:500],
            'url': 'https://identityfieldnotes.com/article.html?id=' + quote(str(item['id']), safe='')})
    return list({item['url']: item for item in voices}.values())
