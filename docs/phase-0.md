# Phase 0: findings and proposals

Checked on 2026-11-08. `SPEC.md` section 11 asks Phase 0 for three things: current versions and APIs, an iPhone spike, and a proposed schema and folder structure. A scale test was added afterwards, at the end of section 3. Nothing here is app code. The schema in section 4 is a proposal, run against a throwaway Postgres 17 to make sure it behaves as described.

## 1. Versions

| Piece | Current | What it means here |
|---|---|---|
| Next.js | 16.4.5 | App Router, Turbopack by default. The auth "middleware" file is now called `proxy.ts` (`middleware.ts` is the old name and still works). |
| React | 19.3.1 | |
| Node.js | 26 (Active LTS) | Vercel's default for new projects. Node 24 is now in maintenance. |
| TypeScript | pin 6.0.3 | `latest` is 7.0.2, the new native compiler, but typescript-eslint 8.72.1 (which eslint-config-next uses) only supports TypeScript below 6.1. |
| Tailwind CSS | 4.3.5 | Tokens go in the CSS `@theme` block. There's no `tailwind.config.js` any more. |
| Zod | 4.6.7 | |
| Vitest | 5.1.0 | |
| ESLint | 10.14.0, with eslint-config-next 16.4.5 | |
| Supabase CLI | 3.0.0, released 2026-11-02 | New major version: commands target the local stack by default and ask before touching a hosted project. The 2.x line is at 2.122.1. |
| @supabase/supabase-js | 2.119.0 | |
| @supabase/ssr | 0.12.7 | |
| Postgres | 17 | Both hosted projects and the local stack. `btree_gist` is available in both. |
| MCP server SDK | `@modelcontextprotocol/server` 2.4.0 | v2 split the SDK into packages; `@modelcontextprotocol/sdk` 1.32.2 is now the maintenance line. The current MCP spec (2026-07-28) makes Streamable HTTP stateless and deprecates the old HTTP+SSE transport. |
| Vercel MCP adapter | `mcp-handler` 2.3.1 | Renamed from `@vercel/mcp-adapter`. Built on `@modelcontextprotocol/server` 2.x, needs no Redis. Its `withMcpAuth` checks bearer tokens but doesn't issue them. |
| ESPHome | 2026.10.2, released 2026-11-02 | `xiaomi_body_scale` shipped in 2026.10.0, so `min_version: 2026.10.0` is right. `esphome config scale-bridge.yaml` passes with no warnings. |

## 2. What's outdated or wrong in the spec

1. **MCP auth (section 9) may not work as written.** A Claude custom connector can send a fixed `Authorization` header only through its "Request headers" setting, which Anthropic's connector docs describe as a beta available to a limited set of organizations. If the Add custom connector dialog has no Request headers section, the account doesn't have it. The options then are:
   - a minimal OAuth flow inside the app: two well-known metadata routes, an `/authorize` page behind the owner's login, a `/token` route, PKCE, and a client ID entered in the connector's settings. mcp-handler and the SDK only cover the resource side, so this is our code.
   - a long secret in the URL path with "No sign-in". It works today, but URLs end up in logs.
   - using the server only from Claude Code, which supports `--header`.

   Connector auth settings can't be edited after adding, so rotating `MCP_TOKEN` means removing and re-adding the connector.
