# Gym tracker: product and build spec

## 1. What this is

A personal, mobile-first web app for tracking gym progress with as little effort as possible. It runs as an iPhone home-screen web app (Safari, "Add to Home Screen"). Each deployment has one owner. The repo will be open source so anyone can deploy their own copy.

The app is the capture layer. Analysis happens in Claude, which reads the data through a read-only MCP server built into the app (Phase 6). So the app needs clean, consistent data more than it needs charts. Keep screens minimal: if a question can be answered by asking Claude, it doesn't need a screen.

What the app captures:

1. **Morning weight**, posted automatically by a smart scale through an ESP32 (see `esp32/`), with manual entry as a fallback.
2. **Sets** (exercise, weight, reps), logged by dictation or typing into one text box, like "bench 185 for 6". The owner dictates with the Wispr Flow keyboard, so the app only ever receives plain text. Set numbers fill in automatically.
3. **A daily physique photo**, taken in the app with a faint overlay of the previous photo so every shot lines up.
4. **Add-ons**: extras the owner is running (preworkout, creatine, cardio, anything), stored as dated periods so changes can be compared later.
5. **Day status**: every day ends up trained, rest or skipped. A rest day is only free when the rest rule allows it. Otherwise skipping needs a written reason. A day that ends with nothing logged locks the app until it's explained.

Out of scope for now: nutrition, sleep or mood check-ins, goals and profile, offline support, social features, rest timers, plate calculators and streaks.

## 2. Stack

Decided:

- **Next.js** (App Router, TypeScript in strict mode), deployed on **Vercel**.
- **Supabase** for Postgres, Auth and Storage. Develop against the local Supabase stack (Supabase CLI) first. Schema changes only go through migrations committed to the repo.
- **Auth**: Supabase email and password, with sign-ups disabled once the owner account exists, and a long-lived session. Do NOT use magic links. On iPhone, a home-screen web app keeps its own cookies separate from Safari, so an emailed link would sign in Safari instead of the app.
- **Fonts**: Barlow (400, 500, 600) and Barlow Condensed (500, 600, 700), loaded with `next/font`.
- **Home-screen app basics**: a web app manifest with `display: standalone`, a dark theme color and an apple-touch-icon. No service worker and no offline mode.

Defaults (change only with a reason, and tell me why):

- Tailwind CSS, with the section 4 design tokens as theme values.
- Zod to validate request bodies.
- Vitest for unit tests.
- The official MCP TypeScript SDK, or Vercel's MCP adapter if it fits Vercel better (Phase 6).

## 3. Environment variables

Document every variable in `.env.example` with fake values:

- Supabase URL, the public key and the server-only secret key. Check Supabase's current key names in Phase 0, since they changed in 2025.
- `SCALE_INGEST_TOKEN`: the shared secret the ESP32 sends in the `X-Scale-Token` header.
- `MCP_TOKEN`: the bearer token for the MCP endpoint (Phase 6).

## 4. Design

The UI was designed in Claude Design. The reference files are in `design/` (see `design/README.md`). They're design markup, not runnable code. Read them for exact layout, spacing, colors, type and copy, then rebuild them as real components. All the sample numbers in them are fake.

Dark theme only. Tokens:

| Token | Value | Used for |
|---|---|---|
| bg | #0D0D0C | page background |
| surface | #171716 | cards, inputs |
| surface-2 | #212120 | chips, icon tiles, secondary buttons |
| surface-todo | #131312 | "still to do today" tiles, with a dashed #4A4A46 border |
| tab-bar | #111110 | bottom navigation |
| border | #262624 | card borders |
| border-input | #2E2E2C | input borders |
| divider | #232321 | rows inside cards |
| text | #F2F1EC | primary text |
| text-2 | #A3A29C | secondary text |
| label | #8A8984 | small uppercase labels, inactive tabs |
| accent | #FF7A1A | primary actions, trained status, active tab |
| on-accent | #0D0D0C | text and icons on accent |
| rest | #5B7690 | rest-day status |
| rest-icon | #8FAAC4 | rest icon on dark tiles |
| error-text | #FFB37A | inline errors |
| note-bg, note-border | #1F1610, #4A2E18 | the add-on "new period" note |

Type: numbers and headings use Barlow Condensed (700 for big numbers), body text uses Barlow. Small labels are Barlow Condensed 600, 12 to 13px, uppercase, with 0.08em letter spacing. Use tabular numbers for every figure.

Shape: cards have radius 16, inputs and buttons 14, small icon buttons 12, and chips are fully round. Every tap target is at least 44px.

Status is never shown by color alone. Trained is a filled orange dot, rest is a filled blue dot, and skipped is a hollow ring.

