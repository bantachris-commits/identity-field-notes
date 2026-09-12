# Identity Field Notes

A transparent, AI-driven identity security publication for PAM, IAM, IGA, NHI, ITDR, authentication, authorization and agentic identity.

> **AI-driven identity news. I burn the tokens so you don't have to.**
>
> **AI slop, with receipts.** Source-linked. Community-corrected.

## What is included

- Daily AI-researched Field Note
- Identity Radar for higher-volume automated signal
- Searchable article archive
- Upcoming conferences/events directory
- Training directory
- Community/discussion page
- Identity jobs page
- Source/methodology page
- Sponsorship and editorial policies
- RSS and sitemap generation
- Buttondown newsletter integration hooks
- GitHub Actions automation for publishing, Radar, directories and deployment

## Run locally

Because the site fetches JSON, serve it over HTTP:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Automation model

The website and the AI research pipeline are deliberately decoupled. The frontend reads structured JSON from `data/`, so the model/provider can change later without rebuilding the site.

The morning edition pipeline is intended to:

1. Search recent identity-security news and primary sources.
2. Generate a structured edition JSON with source links.
3. Publish the edition into `data/articles.json`.
4. Rebuild RSS and sitemap outputs.
5. Optionally create/send a Buttondown email digest.
6. Commit the generated content so the site redeploys.

Identity Radar runs separately and is intentionally noisier than the curated Field Note.

## Transparency

AI involvement is a feature, not fine print. The site labels AI summaries, links to original sources, and invites corrections and practitioner context. See `EDITORIAL_POLICY.md`.

## Newsletter

See `INTEGRATIONS.md` for Buttondown setup. Keep provider secrets in GitHub Actions secrets, never in browser JavaScript.

## Comments

Launch recommendation: Giscus + GitHub Discussions for low-overhead authentication and moderation. If the readership outgrows GitHub identity, migrate to a native Supabase-backed discussion layer.

## Monetization philosophy

Keep revenue intentionally subordinate to content:

1. One clearly labeled Morning Digest sponsor.
2. One quiet site/article sponsor slot.
3. Clearly labeled sponsored/affiliate training and events.
4. Optional identity-security job listings.
5. Never pay-to-rank editorial coverage.

## Deployment

The repository includes GitHub Pages deployment automation and a `CNAME` for `IdentityFieldNotes.com`. See `DEPLOYMENT.md` for configuration steps.
