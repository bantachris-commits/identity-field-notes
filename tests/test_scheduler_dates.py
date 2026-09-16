import sys
import unittest
from datetime import datetime
from pathlib import Path
from time import strptime

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from publication_gate import should_publish
from radar_dates import feed_publication, source_date


class SchedulerDateTests(unittest.TestCase):
    def test_catch_up_is_allowed_after_missed_morning_slot(self):
        for event in ('schedule', 'workflow_run'):
            self.assertTrue(should_publish(datetime.fromisoformat('2026-09-16T18:49:00+00:00'), event))
            self.assertFalse(should_publish(datetime.fromisoformat('2026-09-16T11:58:00+00:00'), event))
            self.assertFalse(should_publish(datetime.fromisoformat('2026-09-19T15:00:00+00:00'), event))

    def test_winter_denver_deadline(self):
        self.assertFalse(should_publish(datetime.fromisoformat('2026-12-16T13:14:00+00:00'), 'schedule'))
        self.assertTrue(should_publish(datetime.fromisoformat('2026-12-16T13:15:00+00:00'), 'schedule'))

    def test_missing_publication_date_is_not_today(self):
        self.assertIsNone(source_date(None))
        self.assertIsNone(source_date('invalid'))
        self.assertEqual(feed_publication({'updated_parsed': strptime('2026-09-16', '%Y-%m-%d')}), (None, None))

    def test_feed_timestamp_converts_to_denver_day(self):
        day, timestamp = feed_publication({'published_parsed': strptime('2026-09-16 05:59:00', '%Y-%m-%d %H:%M:%S')})
        self.assertEqual(day, '2026-09-15')
        self.assertEqual(timestamp, '2026-09-16T05:59:00+00:00')