Screens and routes:

| Design file | Route | Notes |
|---|---|---|
| Main.dc.html | `/` | Home: today strip and widgets |
| Log.dc.html, LogEmpty.dc.html | `/log` | the empty state shows "Not training today" |
| RestDay.dc.html | sheet on `/log` | shown when rest is free |
| SkipReason.dc.html, SkipConfirm.dc.html | `/log/skip` | two steps |
| MissedLock.dc.html, MissedReason.dc.html | `/resolve` | full-screen lock (6.5) |
| Calendar.dc.html | `/calendar?month=YYYY-MM` | |
| Day.dc.html | `/day/[date]` | |
| Compare.dc.html | `/compare?a=DATE&b=DATE` | |
| Camera.dc.html | `/photo` | |
| AddOns.dc.html | `/addons` | |
| AddOnEdit.dc.html | `/addons/new`, `/addons/[id]` | |
| Settings.dc.html | `/settings` | opened from the gear icon on Home |
| TabBar.dc.html | shared component | Home, Log, Calendar, Add-ons |

## 5. Data model

Propose the final schema in Phase 0 for review. Starting point:

- `settings` (one row): owner user id, display unit (`lb` or `kg`), IANA time zone (set from the browser on first sign-in), day rollover hour (default 4), rest rule (6.3), and start date (the first day tracked, set on first sign-in).
- `exercises`: name, `is_bodyweight`, archived.
- `exercise_aliases`: alias (lowercase, unique) and exercise id. Each exercise's own name is also an alias.
- `sets`: day, exercise id, set number, load value, load unit, a generated `load_kg`, reps, the raw input text, created at.
- `weigh_ins`: measured at, day, value, unit, a generated `kg`, source (`scale` or `manual`), and flags (`duplicate`, `outlier`).
- `day_marks`: day (unique), kind (`rest` or `skip`), reason (required for skips), resolved via (`normal` or `lock`), created at. "Trained" isn't stored: a day is trained if it has at least one set.
- `photos`: day, storage path, thumbnail path, taken at. One current photo per day; a retake replaces it.
- `addons` (name) and `addon_periods` (addon id, details, start day, end day, which stays null while active).

Rules for every table:

- Store what was entered (value and unit) plus a generated kg column. Display in the owner's unit, rounded to 0.1.
- Every row that belongs to a day has a `day` date column, computed on the server (6.1). Never compute days on the client.
- Turn on RLS for every table so only the owner can read or write. Server routes that run without a user session (scale ingest, MCP) use the secret key, on the server only.

## 6. Rules

These rules are the core of the app. Write each one as a pure function with unit tests. Cover edge cases: daylight saving changes, month boundaries and the first week of use.

### 6.1 Training day

A "day" runs from the rollover hour (default 4:00 am) until the next rollover, in the owner's time zone. So a set logged at 1:30 am belongs to the previous day. Implement this once in TypeScript and once as a SQL function, and test both against the same cases.

### 6.2 Day status

For each past day from the start date onward:

- `trained` if it has at least one set
- otherwise `rest` or `skipped` if it has a day mark
- otherwise `unresolved`

Today is never unresolved. It's "in progress".

### 6.3 Rest rule

This is a setting with two options. The default is `six_of_seven`.

- `six_of_seven`: a rest day is free if at least 6 of the 7 days before it were trained.
- `strict`: a rest day is free only if all 6 days before it were trained. This stops two rest days in a row after a full week.

Days before the start date count as not trained, so rest stays locked during the first week. When rest isn't free, not training counts as a skip and needs a reason.

### 6.4 Skip

- The reason is required and must be at least 20 characters.
- Next comes a confirm screen, "Is this a valid excuse?". It shows the reason in large text and how many skips there have been in the last 30 days.
- The big button is "I'll train", which goes back to Log. Confirming the skip is a small text link.
- Skips are permanent history. The reason can be edited, but skips are never silently deleted.

### 6.5 Missed-day lock

When the app opens, find unresolved past days (6.2). If there are any, show the full-screen lock before anything else, starting with the oldest day. It can't be dismissed. Each day offers three options:

1. **I trained**: opens Log for that date so the sets can be entered.
2. **It was a rest day**: only shown if the rest rule allowed rest on that date, judged on the history up to that date.
3. **I missed it**: runs the skip flow for that date. If several days are unresolved, offer "use this reason for all N days".

The lock is about training only. A missing photo or weigh-in never locks the app.

### 6.6 Weight

