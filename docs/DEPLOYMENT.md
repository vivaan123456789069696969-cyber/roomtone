# Deployment

Roomtone is a static single-page app plus Supabase. No paid service is required to launch a demo.

## Recommended hosting

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