2. **MCP packages (section 2 defaults).** Use `@modelcontextprotocol/server` 2.x, with `mcp-handler` 2.x if it fits. Not `@modelcontextprotocol/sdk`.
3. **"Skip the auth middleware" (section 7).** In Next.js 16 that's the `proxy.ts` matcher. It must exclude `/api/scale` and `/api/mcp`.
4. **Supabase key names (section 3).** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_...`) and `SUPABASE_SECRET_KEY` (`sb_secret_...`).
   - Supabase is retiring the legacy `anon` and `service_role` keys by the end of 2026, and new projects don't get them.
   - The secret key is rejected when the request has a browser User-Agent, and it goes in the `apikey` header.
   - Locally, `supabase status -o env` prints the keys as `PUBLISHABLE_KEY` and `SECRET_KEY`.
5. **Supabase server-side checks.** Supabase now says to protect pages and data with `supabase.auth.getClaims()`, which verifies the JWT locally with the project's asymmetric signing keys (the default for new projects). Use `getUser()` only when a fresh user record is needed. In 0.12, the cookie `setAll` callback gets a second argument with cache headers that the proxy must copy onto its response.
6. **Turning sign-ups off (section 2).**
   - Locally it's `[auth] enable_signup = false`. Don't use `[auth.email] enable_signup`: it switches the whole email provider off, so the owner couldn't sign in either. CLI v3 deprecates it.
   - On the hosted project it's "Allow new users to sign up" under Authentication.
   - Proposal: keep sign-ups off from the start and create the owner in the Supabase dashboard. Turning them on and then off leaves a window where anyone can register.
7. **Long-lived session: works by default.** Access tokens last an hour, and refresh tokens never expire (each one can be used once). Session time-box and inactivity timeout are paid-plan features and aren't needed.
8. **Free-plan pausing (section 10): still 7 days of low activity.** API calls count as activity, so daily scale posts should keep the project awake. Supabase doesn't publish the exact threshold. A paused project can be resumed from the dashboard for up to a year.
9. **Photos (6.9).** Supabase image transformations aren't on the Free plan, which confirms the spec's client-side resize and separate thumbnail. `createSignedUrl` and `createSignedUrls` are unchanged.
10. **Tailwind (section 2).** The section 4 tokens go in `@theme` in the global CSS file. Tailwind 4 has no config file for them.
11. **Vercel deployment protection (section 7).**
    - New projects now default to Vercel Authentication on everything except production domains.
    - On the spike, the `<project>.vercel.app` production URL is public, and each per-deployment URL redirects to Vercel's login.
    - So the ESP32 and Claude must use the production domain, as the spec already says.
12. **TypeScript settings.** Pin TypeScript 6.0.x until typescript-eslint supports 7. When Next.js generates `tsconfig.json` itself it sets `"strict": false`, so Phase 1 must turn strict mode on.
13. **ESP32: `profile_id` lagged one reading, so the bridge no longer sends it.** In ESPHome 2026.10.2, `xiaomi_body_scale.cpp` publishes the weight (line 129) before the profile ID (line 135).
    - `on_value` therefore built the JSON while `scale_profile` still held the previous reading's profile. The first post after boot had no `profile_id`, and every later post carried the previous reading's profile.
    - No rule in the spec uses it, so `scale-bridge.yaml` no longer reads it, posts carry only `weight_kg`, and the schema in section 4 has no column for it.
    - The spec still lists it in section 5 (`weigh_ins`) and section 7 (the request body).
14. **Design gaps.**
    - The Settings design has no rows for time zone, rest rule or sign-out, though the spec lists all three.
    - The Day design shows a workout label ("Trained · Pull") and "+0.9 vs last week", and the spec defines neither.
    - Settings shows the scale as "Connected", which the app can't know: the ESP32 only posts when someone steps on the scale. See section 6.

## 3. The spike

Live at **https://gym-tracker-spike.vercel.app**. The source is in `spike/`, deployed as its own Vercel project (`gym-tracker-spike`), which isn't connected to GitHub. Delete both after the tests, but only once the scale bridge posts to the real app (see the scale test below).

One page runs three tests, each with its own instructions:

- **Dictation.** A text box with the attributes the Log box will probably use: autocorrect, autocapitalize and spellcheck off, and a "send" return key. It shows the live value, every submitted value JSON-escaped with any non-ASCII characters listed as code points, whether an Enter keydown fired, and the last input events.
- **Camera.** `getUserMedia` with a ghost outline at 35% opacity over the video, a front/back flip, and the delivered resolution. It also shows the camera permission state at page load (Permissions API), which makes "does it ask every launch" measurable.
- **Session.** "Sign in" sets two cookies with the same attributes `@supabase/ssr` uses (path `/`, SameSite Lax, not HttpOnly, 400-day Max-Age). One is set by the server, the way the Supabase server client does it, and one by `document.cookie`, the way the browser client does. The card shows both, plus what the server saw on this load and when the server rendered the page.

Already checked here:
- The production build passes, including a strict type check.
- The production URL is public. The manifest, theme color, Home Screen meta tags and apple-touch-icon are served.
- Sign-in sets the cookie, the server reads it back on the next load, and sign-out clears it.
- In a 375 px browser, the page hydrates without console errors, Return submits the text box, and a curly apostrophe is reported as `U+2019`.

The camera and the Home Screen behaviour can only be tested on the phone.

### What iOS is documented to do

Sources are Apple and WebKit where they exist; "reported" means bug reports or forums. iOS 27.2 is current, and a phone still on 26.x lacks some 27.x fixes, so the report should include the iOS version.

- **Camera.**
  - `getUserMedia` works in Home Screen apps.
  - Expect a permission prompt on every cold launch. Safari's per-site "Allow" setting doesn't cover Home Screen apps (WebKit bug 215884), and a prompt on every launch is reported on iOS 26.6.2 (bug 327237).
  - If the test confirms it, Phase 4 has to choose: one tap a day for the live camera with the ghost overlay, or the file-input fallback, which never prompts but has no overlay.
  - The permission line can read "prompt" even after a denial, so what you saw on screen is the real answer.
  - In portrait the track may report 1920 x 1080 before the first frame and 1080 x 1920 after.
- **Cookies.**
  - The app keeps its own cookies, separate from Safari's, but since iOS 17.2 it copies Safari's cookies once, when it's added. That's why the checklist signs in inside the app.
  - Cookies set by the server aren't capped. Cookies written with `document.cookie` live at most 7 days, and the Supabase browser client writes the session that way. So Phase 1 should keep Supabase on the server (section 6, row 11).
  - Before iOS 27.2, a custom domain set up as a CNAME could also get 7-day login cookies.
- **Wispr Flow.** Wispr's help pages say its keyboard switches to the Flow app to record and then comes back. It also steps aside for the system keyboard in number, email and phone fields, so the Log box must stay a plain text field.
- **File-input fallback.** `capture="user"` opens the front camera and a bare `capture` opens the rear one. Camera shots arrive as JPEG, but photos picked from the library can stay HEIC.

### Checklist (on the iPhone)

1. In Safari, open the URL. Tap Share, then Add to Home Screen. Leave "Open as Web App" on, then tap Add.
2. Open GT Spike from the Home Screen. The line under the title must say "Running as a Home Screen app". If it says Safari tab, stop there.
3. **Dictation.** Tap the box, switch to the Wispr Flow keyboard, dictate "bench press, first set, fifty pounds, eight reps" and tap return. Repeat with "incline db 70 x 8", "OHP 115 lbs 7 reps" and "weighted pull ups plus 45 for 6". Screenshot the card. If Flow jumps to its own app to record, note whether the text still arrived, and whether the "Page rendered" time in the Session card changed (a change means the app reloaded).
4. **Camera, first run.** Tap Start camera. Did iOS ask for permission? Allow it. You should see the live video with a faint outline over it. Tap Flip to check the back camera, and screenshot the card (it shows the resolution).
5. **Camera, relaunch.** Swipe GT Spike away in the app switcher and open it again. Note the "Camera permission" line, then tap Start camera. Did iOS ask again? Do this twice.
6. **Session.** If the card already shows a sign-in time, tap Sign out first. Then tap Sign in, here in the app rather than in Safari. Swipe the app away and reopen it. Do all three lines still show the same sign-in time, under a newer "Page rendered" time?
7. Optional: restart the phone and repeat step 6.
8. On a computer, open claude.ai, Customize, Connectors, Add custom connector. Is there a "Request headers" section? Don't add anything. This decides the MCP auth question in section 6.
9. When you report back, include the iOS version (Settings, General, About).

### Scale test

Added because the ESPHome component is new and the scale could still be returned. **It works:** the bridge decoded a weigh-in, the post reached Vercel, and the decoded weight matched the scale's display.

- **Setup.** `esp32/scale-bridge.yaml` without `profile_id` (section 2, item 13), built with ESPHome 2026.10.2 and flashed over USB, with `secrets.yaml` pointing at the spike's production URL. The spike's temporary `POST /api/scale` (`spike/app/api/scale/route.ts`) compares `X-Scale-Token` with `SCALE_INGEST_TOKEN` in constant time, refuses a `Content-Length` over 1 KB, logs the body and returns 201.
- **Result.** One weigh-in gave one post. The board logged the weight and `HTTP 201`, and Vercel's runtime log shows a production `POST /api/scale` whose body held only `weight_kg`. The component ignores repeat broadcasts of a frame it has already decoded.
- **Not tested:** a failed post, updating the board over Wi-Fi, and running for days without a restart.
- **Next.** When Phase 1's `/api/scale` is live, put its URL and a new token in `secrets.yaml` and update the board over Wi-Fi. Delete the spike project only after that, so the board never posts to an address the project no longer owns.

Setup notes worth adding to `esp32/README.md`:
- `pipx install esphome` failed under Homebrew's Python 3.15 while building `ruamel.yaml.clib`. Pointing pipx at a Python 3.14 interpreter (`--python /path/to/python3.14`) worked.
- The build sets up ESP-IDF's Python packages with `uv` if one is on the PATH. A mise `uv` shim with no version selected is on the PATH but fails; selecting a version (this test used `MISE_UV_VERSION=0.12.7`) fixes it.
- macOS asks whether to allow a newly connected accessory, and the board's serial port only appears after you allow it.

## 4. Proposed schema

Principles:
- **One owner per deployment**, so no table carries a user id. RLS lets a signed-in user through only if they're the owner recorded in `settings`. Server routes without a session (scale ingest, MCP) use the secret key, server-side only.
- **Store what was entered** (value and unit) plus a generated kg column, through one shared `to_kg()` function.
- **Every per-day row has a `day` column**, computed by the server.
- **Enums for the fixed value lists**, so generated types come out as TypeScript unions.
- **No secondary indexes yet.** Every table stays in the thousands of rows. Add an index only when a query plan shows a need.

Changes from the spec's starting point:
1. **`sets` has no stored set number.** It's derived as the row number per day and exercise, in insert order. Deleting or editing a set then never leaves a gap or needs renumbering, and "today's count plus one" is always true.
2. **`weigh_ins.flag` is one nullable value**, `duplicate` or `outlier`, rather than two flags. A reading needs only one reason to be excluded. The duplicate check runs first, because it decides between 200 and 201.
3. **One manual weight per day.** Editing it updates the row.
4. **`settings` is exactly one row**, created on the owner's first sign-in with the browser's time zone and today as the start date.
5. **The database enforces the skip rules:** a skip reason has at least 20 characters after trimming, skips can't be deleted, and only the reason can be edited.
6. **Add-on periods can't overlap**, and each add-on has at most one open period.
7. **Aliases are stored in the parser's normalized form**: lowercase letters and single spaces, so "pull-up" is stored as "pull up". Lookup is then an exact match.
8. **`weigh_ins` has no profile ID**, since the scale bridge no longer sends one (section 2, item 13).

```sql
create extension if not exists btree_gist with schema extensions;

