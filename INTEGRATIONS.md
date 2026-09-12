# Integrations

## OpenAI — automated weekday research
`OPENAI_API_KEY` is stored as a GitHub Actions secret. `scripts/generate_daily.py` uses the Responses API with web search and defaults to `gpt-5.6-luna` for cost-sensitive daily research. Override with repository variable `OPENAI_MODEL`.

## Buttondown — email digest
The public signup form needs only your Buttondown username in `assets/config.js`; no browser-side secret is required.

For automated digests, add GitHub secret `BUTTONDOWN_API_KEY`.
- `BUTTONDOWN_MODE=draft` — recommended while tuning.
- `BUTTONDOWN_MODE=send` — publishes/sends the newest edition automatically.

## Giscus — discussion board / article comments
1. Put the site in a public GitHub repository.
2. Enable GitHub Discussions.
3. Install the Giscus GitHub App.
4. Create a `Field Discussion` category.
5. Use giscus.app to obtain `repo`, `repoId`, `categoryId`.
6. Add those values to `assets/config.js`.

Each article maps to a discussion using its stable article id. The general Community page uses `community-general`.

## Plausible — optional analytics
Set `plausibleDomain` in `assets/config.js`. Leave blank for no analytics.

## Hosting
The included deploy workflow targets GitHub Pages. The site is static and will also work on Cloudflare Pages, Netlify or Vercel.

## Monetization inventory
- one newsletter sponsor
- one quiet article/page sponsor
- clearly labeled jobs
- clearly labeled training/event sponsorships

Never allow sponsorship to modify editorial ranking or “why it matters” language.
