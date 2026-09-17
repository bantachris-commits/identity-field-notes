# Admin comment alerts

New published or pending website comments, replies, and community posts enter a private Supabase queue. An Edge Function processes it every five minutes using Supabase Cron, independently of GitHub publishing. Old comments and edits do not generate alerts. Pending content is labelled as awaiting moderation. Hidden/deleted comments are cancelled before the next claim.

The migration resolves the single confirmed community admin. Recipients and the sender are snapshotted privately for stable retries. The worker verifies that the recipient remains a confirmed admin. Newsletter subscribers are never queried or emailed by this integration. Subscriber signup notifications remain Buttondown's built-in setting.

## Deployment

1. Verify `identityfieldnotes.com` in Resend, including the DNS records it supplies. The sender is `Identity Field Notes <alerts@identityfieldnotes.com>`.
2. In Supabase project `fbiwpyeodonkkllfzwbs`, open **Edge Functions → Secrets** and store `RESEND_API_KEY`. A Resend sending key restricted to the verified domain is sufficient. Never put it in the repository, SQL Editor, or browser code.
3. Deploy `supabase/functions/comment-admin-alerts/index.ts` as `comment-admin-alerts`, with its sibling files and `verify_jwt=false`. The worker implements custom authentication before any queue access. This setting is not anonymous authorization.
4. Apply `sql/admin-comment-alerts.sql` once as a named Supabase migration. It creates a high-entropy worker key in Vault without returning it, private tables/RPCs, the insert trigger, and the five-minute Cron job. No existing comments are backfilled.
5. To check immediately, run `select ifn_private.wake_comment_alert_worker();` in the project's SQL Editor. Otherwise the next five-minute tick checks configuration automatically.

Check status without exposing credentials or comment contents:

```sql
select health, checked_at from ifn_private.alert_config;
select state, count(*) from ifn_private.comment_alerts group by state;
select id, state, attempts, provider_id, last_error, accepted_at
from ifn_private.comment_alerts order by created_at desc limit 20;
select jobname, schedule, active from cron.job where jobname='ifn-comment-admin-alerts';
```

`missing_resend_api_key` means queued comments remain untouched until the secret is added. `ready_no_pending_comments` confirms the key is present and the queue is empty; it does **not** verify the key, sender domain, or actual sending. `provider_accepted` confirms Resend accepted a message, not inbox delivery. Check the Resend email log for delivery status. `provider_error` requires inspecting the queue's `last_error`; domain/key errors do not become endless retries. After correcting a permanent rejection, review failed items and explicitly requeue only those confirmed unaccepted by the provider. Do not reset accepted items.

Send a real comment or reply after configuration to test end to end. Alerts include the author, timestamp, body, discussion link, and moderation link. Community links open the community page; article story links open the relevant story. They are not comment-level anchors. Deployment can insert a clearly labelled `setup_test` record directly into the private queue with no comment ID; it uses the configured recipient and sender. No synthetic public comment is needed during deployment.

## Reliability and security

- Trigger insertion and comment creation share a database transaction; delivery happens asynchronously.
- Tables live in an unexposed schema with RLS enabled, and no grants for visitors or signed-in users. Public RPCs are invoker functions restricted to `service_role`. The only definer functions are private, fixed-purpose trigger/admin-check helpers with an empty search path.
- Cron reads its authentication key from Vault. The Edge Function compares it through a service-only RPC against a SHA-256 hash. No token is stored in source, public tables, cron command text, or emitted in worker logs.
- Keep `net`, `vault`, and `ifn_private` outside the Data API's exposed schemas, and do not expose SQL execution or arbitrary definer functions to clients. Supabase owns pg_net and gives its tables broad database grants; postgres cannot revoke the owner's grants. Its transient request queue contains HTTP headers. Deployment verified that client REST requests for the `net` schema are rejected (HTTP 406); only `public` and `graphql_public` are exposed.
- Claims use row locks and leases. Stable payloads and `ifn-comment/<queue UUID>` Resend idempotency keys protect uncertain sends. Transient failures retry with backoff; permanent provider rejections stop.
- Since Resend retains idempotency keys for 24 hours, automatic retries stop at 23 hours or eight attempts. `needs_review` items require checking Resend before any resend.
- Message bodies are plain text; user content cannot inject HTML or control the recipient, subject, or sending endpoint.
- Run `node --test tests/test_admin_alerts.mjs` for worker regression tests.
- Run `tests/test_admin_alerts.sql` in the SQL Editor for rollback-only database checks: authenticated comment/reply inserts, hidden exclusion, edits, private permissions, leases, and the retry deadline. No fixture comment persists or produces a real email.

Deployment verification on September 17, 2026: the worker authenticated successfully, eight worker tests passed, and the rollback-only database checks passed. Resend accepted the single private setup test at 17:27 UTC. The automatic five-minute job ran successfully at 17:30 UTC and found no pending alerts; the accepted test was not resent. Provider acceptance is not independent inbox-delivery confirmation.

To pause only comment notifications, run:

```sql
select cron.alter_job(job_id := (select jobid from cron.job where jobname='ifn-comment-admin-alerts'), active := false);
```

Comments continue to queue. Resume with the same call and `active := true`. This does not affect newsletter publishing or Buttondown signup notifications.
