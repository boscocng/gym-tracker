# CLAUDE.md

Standing rules for working in this repo. The full product and build spec is in `docs/SPEC.md`. Read it before doing anything.

## How we work

- Work in phases (see `docs/SPEC.md`, section 11). Finish one phase, then STOP: summarize what changed, list anything I need to test on my phone, and wait for my go-ahead before starting the next phase.
- Investigate before implementing. If something in the spec looks wrong, outdated or unverifiable (a library API, a platform limit), check it first and tell me before building around it.
- Don't rely on memory for library APIs. Check the installed version's docs or type definitions.
- Ask before adding any dependency the spec doesn't list.

## Commits

- Small commits, one logical change each, with conventional commit messages (`feat:`, `fix:`, `chore:`, `test:`, `docs:`).
- Run typecheck, lint and tests before every commit. Never commit failing tests.
- Never commit secrets, `.env*` files (except `.env.example`), `esp32/secrets.yaml`, real photos, database dumps or exports.

## Open source hygiene

This repo will be public. Treat it as public from the first commit.

- No personal data anywhere: not in code, tests, fixtures, seed data, comments or commit messages. That means no real weights, lifts, photos, names, emails, locations or time zones.
- The owner's settings (time zone, unit, exercises, routine) live in the database, never in code.
- Seed data is generated and obviously fake.
- All config goes through environment variables documented in `.env.example`.

## Code style

- TypeScript in strict mode. No `any` without a comment saying why.
- Business rules (training day, rest rule, day status, set parser, weight selection) are pure functions with unit tests, kept separate from UI and database code.
- Everything that matters is checked on the server. Never trust the client.
