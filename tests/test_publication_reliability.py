import sys
import unittest
from datetime import date, datetime
from pathlib import Path
from unittest.mock import patch, Mock
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from buttondown_lookup import find_email
from ensure_radar import fresh_discovery
from publication_gate import should_publish


class Response:
    def __init__(self, data): self.data = data
    def json(self): return self.data
    def raise_for_status(self): pass


class ReliabilityTests(unittest.TestCase):
    def test_email_on_later_page_is_found_before_any_new_send(self):
        pages = [Response({'count': 2, 'results': [{'slug': 'other'}]}),
                 Response({'count': 2, 'results': [{'slug': 'edition', 'status': 'sent'}]})]
        get = Mock(side_effect=pages)
        with patch.dict(sys.modules, {'requests': SimpleNamespace(get=get)}):
            self.assertEqual(find_email({}, 'edition')['status'], 'sent')
            self.assertEqual(get.call_args_list[1].kwargs['params']['page'], 2)

    def test_incomplete_email_listing_fails_closed(self):
        get = Mock(return_value=Response({'count': 2, 'results': []}))
        with patch.dict(sys.modules, {'requests': SimpleNamespace(get=get)}):
            with self.assertRaises(RuntimeError): find_email({}, 'edition')

    def test_discovery_must_complete_since_denver_midnight(self):
        day = date(2026, 9, 17)
        self.assertFalse(fresh_discovery({}, day))
        self.assertFalse(fresh_discovery({'updatedAt': '2026-09-17T05:59:59+00:00'}, day))
        self.assertTrue(fresh_discovery({'updatedAt': '2026-09-17T06:00:00+00:00'}, day))

    def test_tomorrow_primary_and_catch_up_gates(self):
        for hour in (12, 13, 14, 18, 23):
            stamp = datetime.fromisoformat(f'2026-09-17T{hour}:23:00+00:00')
            self.assertTrue(should_publish(stamp, 'schedule'))
            self.assertTrue(should_publish(stamp, 'workflow_run'))

    def test_assistant_request_is_for_current_denver_date(self):
        stamp = datetime.fromisoformat('2026-09-17T12:15:00+00:00')
        self.assertTrue(should_publish(stamp, 'push', '2026-09-17'))
        for requested_date in (None, '', '2026-09-16', '2026-09-18'):
            self.assertFalse(should_publish(stamp, 'push', requested_date))

    def test_assistant_request_respects_weekdays_and_publishing_window(self):
        for timestamp, requested_date in (
            ('2026-09-17T12:14:59+00:00', '2026-09-17'),
            ('2026-09-18T00:00:00+00:00', '2026-09-17'),
            ('2026-09-19T13:15:00+00:00', '2026-09-19'),
        ):
            self.assertFalse(should_publish(datetime.fromisoformat(timestamp), 'push', requested_date))