- Scale readings arrive at `POST /api/scale` (section 7).
- The day's weight is the first unflagged reading of that training day. A manual entry for a day overrides the scale reading.
- A reading within 10 minutes of an earlier reading with the same value (within 0.05 kg) is flagged `duplicate`. The scale broadcasts each weigh-in more than once.
- A reading more than 4 kg away from the most recent accepted reading in the last 14 days is flagged `outlier`, because someone else stepped on the scale. Outliers are kept but excluded from everything. If there's no accepted reading in the last 14 days, accept the new one.
- Trend is the average of the daily weights over the last 7 days that have one.

### 6.7 Set parsing

Use a rule-based parser plus the alias table. No AI calls. There's a working prototype in the `parse()` method of `design/Log.dc.html`; port and extend it.

- Input is one sentence of dictated or typed text. Lowercase it, strip punctuation, and accept both digits and number words ("eight").
- Extract:
  - Exercise: match against the aliases, longest match first.
  - Load and unit: `lb`, `lbs`, `pounds`, `kg` or `kilos`, defaulting to the owner's unit.
  - Reps: the number next to "reps" or "times", or the second number in forms like "185 for 6" and "70 x 8".
- Spoken set numbers ("first set", "set 2") are accepted and ignored. The set number is always the count of that exercise's sets today plus one.
- Bodyweight exercises: "pull ups 12 reps" means load 0, and "pull ups plus 45 for 6" means +45.
- Unknown exercise: ask the owner to pick an existing exercise or create a new one, and save the spoken name as an alias so it works next time.
- Unparseable text: show an inline error with an example and keep the text in the box.
- After a set is added, show a "just now" confirmation with Undo. Tapping a set edits it, and swiping deletes it.

The unit tests must include at least these inputs:

- "benchpress: first set, 50lbs 8 reps"
- "Bench press, first set, 50 pounds, 8 reps."
- "bench 185 for 6"
- "8 reps bench press 140lbs"
- "incline db 70 x 8"
- "OHP 115 lbs 7 reps"
- "set 2 bench 185 5"
- "lateral raises 25 for 12"
- "bench press fifty pounds eight reps"
- "pull ups 12 reps"
- "weighted pull ups plus 45 for 6"
- "hello there" (should produce the error)

### 6.8 Add-ons

- Each add-on has one or more periods. Creating an add-on opens a period starting today. The start date is editable and can be in the past.
- Changing the details closes the current period the day before the new start date and opens a new period, so history is never overwritten.
- Stopping an add-on sets its end date, which is editable.
- The Day screen lists the add-ons that were active on that date.

### 6.9 Photos

- Capture in the app with `getUserMedia`. Include a front/back camera toggle, a 3-second self-timer, and a toggleable "ghost" overlay of the previous photo at about 35% opacity.
- If a live camera isn't available, fall back to `<input type="file" accept="image/*" capture>` without the overlay.
- Resize on the client before upload: a JPEG about 1080px wide (quality around 0.8), plus a thumbnail about 200px wide for the calendar.
- Store photos in a private bucket and only serve them through short-lived signed URLs. Never make them public, never put them in the repo, and never send them to the MCP (Phase 6 only reports whether a photo exists).

## 7. Scale ingest

`POST /api/scale`:

- The `X-Scale-Token` header must equal `SCALE_INGEST_TOKEN` (compare in constant time). Otherwise return 401.
- The body is `{ "weight_kg": number }`. Only accept weights from 20 to 300 kg.
- The server sets the timestamp, computes the day, applies the 6.6 flags and stores the reading. It returns 201 with the stored record, or 200 if the reading was flagged as a duplicate.
- Skip the auth middleware for this route. It must work on the production URL: Vercel protects preview URLs by default, so the ESP32 always points at production.
- The Settings screen shows when the last scale reading arrived, so a dead ESP32 gets noticed.

The ESP32 side is already done. `esp32/scale-bridge.yaml` uses only official ESPHome components and sends exactly this body and header. Don't write firmware. See `esp32/README.md`.

## 8. Screens

Match the design files. Behavior notes:

**Home** (`/`):

- **Today strip**, with three tiles:
  - Weigh-in: the scale value and time. Tap it to enter or edit the weight manually.
  - Photo: dashed until taken. Tap it to open the camera.
  - Workout: dashed until the day is trained, rest or skipped.
- **Weight, 14 days**: the change in trend compared with 14 days ago, the rate per week, the trend line with daily dots, and today's 7-day average.
- **Strength, 4 weeks**:
  - Shows the 3 most-logged exercises in the last 28 days.
  - Each one shows the percent change in its best estimated 1RM (Epley: load x (1 + reps / 30)), comparing the last 7 days with the 7 days that ended 21 days ago.
  - Hide an exercise that doesn't have data in both windows.
  - For bodyweight exercises, add the day's bodyweight to the load.
