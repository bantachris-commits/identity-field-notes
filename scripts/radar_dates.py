"""Keep source publication dates separate from the time an item entered IFN."""
import calendar
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

DENVER = ZoneInfo('America/Denver')


def source_date(value):
    try:
        return datetime.strptime(str(value), '%Y-%m-%d').date().isoformat()
    except (ValueError, TypeError):
        return None


def feed_publication(entry):
    parsed = entry.get('published_parsed')
    if not parsed:
        return None, None
    try:
        published = datetime.fromtimestamp(calendar.timegm(parsed), timezone.utc)
        return published.astimezone(DENVER).date().isoformat(), published.isoformat()
    except (ValueError, TypeError, OverflowError):
        return None, None
