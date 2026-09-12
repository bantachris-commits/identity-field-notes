# Identity Field Notes

**AI-driven identity news. I burn the tokens so you don't have to.**

A static, data-driven publication for PAM, IAM, IGA, NHI, ITDR, authentication and authorization. The brand is intentionally explicit about AI: **AI slop, with receipts.**

## What is built
- Daily Field Note homepage and archive
- Automated Identity Radar
- Source / methodology page
- AI disclosure and correction policy
- Event and training directories
- Community discussion via Giscus
- Optional identity jobs board
- Quiet, clearly labeled sponsor inventory
- Buttondown newsletter form integration
- Automated Buttondown draft/send script
- OpenAI + web-search weekday research/generation
- AI Radar refresh several times per day
- Weekly AI refresh of conferences and training
- Privacy page and sponsor policy
- RSS feed and sitemap generation
- GitHub Pages deployment workflow
- Mobile layout, social card, favicon and 404 page

## Local preview
```bash
python -m http.server 8000
```
Open http://localhost:8000.

## Launch checklist
1. Register / point `IdentityFieldNotes.com` to your host.
2. Create a GitHub repo and push these files.
3. Enable GitHub Pages with **GitHub Actions** as the source.
4. Add repository secret `OPENAI_API_KEY`.
5. Optional: set repo variable `OPENAI_MODEL` (defaults to `gpt-5.6-luna`).
6. Create a Buttondown newsletter; set its username in `assets/config.js`.
7. Optional: add `BUTTONDOWN_API_KEY` secret. Keep `BUTTONDOWN_MODE=draft` until you trust the pipeline; set to `send` for fully automatic weekday delivery.
8. Enable GitHub Discussions, install Giscus, and fill the comment IDs in `assets/config.js`.
9. Change `siteUrl` if you use another domain.
10. Review the first several generated editions before enabling automatic email sending.

## Automation design
At 6:15 AM Mountain on weekdays, GitHub Actions:
1. Runs an inexpensive RSS supplement into `data/radar.json`.
2. Calls OpenAI with the web-search tool for current identity news.
3. Requires real source URLs in the generated JSON.
4. Publishes the new edition into `data/articles.json`.
5. Rebuilds `feed.xml` and `sitemap.xml`.
6. Optionally creates or sends a Buttondown digest.
7. Commits the content update; the Pages workflow deploys it.

Separate scheduled workflows also refresh the Identity Radar several times per day and the events/training directories weekly.

The generation layer and UI are intentionally separate. You can replace the model, prompt, email provider or hosting later without changing the publication data contract.

## Editorial principle
The site is a **reading accelerator**, not a primary source. AI summaries are labeled, sources are prominent, vendor claims should remain attributed, and meaningful corrections should be preserved.
