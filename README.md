# Gym tracker

A personal, mobile-first gym tracker that runs as an iPhone home-screen web app. Each deployment has one owner. The product and build spec is in [docs/SPEC.md](docs/SPEC.md).

## Connect Claude

The app has a read-only [MCP](https://modelcontextprotocol.io) server at `/api/mcp`, so Claude can analyze your weights, sets, days and add-ons. It never returns photos or links to them, only whether a day has one.

### 1. Set a token

Generate a long random token:

```bash
openssl rand -hex 32
```

Add it to your Vercel project as the sensitive environment variable `MCP_TOKEN` and redeploy. For local development, add `MCP_TOKEN` to `.env.local` as well.

### 2. Add the connector

On claude.ai, go to **Customize > Connectors**, select **Add**, then **Add custom connector**, and fill it in:

- **Name**: anything, such as "Gym tracker".
- **URL**: `https://<your-app>.vercel.app/api/mcp`. Use the production domain, because Vercel puts a login in front of preview URLs.
- **Authentication**: **No sign-in**.
- **Request headers**: add `authorization` with the value `Bearer <your token>`, including the space after `Bearer`.

Request headers are a beta that not every Claude account has. Without them, connect from Claude Code instead: the app doesn't offer OAuth sign-in.

You can't change the header of an existing connector, and Claude doesn't show it again. To rotate the token, change `MCP_TOKEN`, redeploy, then remove the connector and add it again.

### Claude Code

```bash
claude mcp add --transport http gym-tracker https://<your-app>.vercel.app/api/mcp --header "Authorization: Bearer <your token>"
```

### Tools

| Tool | Returns |
| --- | --- |
| `get_overview` | Today's training day, the tracking start date, settings, day counts by status, record counts and the latest weight. |
| `get_weights(from, to)` | Each day's weight and its 7-day average. |
| `get_sets(from, to, exercise?)` | Every set, grouped by day and exercise. |
| `get_exercise_history(exercise)` | Each day an exercise was trained: set count, top set and estimated one-rep max (Epley). |
| `get_days(from, to)` | Each tracked day's status (trained, rest, skipped, unresolved or in progress), skip reasons, and whether a photo exists. |
| `get_addons()` | Every add-on period with its details and dates. |

Weights and loads are in the owner's unit, which each response states. Date ranges are `YYYY-MM-DD` and cover at most 366 days per call. Days follow the app's training day, which starts at the rollover hour in the owner's time zone.
