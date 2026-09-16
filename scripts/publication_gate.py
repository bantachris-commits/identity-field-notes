"""Permit catch-up after the morning deadline, including delayed scheduler events."""
import os
from datetime import datetime, time
from zoneinfo import ZoneInfo


def should_publish(now, event):
    if event == 'workflow_dispatch':
        return True
    local = now.astimezone(ZoneInfo('America/Denver'))
    return local.weekday() < 5 and time(6, 15) <= local.time() < time(18)


if __name__ == '__main__':
    now = datetime.now(ZoneInfo('America/Denver'))
    event = os.environ.get('TRIGGER_EVENT', '')
    run = 'yes' if should_publish(now, event) else 'no'
    message = f'Trigger: {event}; Denver time: {now.isoformat()}; run={run}'
    print(message, flush=True)
    with open(os.environ['GITHUB_OUTPUT'], 'a') as output:
        output.write(f'run={run}\n')
    with open(os.environ['GITHUB_STEP_SUMMARY'], 'a') as summary:
        summary.write(message + '\n')
