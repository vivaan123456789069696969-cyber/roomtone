# Decisions, assumptions and open questions

A shared log so Suvarna, Tahmeem and Vivaan can review choices quickly. Nothing here is a final product commitment.
Suggested owners are coordination guidance only.

## Decisions made in the first build (October 2026)

| # | Decision | Why | Review owner |
| --- | --- | --- | --- |
| D1 | One new repo, “Roomtone”, as the shared source of truth | No existing repo was found on the build machine or the connected GitHub account | Vivaan |
| D2 | Vite + React + TypeScript SPA; Supabase for auth, data and storage | Matches the team plan, free tier, simple hosting | Tahmeem |
| D3 | Demo mode when Supabase isn't configured | Lets anyone try the journey without keys; always labelled | Vivaan |
| D4 | Guided, structured conversation (no free-form chat yet) | Reliable, remembers answers, no AI cost per question | Suvarna |
| D5 | Order: Photo → Conversation → Inspiration → Brief → Concept | Inspiration votes feed the brief, so the brief is approved last | Suvarna |
| D6 | Static, original SVG references (14) instead of generated or stock images | No licensing risk, no delay or cost | Suvarna |
| D7 | Gemini image model via the Interactions API, model id configurable | Current Google docs; avoids hard-coding a model | Tahmeem |
| D8 | Limits: 12 concepts/user/day, 3 refinements per project, one generation at a time per project | Cost and runaway-retry protection | Vivaan |
| D9 | Download only; no share links | Sharing is optional until privacy is verified | Vivaan |
| D10 | Budget in INR ranges | Team and first users are in India | Vivaan |
| D11 | MIT license | No license existed; approved by the owner on 2026-10-30 | Owner |

## Open questions

1. **Brand name.** “Roomtone” is a working name. Check it's free to use before launch.
2. **Model access.** Which Gemini image model does the team's key have, and what does a concept cost? Live
   generation has not been run yet.
3. **Fidelity.** How often does the model move windows/doors or change kept furniture? Use the in-app “Check the
   concept” ticks and `USER_TESTING.md` to measure.
4. **Question set.** Are 9 questions right? Should “who uses the room” allow skipping?
5. **Room types.** Add pooja room, balcony garden, etc. as first-class types with their own keep lists?
6. **Email.** Custom SMTP sender for confirmation and reset emails.
7. **Sharing.** Is a private, expiring share link wanted for v2?
8. **Hosting account.** Whose Vercel/Netlify and Supabase accounts will own production?
