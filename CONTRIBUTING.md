# Contributing to Roomtone

Thanks for helping! Roomtone is a small product, so changes should keep the experience calm, honest and private.

## Getting set up

```bash
npm install
npm run dev        # demo mode, no accounts or keys needed
```

See the README for live mode with Supabase.

## Before you open a pull request

```bash
npm run typecheck && npm test && npm run lint && npm run build
```

- Keep one obvious primary action per screen and write copy in plain language.
- Every new screen needs loading, empty, error and success states.
- Keyboard and screen-reader access: real buttons and labels, visible focus, status not by colour alone.
- Never describe generated images as exact, guaranteed or construction-ready.
- Never commit secrets, `.env` files, real room photos or generated personal images. Use synthetic test images.
- New assets must be original or properly licensed; add them to `THIRD_PARTY_NOTICES.md`.
- Database changes go in a new file under `supabase/migrations/` and must keep row-level security on.

## Reporting security issues

Please don't open a public issue for security problems. Email the maintainers (see the repository profile) with
steps to reproduce.

## Code of conduct

Everyone taking part agrees to follow our [Code of Conduct](CODE_OF_CONDUCT.md).