create type public.weight_unit as enum ('lb', 'kg');
create type public.rest_rule as enum ('six_of_seven', 'strict');
create type public.day_mark_kind as enum ('rest', 'skip');
create type public.resolved_via as enum ('normal', 'lock');
create type public.weigh_in_source as enum ('scale', 'manual');
create type public.weigh_in_flag as enum ('duplicate', 'outlier');

create function public.to_kg(value numeric, unit public.weight_unit)
returns numeric
language sql
immutable
parallel safe
return case unit when 'kg' then value else value * 0.45359237 end;

create function public.training_day(at timestamptz, time_zone text, rollover_hour integer)
returns date
language sql
immutable
parallel safe
return ((at at time zone time_zone) - make_interval(hours => rollover_hour))::date;

create table public.settings (
  singleton boolean primary key default true check (singleton),
  owner_id uuid not null unique references auth.users (id),
  unit public.weight_unit not null,
  time_zone text not null,
  rollover_hour smallint not null default 4 check (rollover_hour between 0 and 23),
  rest_rule public.rest_rule not null default 'six_of_seven',
  start_date date not null,
  created_at timestamptz not null default now()
);

create table public.exercises (
  id bigint generated always as identity primary key,
  name text not null check (name = btrim(name) and name <> ''),
  is_bodyweight boolean not null default false,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index exercises_name_key on public.exercises (lower(name));

create table public.exercise_aliases (
  alias text primary key check (alias ~ '^[a-z]+( [a-z]+)*$'),
  exercise_id bigint not null references public.exercises (id) on delete cascade
);

create table public.sets (
  id bigint generated always as identity primary key,
  day date not null,
  exercise_id bigint not null references public.exercises (id),
  load_value numeric(6, 2) not null check (load_value >= 0),
  load_unit public.weight_unit not null,
  load_kg numeric(7, 3) generated always as (public.to_kg(load_value, load_unit)) stored,
  reps smallint not null check (reps > 0),
  raw_input text not null,
  created_at timestamptz not null default now()
);

create table public.weigh_ins (
  id bigint generated always as identity primary key,
  measured_at timestamptz not null default now(),
  day date not null,
  value numeric(6, 2) not null,
  unit public.weight_unit not null,
  kg numeric(7, 3) generated always as (public.to_kg(value, unit)) stored,
  source public.weigh_in_source not null,
  flag public.weigh_in_flag,
  check (kg between 20 and 300),
  check (source = 'scale' or flag is null)
);
create unique index weigh_ins_one_manual_per_day on public.weigh_ins (day) where source = 'manual';

create table public.day_marks (
  day date primary key,
  kind public.day_mark_kind not null,
  reason text,
  resolved_via public.resolved_via not null default 'normal',
  created_at timestamptz not null default now(),
  check (
    (kind = 'skip' and reason is not null and char_length(btrim(reason)) >= 20)
    or (kind = 'rest' and reason is null)
  )
);

create table public.photos (
  day date primary key,
  storage_path text not null,
  thumb_path text not null,
  taken_at timestamptz not null default now()
);

create table public.addons (
  id bigint generated always as identity primary key,
  name text not null check (name = btrim(name) and name <> ''),
  created_at timestamptz not null default now()
);
create unique index addons_name_key on public.addons (lower(name));

create table public.addon_periods (
  id bigint generated always as identity primary key,
  addon_id bigint not null references public.addons (id) on delete cascade,
  details text not null default '',
  start_day date not null,
  end_day date check (end_day >= start_day),
  exclude using gist (addon_id with =, daterange(start_day, end_day, '[]') with &&)
);

create schema private;

create function private.is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
return exists (select 1 from public.settings where owner_id = auth.uid());

revoke execute on function private.is_owner() from public;
grant usage on schema private to authenticated;
grant execute on function private.is_owner() to authenticated;

alter table public.settings enable row level security;
create policy owner_reads on public.settings for select to authenticated
  using (owner_id = (select auth.uid()));
create policy owner_updates on public.settings for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy first_sign_in_claims on public.settings for insert to authenticated
  with check (owner_id = (select auth.uid()));

-- Then, for each of exercises, exercise_aliases, sets, weigh_ins, day_marks, photos,
-- addons and addon_periods:
alter table public.sets enable row level security;
create policy owner_only on public.sets for all to authenticated
  using ((select private.is_owner())) with check ((select private.is_owner()));

revoke delete, update on public.day_marks from authenticated;
grant update (reason) on public.day_marks to authenticated;
```

It ran clean on PostgreSQL 17.11 with stand-ins for Supabase's `auth` schema and roles. The assertions covered:
- **Training day:** 11 cases, including both daylight-saving switches, 03:59 vs 04:00, month and year boundaries, rollover hour 0 and a half-hour-offset zone.
- **Generated kg:** 185 lb is stored as 83.915 kg.
- **Rejected as intended:** a second settings row, a duplicate exercise name in another case, non-normalized aliases, zero reps, a second manual weight for a day, a weight over 300 kg, a flag on a manual weight, a skip with no reason or a short one, a rest day with a reason, overlapping or doubly-open add-on periods, and an end date before the start.
- **RLS:** a second user and `anon` see nothing and can't insert. The owner can edit a skip's reason but can't delete the skip or turn it into a rest day.

Not in the proposal yet: the Storage bucket and its policies (Phase 4).

The business rules stay as pure TypeScript functions with tests: day status, rest rule, weight flags, day weight, trend, e1RM, set numbering and period changes. The SQL `training_day` exists because 6.1 asks for both versions, tested against one shared case list.

## 5. Proposed folder structure

```
.
├── docs/                     SPEC.md, phase-0.md
├── design/                   reference only, never imported
├── esp32/                    unchanged
├── supabase/
│   ├── config.toml           [auth] enable_signup = false
│   └── migrations/           every schema change, from `supabase migration new`
├── scripts/
│   └── seed.ts               npm run seed; refuses to run against a non-local URL
├── src/
│   ├── proxy.ts              refreshes the session, sends signed-out requests to /login,
│   │                         skips /api/scale, /api/mcp and static files
│   ├── app/
│   │   ├── layout.tsx        fonts, metadata, viewport
│   │   ├── manifest.ts
│   │   ├── apple-icon.png
│   │   ├── globals.css       Tailwind and the @theme tokens
│   │   ├── login/page.tsx
│   │   ├── resolve/page.tsx  missed-day lock (6.5)
│   │   ├── (app)/            everything behind the lock
│   │   │   ├── layout.tsx    redirects to /resolve while a past day is unresolved
│   │   │   ├── (tabs)/       screens with the tab bar
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── page.tsx                 Home
│   │   │   │   ├── log/page.tsx             ?date= for days entered from the lock
│   │   │   │   ├── calendar/page.tsx
│   │   │   │   └── addons/page.tsx
│   │   │   ├── log/skip/page.tsx
│   │   │   ├── day/[date]/page.tsx
│   │   │   ├── compare/page.tsx
│   │   │   ├── photo/page.tsx
│   │   │   ├── addons/new/page.tsx
│   │   │   ├── addons/[id]/page.tsx
│   │   │   └── settings/page.tsx
│   │   └── api/
│   │       ├── scale/route.ts
│   │       └── mcp/route.ts  Phase 6
│   ├── rules/                pure business rules with *.test.ts next to them;
│   │                         no imports from React, Next.js or Supabase
│   ├── server/               server-only: Supabase clients, env validation,
│   │                         queries and server actions by feature
│   └── components/           shared UI (tab bar, cards, status dots, sheets)
└── .env.example
```

Notes:
- The route groups follow the designs. Only Home, Log, Calendar and Add-ons have the tab bar. Everything else is a full-screen page with a back or close button.
- Server actions check the session themselves. A layout's redirect doesn't protect an action.
- `npm test` runs the unit tests. `npm run test:db` runs the same `training_day` cases against the local Supabase stack through an RPC call, so it needs no extra database client.
- `.gitignore` ignores every directory named `photos/`, so no code folder may use that name.

## 6. Decisions for you

| # | Question | My recommendation |
|---|---|---|
| 1 | MCP auth if your account has no Request headers | A minimal OAuth flow in the app (option 1 in section 2). Decide in Phase 6. |
| 2 | Day screen's "Trained · Pull" label: the spec has no workout type | Drop it for now. |
| 3 | Day screen's "+0.9 vs last week" | Keep it, defined as this 7-day average minus the one from 7 days earlier. |
| 4 | Trend (6.6): "the average of the daily weights over the last 7 days that have one" | The 7 calendar days ending that day, averaging those that have a weight. No weights in the window means no trend. |
| 5 | Settings rows missing from the design (time zone, rest rule, sign-out) | Add them in the existing row style. |
| 6 | Scale status says "Connected" | Show the last reading's time instead, highlighted after 2 days without one. |
| 7 | Default unit for a new owner | Set it on first sign-in from the browser's region (US gives lb, anything else kg), changeable in Settings. |
| 8 | Stored set numbers vs derived | Derived (section 4, change 1). |
| 9 | Creating the owner | Sign-ups never on. Create the owner in the Supabase dashboard (or the seed script locally). |
| 10 | Dependencies the spec doesn't name | `eslint` and `eslint-config-next` (CLAUDE.md requires lint), `@supabase/supabase-js` (needed by `@supabase/ssr`), `supabase` as a dev dependency to pin the CLI version, and in Phase 6 `@modelcontextprotocol/server` with `mcp-handler`. |
| 11 | Supabase client in the browser | Don't use one. Keep Supabase calls in server components, server actions and route handlers, so only the server writes the session cookies and iOS's 7-day cap on JavaScript-written cookies never applies. Photo uploads can go through the server or a signed upload URL. |
