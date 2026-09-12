# Launch IdentityFieldNotes.com

## 1. Domain
Register `IdentityFieldNotes.com` and optionally `IDFieldNotes.com`. Use the full domain as canonical and redirect the short domain.

## 2. GitHub
Create a public repository (recommended name: `identity-field-notes`) and push this folder to `main`.

In **Settings → Pages**, choose **GitHub Actions** as the source. The included `deploy.yml` publishes every push.

## 3. DNS for GitHub Pages
After the Pages deployment shows the GitHub Pages hostname, add the DNS records GitHub currently recommends for an apex custom domain and verify the domain in GitHub. This repository already includes `CNAME` with `identityfieldnotes.com`.

## 4. AI automation
In **Settings → Secrets and variables → Actions**:
- Secret: `OPENAI_API_KEY`
- Optional variable: `OPENAI_MODEL` (default in workflows: `gpt-5.6-luna`)

Workflows:
- `daily.yml` — weekday Field Note at about 6:15 AM Mountain
- `radar.yml` — fresh Radar several times per day
- `directories.yml` — weekly events/training refresh

## 5. Newsletter
Create the publication in Buttondown.

Public signup:
- edit `assets/config.js`
- set `newsletter.buttondownUsername`

Automated digest:
- Secret: `BUTTONDOWN_API_KEY`
- Variable: `BUTTONDOWN_MODE=draft` while testing
- Change to `BUTTONDOWN_MODE=send` when ready for fully automatic delivery

## 6. Community comments
Enable GitHub Discussions and install Giscus. Create a discussion category called `Field Discussion`, then copy the Giscus repo/category IDs into `assets/config.js`.

## 7. Analytics (optional)
The site works with no analytics. For privacy-friendly page counts, add a Plausible domain and set `analytics.plausibleDomain` in `assets/config.js`.

## 8. Launch safety check
Before switching the email mode to `send`, let the generation workflow run for several weekdays. Check source quality, duplicate handling, vendor-claim wording and the overall level of snark. The website can be fully automated before the newsletter is.
