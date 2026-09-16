"""Avoid declaring a quiet morning when discovery has not run since midnight."""
import json
from datetime import datetime
from pathlib import Path
import subprocess
import sys
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
DENVER = ZoneInfo('America/Denver')


def fresh_discovery(status, today):
    try:
        stamp = datetime.fromisoformat(status['updatedAt'])
        return stamp.tzinfo is not None and stamp.astimezone(DENVER).date() == today
    except (KeyError, ValueError, TypeError):
        return False


def main():
    today = datetime.now(DENVER).date()
    articles = json.loads((ROOT / 'data/articles.json').read_text())
    if any(a.get('date') == today.isoformat() and not a.get('humanWritten') and a.get('contentType') != 'guest' for a in articles):
        print('Existing edition: discovery not required for recovery.', flush=True)
        return
    status_path = ROOT / 'data/radar-status.json'
    status = json.loads(status_path.read_text()) if status_path.exists() else {}
    if fresh_discovery(status, today):
        print('Radar discovery already completed today in Denver.', flush=True)
        return
    print('Refreshing discovery before selecting yesterday\'s highlights.', flush=True)
    subprocess.run([sys.executable, str(ROOT / 'scripts/update_radar_ai.py')], cwd=ROOT, check=True)


if __name__ == '__main__':
    main()
