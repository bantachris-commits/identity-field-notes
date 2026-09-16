"""Permit catch-up after the morning deadline, including delayed scheduler events."""
import json
import os
from datetime import datetime, time
from pathlib import Path
from zoneinfo import ZoneInfo


def should_publish(now, event, requested_date=None):
    if event == 'workflow_dispatch':
        return True
    local = now.astimezone(ZoneInfo('America/Denver'))
    if event == 'push' and requested_date != local.date().isoformat():
        return False
    return local.weekday() < 5 and time(6, 15) <= local.time() < time(18)


if __name__ == '__main__':
    now = datetime.now(ZoneInfo('America/Denver'))
    event = os.environ.get('TRIGGER_EVENT', '')
    requested_date = None
    if event == 'push':
        request_path = Path(__file__).resolve().parents[1] / '.github' / 'publish-request.json'
        request = json.loads(request_path.read_text(encoding='utf-8'))
        requested_date = request.get('publication_date')
    run = 'yes' if should_publish(now, event, requested_date) else 'no'
    message = f'Trigger: {event}; Denver time: {now.isoformat()}; requested date: {requested_date}; run={run}'
    print(message, flush=True)
    with open(os.environ['GITHUB_OUTPUT'], 'a') as output:
        output.write(f'run={run}\n')
    with open(os.environ['GITHUB_STEP_SUMMARY'], 'a') as summary:
        summary.write(message + '\n')
