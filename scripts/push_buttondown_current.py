#!/usr/bin/env python3
"""Compatibility runner for Buttondown's current send API.

The existing digest builder still calls the legacy POST /emails/{id}/publish endpoint.
Buttondown now documents sending a draft by PATCHing the email with
{"status": "about_to_send"}. This wrapper preserves the existing builder while
translating only that final legacy publish request.
"""
from pathlib import Path
import runpy
import requests

ROOT = Path(__file__).resolve().parents[1]
_original_post = requests.post


def _post(url, *args, **kwargs):
    if isinstance(url, str) and url.endswith("/publish") and "/v1/emails/" in url:
        email_url = url[: -len("/publish")]
        headers = kwargs.get("headers")
        timeout = kwargs.get("timeout", 30)
        return requests.patch(
            email_url,
            headers=headers,
            json={"status": "about_to_send"},
            timeout=timeout,
        )
    return _original_post(url, *args, **kwargs)


requests.post = _post
runpy.run_path(str(ROOT / "scripts" / "push_buttondown.py"), run_name="__main__")
