"""Read all email pages before deciding whether an edition needs sending."""


def find_email(headers, slug):
    import requests
    page = 1
    read = 0
    while True:
        response = requests.get('https://api.buttondown.com/v1/emails', headers=headers,
                                params={'page': page, 'excluded_fields': 'body'}, timeout=30)
        response.raise_for_status()
        payload = response.json()
        rows = payload.get('results', [])
        for row in rows:
            if row.get('slug') == slug:
                return row
        read += len(rows)
        if read >= payload.get('count', read):
            return None
        if not rows:
            raise RuntimeError('Buttondown pagination ended before all emails were checked')
        page += 1
