# Roomtone

**Guided room makeover concepts.** Share a room photo and tell us what you want to change. Roomtone's design
assistant helps clarify your ideas, confirms the brief, and creates a visual makeover concept for you to review.

Roomtone helps someone go from *“I want this room to feel better”* to a clear design brief, an AI-generated visual
concept based on their own room, and a saved project they can come back to.

> Concepts are visual ideas, not photos, plans or quotes. The image model is asked to keep walls, windows, doors,
> the camera angle and anything the user marks “keep”, but it can still change details.

**Live demo:** https://vivaan123456789069696969-cyber.github.io/roomtone/ — runs in demo mode: accounts and photos
stay in your browser, and concepts are labelled colour studies, not AI images.

## Contents

- [Features](#features) · [How it works](#how-it-works) · [Architecture](#architecture)
- [Quick start (demo mode)](#quick-start-demo-mode) · [Live mode with Supabase + Gemini](#live-mode-with-supabase--gemini)
- [Environment variables](#environment-variables) · [Testing](#testing) · [Deployment](docs/DEPLOYMENT.md)
- [Limitations](#limitations) · [Contributing](CONTRIBUTING.md) · [Decisions & open questions](docs/DECISIONS.md)

## Features

| Area | What's there |
| --- | --- |
| Landing | Plain-language promise, illustrated before/after slider, how it works, privacy and “visual concept” notes |
| Accounts | Sign up, sign in, sign out, forgot/reset password, session kept across refreshes; photos require an account |
| Welcome & dashboard | Short first-run welcome; “continue where you left off”; room cards with thumbnail, status, last update |
| Room project | Name (optional, sensible default) and room type incl. “Other”; saved immediately so it can be resumed |
| Photo | Upload, preview, replace, remove; format/size checks; downscaled and re-encoded in the browser (strips GPS/EXIF); friendly warnings for small, dark or tall photos |
| Conversation | 9 short questions, one at a time, with visual style cards and colour swatches; remembers earlier answers and adapts (e.g. pre-ticks child-safe needs if children were mentioned); “I'm not sure”, back, change any answer; saved after every step |
| Inspiration board | ~10 curated references (colour, material, furniture, décor) ordered by chosen style; like/pass updates the brief |
| Design brief | Plain-language summary + editable lists (keep, explore, colours, materials, practical, budget, notes); autosaved draft; approval creates a numbered version used for generation |
| Generation | User-triggered, duplicate-click and server-side lock, daily limit, progress steps, timeout and clear recovery for quota / rate limit / unavailable model / unsupported photo / blocked / network |
| Result | Side-by-side and accessible slider, “what changed”, source badge (AI vs demo), concept check (walls, openings, kept items, perspective), save, download, return to brief, start over |
| Refinement | Plain-language edits on the latest version, 3 rounds with remaining count, full version history |
| Project detail, My designs, Settings | Original photo, brief, inspiration feedback, current concept, versions, rename, delete; saved concepts across projects; profile, password reset, sign out, delete project, delete account |

Statuses: Draft → Photo added → Chat in progress → Brief ready → Generating → Concept ready → Saved. Opening a
project always resumes at the first unfinished step.

## How it works

```
Photo ─▶ Conversation ─▶ Inspiration ─▶ Brief (approve vN) ─▶ Generate ─▶ Result ─▶ Refine (≤3)
                                               │                    ▲
                                               └─ exact approved ───┘
                                                  version is sent
```

The prompt (`supabase/functions/_shared/prompt.ts`) puts **preservation first** (room geometry, every window and
door, camera perspective, plus the user's keep list), then the design direction from the approved brief. Refinements
send only the requested change against the latest version.

## Architecture

```
React 19 + Vite + TypeScript (SPA)
  src/lib/backend/types.ts     Backend interface (auth, projects, storage, concepts, generation)
  src/lib/backend/supabase.ts  Live: Supabase Auth, Postgres (RLS), private Storage, Edge Functions
  src/lib/backend/demo.ts      Demo: IndexedDB in the browser, labelled colour-study “concepts”
  src/lib/conversation.ts      Question set, adaptive wording and pre-fills
  src/lib/brief.ts             Answers + inspiration → brief → plain-language summary
  src/lib/inspiration.ts       Curated references and how votes change the brief
  src/pages/*                  One file per screen
supabase/
  migrations/…_init.sql        profiles, projects, briefs, concepts, RLS, private bucket
  functions/generate-concept   Calls the Gemini API server-side; locks, limits, error mapping
  functions/delete-account     Deletes the user's storage objects and auth user (cascades rows)
```

The backend is chosen at start-up: if `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set, live mode; otherwise
demo mode, with a banner on every page.

**Security model**

- Every table has row-level security: owners can only read/update/delete their own rows.
- Column privileges stop clients from editing ownership, the approved brief or the generation lock; briefs are
  approved through an `approve_brief` function; concepts are inserted only by the edge function.
- Photos and concepts live in the private `room-photos` bucket under `<user id>/<project id>/…`; storage policies
  check the first folder against `auth.uid()`. The app only uses short-lived signed URLs.
- `GEMINI_API_KEY` and the service-role key exist only as edge-function secrets. Functions never log photos,
  prompts or personal data.

## Quick start (demo mode)

Prerequisites: Node.js 20+ (tested on Node 24).

```bash
npm install
npm run dev
```

Open http://localhost:5173. Everything stays in your browser. Demo “concepts” are colour studies of your own photo,
stamped “Demo preview · not AI-generated”.

## Live mode with Supabase + Gemini

1. Create a Supabase project (the free tier is enough to try it).
2. Apply the schema: `npx supabase link --project-ref <ref>` then `npx supabase db push`
   (or paste `supabase/migrations/20261030000000_init.sql` into the SQL editor).
3. Create a Gemini API key in Google AI Studio and check which image models your key can use.
4. Set function secrets and deploy the functions:
   ```bash
   npx supabase secrets set GEMINI_API_KEY=your-key GEMINI_IMAGE_MODEL=gemini-3.1-flash-image DAILY_GENERATION_LIMIT=12
   npx supabase functions deploy generate-concept
   npx supabase functions deploy delete-account
   ```
5. Copy `.env.example` to `.env.local`, fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, and run `npm run dev`.
6. In Supabase → Authentication → URL configuration, add your site URL plus `/welcome` and `/reset-password`.

Model names change. The default comes from Google's image-generation docs as of October 2026; keep it configurable
via `GEMINI_IMAGE_MODEL` and verify it against https://ai.google.dev/gemini-api/docs/image-generation. The function
calls the Interactions API (`POST /v1beta/interactions`) and reads image and text blocks from the response.

## Environment variables

| Name | Where | Purpose |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Browser build | Supabase project URL (empty = demo mode) |
| `VITE_SUPABASE_ANON_KEY` | Browser build | Supabase anon key (public by design; RLS protects data) |
| `GEMINI_API_KEY` | Edge function secret | Image model access. Never in the browser |
| `GEMINI_IMAGE_MODEL` | Edge function secret | Model id, default `gemini-3.1-flash-image` |
| `DAILY_GENERATION_LIMIT` | Edge function secret | Concepts per user per 24 h, default 12 |
| `ALLOWED_ORIGIN` | Edge function secret | CORS origin for the deployed site (default `*`) |

`SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are injected into edge functions by Supabase.

## Testing

```bash
npm run typecheck   # TypeScript
npm test            # Vitest: brief composition, inspiration votes, adaptive questions, resume logic, prompt
npm run lint        # oxlint
npm run build       # production build
```

Manual and user-testing protocol (5–10 varied room photos, fidelity checks, interview questions):
[docs/USER_TESTING.md](docs/USER_TESTING.md).

## Limitations

- **Demo mode does not use AI.** It proves the journey; it doesn't create redesigns.
- **Live generation is not yet verified against a real key**: the edge function follows Google's current docs but
  needs a run with the team's key (see `docs/DECISIONS.md`).
- Images can change details the user asked to keep; we ask, check and let users refine, but can't guarantee it.
- No share links yet: download only, so nothing is public by default.
- HEIC photos aren't supported; users are guided to JPG.
- English only; budget ranges in INR.
- Screenshots for this README still need to be added (`docs/screenshots/`).

## Credits and license

Third-party packages, fonts and icons are listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). All
illustrations in the app are original SVG drawn for this project.

License: **MIT.** See [LICENSE](LICENSE).
