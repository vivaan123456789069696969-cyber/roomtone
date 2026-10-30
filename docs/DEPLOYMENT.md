# Deployment

Roomtone is a static single-page app plus Supabase. No paid service is required to launch a demo.

## Current deployment: GitHub Pages (demo mode)

Live at https://vivaan123456789069696969-cyber.github.io/roomtone/, served from the `gh-pages` branch.

To redeploy after changes on `main`:

```bash
npm run build:pages          # builds with base /roomtone/ and copies index.html to 404.html for deep links
cd dist && touch .nojekyll && git init -b gh-pages && git add -A && git commit -m "Deploy" \
  && git push -f https://github.com/vivaan123456789069696969-cyber/roomtone.git gh-pages
```

Deep links return HTTP 404 from GitHub Pages but still load the app through `404.html`; that's expected. For live
mode on Pages, add `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` to `.env.production.local` before building, and add
`https://vivaan123456789069696969-cyber.github.io/roomtone/welcome` and `/roomtone/reset-password` as Supabase
redirect URLs. A GitHub Actions workflow could automate this, but the current GitHub token lacks the `workflow`
scope.

## Recommended hosting for live mode

| Option | Cost to start | Notes |
| --- | --- | --- |
| **Vercel** (recommended) | Free Hobby tier | Imports the GitHub repo, builds `npm run build`, serves `dist`. `vercel.json` already handles SPA routes and basic security headers |
| Netlify | Free tier | `public/_redirects` handles SPA routes. Build `npm run build`, publish `dist` |
| GitHub Pages | Free for public repos | Needs a `404.html` copy of `index.html` for deep links; no custom headers |

None of these are set up yet. They need the owner's account; no domain purchase is required (a free
`*.vercel.app` / `*.netlify.app` URL works).

## Owner checklist

1. **Repository** — create the public GitHub repo (after approving the license and the secret audit below), push `main`.
2. **Supabase** — create the project; run the migration; deploy `generate-concept` and `delete-account`; set
   secrets (`GEMINI_API_KEY`, `GEMINI_IMAGE_MODEL`, `DAILY_GENERATION_LIMIT`, `ALLOWED_ORIGIN=https://<site>`).
3. **Auth URLs** — Supabase → Authentication → URL configuration:
   - Site URL: `https://<site>`
   - Redirect URLs: `https://<site>/welcome`, `https://<site>/reset-password`
   - Keep email confirmation on. For real launch, configure custom SMTP (Supabase's built-in email is rate-limited).
4. **Storage** — confirm the `room-photos` bucket shows **Private**.
5. **Hosting** — import the repo, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as production env vars,
   deploy.
6. **Verify on the public URL** (desktop and phone): sign up → confirm email → new room → upload → conversation →
   inspiration → approve brief → generate → refine → save → reopen from dashboard → second account cannot open the
   first account's project URL → delete project → delete account.

To launch the demo only (no backend), skip steps 2–4 and leave the env vars empty. The banner makes demo mode clear.

## Secret audit before going public

```bash
git log --all -p | grep -Ei "(api[_-]?key|secret|service_role|sk-|AIza|eyJhbGci)" || echo "clean"
git ls-files | grep -Ei "\.env($|\.)" | grep -v ".env.example" || echo "no env files tracked"
```

If anything real is found: stop, remove it from history, and **rotate the key** before publishing.
