const SITE = 'https://identityfieldnotes.com';

export function commentLink(articleId) {
  if (articleId === 'community-general') return `${SITE}/community.html`;
  const match = String(articleId).match(/^(.*)::story-(\d+)$/);
  const url = new URL('/article.html', SITE);
  url.searchParams.set('id', match ? match[1] : articleId);
  if (match) url.hash = `story-${match[2]}`;
  return url.href;
}

export function emailPayload(row) {
  const s = row.snapshot;
  const kind = s.kind === 'setup_test' ? 'admin alert setup test' : s.is_reply ? 'reply' : s.kind === 'post' ? 'community post' : 'comment';
  // Plain text keeps all user content inert. Fixed headings avoid subject injection.
  return {
    from: s.sender, to: [s.recipient],
    subject: s.kind === 'setup_test' ? 'IFN: Admin comment alerts — setup test' : `IFN: New ${kind}${s.status === 'pending' ? ' awaiting moderation' : ''}`,
    text: [
      `New ${kind} on Identity Field Notes`,
      `By: ${s.author}`, `Posted: ${s.created_at}`, `Status: ${s.status}`,
      s.title ? `Title: ${s.title}` : '', '', s.body, '',
      `View discussion: ${commentLink(s.article_id)}`,
      `Moderate: ${SITE}/moderate.html`, '',
      'Admin notification. This email was not sent to newsletter subscribers.',
    ].filter(x => x !== undefined).join('\n'),
  };
}

export function createHandler({ env, fetchFn = fetch, pause = ms => new Promise(r => setTimeout(r, ms)) }) {
  const reply = (status, data) => new Response(JSON.stringify(data), {status, headers: {'content-type': 'application/json'}});
  async function rpc(name, args = {}) {
    const res = await fetchFn(`${env('SUPABASE_URL')}/rest/v1/rpc/${name}`, {
      method: 'POST', headers: {'content-type': 'application/json', apikey: env('SUPABASE_SERVICE_ROLE_KEY'),
        Authorization: `Bearer ${env('SUPABASE_SERVICE_ROLE_KEY')}`},
      body: JSON.stringify(args), signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`RPC ${name}: HTTP ${res.status}`);
    const body = await res.text();
    return body ? JSON.parse(body) : null;
  }
  return async req => {
    if (req.method !== 'POST') return reply(405, {error: 'Method not allowed'});
    const token = req.headers.get('x-ifn-alert-key') || '';
    if (!/^[a-f0-9]{64}$/.test(token)) return reply(401, {error: 'Unauthorized'});
    try {
      if (await rpc('ifn_alert_auth', {p_token: token}) !== true) return reply(401, {error: 'Unauthorized'});
      const apiKey = env('RESEND_API_KEY');
      if (!apiKey) {
        await rpc('ifn_alert_health', {p_health: 'missing_resend_api_key'});
        return reply(503, {error: 'Email configuration missing'});
      }
      await rpc('ifn_alert_health', {p_health: 'key_present'});
      const rows = await rpc('ifn_alert_claim');
      let accepted = 0, deferred = 0, failed = 0;
      for (const row of rows) {
        let state = 'pending', providerId = null, error = null;
        try {
          const res = await fetchFn('https://api.resend.com/emails', {
            method: 'POST', headers: {Authorization: `Bearer ${apiKey}`, 'content-type': 'application/json',
              'Idempotency-Key': `ifn-comment/${row.id}`},
            body: JSON.stringify(emailPayload(row)), signal: AbortSignal.timeout(10000),
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok && typeof data.id === 'string' && data.id) {
            state = 'accepted'; providerId = data.id;
          } else {
            const retryable = res.status === 429 || res.status >= 500 ||
              (res.status === 409 && data.name === 'concurrent_idempotent_requests');
            state = retryable || res.ok ? 'pending' : 'failed';
            // Store only provider status/code, never echoed content, credentials, or full responses.
            const code = /^[a-z_]+$/.test(data.name || '') ? data.name : 'unknown';
            error = `Resend HTTP ${res.status}: ${code}`;
          }
        } catch {
          error = 'Provider request interrupted; retry uses the same idempotency key';
        }
        // If this write fails, leave the lease intact. Retry the same payload/key after expiry.
        const saved = await rpc('ifn_alert_finish', {p_id: row.id, p_lease: row.lease_id,
          p_state: state, p_provider_id: providerId, p_error: error});
        if (!saved) throw new Error('Queue lease changed');
        if (state === 'accepted') accepted++;
        else if (state === 'failed') failed++;
        else deferred++;
        await pause(600); // Respect Resend's default request rate.
      }
      await rpc('ifn_alert_health', {p_health: failed ? 'provider_error' : deferred ? 'provider_retry_pending' : accepted ? 'provider_accepted' : 'ready_no_pending_comments'});
      return reply(200, {accepted, deferred, failed});
    } catch {
      return reply(503, {error: 'Worker temporarily unavailable; queued alerts are retained'});
    }
  };
}