- **Consistency**: trained days out of the last 7, a 7-day strip, whether rest is free, and skips this month.
- **Active add-ons**: chips that show "day N".

**Log** (`/log`):

- Today's exercises as cards with their sets.
- The text box is pinned above the tab bar.
- When nothing is logged yet, a "Not training today" button opens the rest sheet or the skip flow, depending on the rest rule (6.3).

**Calendar** (`/calendar`):

- A month grid. Each cell is filled with the day's photo thumbnail, with the weight on a strip at the bottom and a status marker.
- A cell with no photo gets a dashed outline.
- Tapping a cell opens the Day screen.
- A legend shows the month's counts.

**Day** (`/day/[date]`): the full photo, the weight with its 7-day average, every set grouped by exercise, the add-ons active that day, the skip reason if the day was skipped, and a Compare button.

**Compare** (`/compare`): two day pickers, the two photos side by side with their date and weight, the weight change, and the number of days between them.

**Add-ons** (`/addons`): the active list with details and day count, past periods with their date ranges, and "+" to add one. The edit screen follows 6.8.

**Settings** (`/settings`):

- Unit, day rollover hour, time zone and rest rule.
- Exercises and aliases: add, rename, merge and archive.
- Scale status.
- Sign out.

## 9. MCP server (Phase 6)

- An endpoint inside the same app (for example `/api/mcp`) using the Streamable HTTP transport.
- Auth uses `Authorization: Bearer <MCP_TOKEN>`. Claude custom connectors can send a fixed request header. Claude reaches the server from Anthropic's cloud, so it has to be on the public production URL.
- It's read-only. Suggested tools:
  - `get_overview`: date range, settings and counts.
  - `get_weights(from, to)`: daily weights and trend.
  - `get_sets(from, to, exercise?)`.
  - `get_exercise_history(exercise)`: top sets and e1RM over time.
  - `get_days(from, to)`: status, skip reasons, and whether a photo exists.
  - `get_addons()`: every period.
- Return compact JSON that states its units. Never return photos or signed URLs.

## 10. Seed data and README

- `npm run seed` (local only) creates a fake owner and generic exercises. It also creates about 90 days of plausible fake weights, sets, rest and skip days, add-on periods, and placeholder photos. All of it is obviously fake.
- The README covers:
  - What the app is, with screenshots taken from seed data.
  - Setup: Supabase, Vercel, environment variables, creating the owner account, turning off sign-ups and adding the app to the home screen.
  - A note that free Supabase projects pause after 7 days with no activity. Daily scale posts keep the project awake, but after a long break it has to be restored from the Supabase dashboard.
  - The ESP32 bridge (link to `esp32/README.md`).
  - Connecting the MCP server to Claude.
  - The MIT license.

## 11. Build phases

Stop after each phase and wait for my go-ahead.

**Phase 0: investigation and spikes. No app code yet.**

1. Check current versions and APIs: Next.js, `@supabase/ssr`, the Supabase CLI and key names, the MCP TypeScript SDK or Vercel MCP adapter, and ESPHome (the scale config needs 2026.10.0 or newer). List anything in this spec that's outdated.
2. Build a throwaway spike page and deploy it to Vercel. Then give me a checklist to run on my iPhone from the home-screen app:
   - Dictate into a text input with the Wispr Flow keyboard; the page shows the exact text it received.
   - Run the live camera through `getUserMedia` with a semi-transparent overlay image, and check whether iOS asks for camera permission on every launch.
   - Sign in, fully close the app, then reopen it. Is the session still there?
3. Propose the final schema (section 5), the folder structure, and anything you'd change in this spec. Then stop.

**Phase 1: foundation.** Scaffold the app, local Supabase, migrations, RLS, auth and settings. Add the training-day function with tests, the design tokens, the app shell with the tab bar, the manifest, and a minimal fake seed. Build the scale ingest endpoint with tests, so the ESP32 can start posting real weights as early as possible. Home shows today's weight.

**Phase 2: logging.** Exercises and aliases, the parser with tests, the Log screen, the unknown-exercise flow, and edit, delete and undo.

**Phase 3: day rules.** Day status, the rest rule, the rest sheet, the skip flow, the missed-day lock, and the Calendar and Day screens.

**Phase 4: photos and Home.** The camera with the ghost overlay (or the fallback, depending on Phase 0), storage, thumbnails, Compare, the Home widgets and manual weight entry.

**Phase 5: add-ons.** The Add-ons screens and the period logic.

**Phase 6: MCP server.** The read-only tools, token auth, and a README section on connecting it to Claude.

**Phase 7: open-source pass.** The full seed, screenshots, the README, and a final check that no personal data exists anywhere in the repo or its git history.
