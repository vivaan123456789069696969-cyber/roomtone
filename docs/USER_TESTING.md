# User testing plan

Goal: check that people who didn't build Roomtone understand each screen, feel heard by the assistant, agree with
their brief, and understand the limits of generated images.

## Photo set (5–10 rooms)

Use photos the participants own and agree to use, or photos taken for testing. **Never commit them to the repo**
(`test-photos/` is git-ignored). Cover:

- Bright living room, wide angle
- Small, dark bedroom
- Kitchen with lots of cabinets
- Cluttered kids' room
- Room with a big window and a door in view
- Portrait-orientation phone photo
- Low-resolution photo (under 640 px)
- Room with a distinctive item to keep (e.g. a swing, a heritage cupboard)

## For each generated concept, record

| Photo | Walls/geometry kept | Windows & doors kept | “Keep” items kept | Perspective kept | Brief followed | Notes |
| --- | --- | --- | --- | --- | --- | --- |

The in-app “Check the concept” ticks save the same four checks on each concept.

## Session script (20 minutes, 3–5 people)

1. “Here's a site. Tell me what you think it does.” (Landing — understand the promise?)
2. “Create an account and start a makeover for a room in your home.”
3. Watch the conversation. Afterwards: “Did it feel like it listened? Did it ask anything twice?”
4. On the brief: “Is this what you want? What would you change?”
5. After the concept: “What is this image? Is it a photo, a plan, or something else?” (Recognise limitations?)
6. “Change one thing about it.” (Refinement understood?)
7. “Close the site, come back, and find your design.” (Resume and gallery.)

## Findings log

| Date | Participant | Screen | Finding | Severity | Fix / decision |
| --- | --- | --- | --- | --- | --- |

## Development test accounts (demo mode only)

These exist only in a developer's own browser (IndexedDB) and are not real accounts on any service.

- `tester@roomtone.test` / `demo-pass-2026`
- `tester2@roomtone.test` / `demo-pass-2026`
