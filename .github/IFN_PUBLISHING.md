# Connected-app publishing

The ChatGPT scheduled task can initiate the existing morning pipeline without
waiting for GitHub's cron service. Using the connected GitHub app, update
`.github/publish-request.json` on `main` with the current `America/Denver` date
in `publication_date` and a fresh UTC timestamp in `requested_at`.
Use the current file SHA and the GitHub Contents API update operation. Each
request leaves a normal, attributable commit. Do not store credentials here.

The path-filtered push starts `daily.yml` (Publish weekday Field Note). Its gate
accepts only today's request on weekdays between 06:15 and 18:00 Denver. It
checks out current `main`, refreshes discovery when needed, creates yesterday's
recap, deploys the site, and invokes Buttondown with the existing duplicate guard.
The request never specifies executable code, a model, recipients, or email text.

Before requesting a run, inspect current Actions runs. Follow an active morning
publication instead of starting another. After a request, inspect runs for the
returned commit SHA and follow the publish, deploy, and digest jobs to completion.
Verify live `data/articles.json` for today's edition and yesterday's coverageDate.
For email, distinguish queued from sent; inspect concrete Buttondown log output
instead of treating a green workflow as delivery. A quiet day must have successful
fresh discovery and an explicit no-digest result, including the Community Voices
check. Never resend an already queued/sent edition or send a separate preview.

If a run failed transiently, retry the failed job once through the connected app.
If no run was created, re-read the request file and make one new dated request.
Never force-push, rewrite workflow files as a routine trigger, expose secrets,
or weaken the publishing and duplicate guards. Report persistent failures.

GitHub cron and Radar-completion triggers remain additional recovery paths.
ChatGPT's recurring task is independent of GitHub cron but has its own scheduling
window; it is not an exact-minute availability guarantee. Keep the task enabled
after successful daily publication until Chris asks to pause or replace it.
