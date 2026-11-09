import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Database, Tables } from "@/database.types";
import { createSecretClient } from "@/server/supabase";
import { POST } from "./route";

vi.mock("@/server/supabase", () => ({ createSecretClient: vi.fn() }));

const TOKEN = "test-scale-token";
const NOW = new Date("2026-11-08T07:30:00Z");
const newYork = { time_zone: "America/New_York", rollover_hour: 4 };

type Settings = Pick<Tables<"settings">, "time_zone" | "rollover_hour">;
type Recent = Pick<Tables<"weigh_ins">, "measured_at" | "kg" | "source" | "flag">;

function fakeSupabase(settings: Settings | null, recent: Recent[] = []) {
  const calls: unknown[][] = [];
  const client = {
    from(table: string) {
      calls.push(["from", table]);
      return {
        select(columns: string) {
          calls.push(["select", columns]);
          return {
            maybeSingle: async () => ({ data: settings, error: null }),
            gte: async (column: string, value: string) => {
              calls.push(["gte", column, value]);
              return { data: recent, error: null };
            },
          };
        },
        insert(row: Record<string, unknown>) {
          calls.push(["insert", row]);
          return { select: () => ({ single: async () => ({ data: { id: 1, ...row }, error: null }) }) };
        },
      };
    },
  };
  vi.mocked(createSecretClient).mockReturnValue(client as unknown as SupabaseClient<Database>);
  return calls;
}

function scaleRequest(body: string, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/scale", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "content-length": String(Buffer.byteLength(body)),
      "x-scale-token": TOKEN,
      ...headers,
    },
    body,
  });
}

function minutesAgo(minutes: number) {
  return new Date(NOW.getTime() - minutes * 60_000).toISOString();
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  vi.stubEnv("SCALE_INGEST_TOKEN", TOKEN);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.mocked(createSecretClient).mockReset();
});

describe("POST /api/scale", () => {
  it("stores a reading on the owner's training day and returns 201", async () => {
    const calls = fakeSupabase(newYork);
    const response = await POST(scaleRequest('{"weight_kg":80.1}'));

    const row = {
      measured_at: "2026-11-08T07:30:00.000Z",
      day: "2026-11-07",
      value: 80.1,
      unit: "kg",
      source: "scale",
      flag: null,
    };
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ id: 1, ...row });
    expect(calls).toEqual([
      ["from", "settings"],
      ["select", "time_zone, rollover_hour"],
      ["from", "weigh_ins"],
      ["select", "measured_at, kg, source, flag"],
      ["gte", "measured_at", "2026-10-25T07:30:00.000Z"],
      ["from", "weigh_ins"],
      ["insert", row],
    ]);
  });

  it("stores a repeat broadcast as a duplicate and returns 200", async () => {
    const calls = fakeSupabase(newYork, [{ measured_at: minutesAgo(2), kg: 80.1, source: "scale", flag: null }]);
    const response = await POST(scaleRequest('{"weight_kg":80.1}'));

    expect(response.status).toBe(200);
    expect(calls.at(-1)).toEqual(["insert", expect.objectContaining({ flag: "duplicate" })]);
  });

  it("stores someone else's weight as an outlier and returns 201", async () => {
    const calls = fakeSupabase(newYork, [{ measured_at: minutesAgo(24 * 60), kg: 70, source: "scale", flag: null }]);
    const response = await POST(scaleRequest('{"weight_kg":80.1}'));

    expect(response.status).toBe(201);
    expect(calls.at(-1)).toEqual(["insert", expect.objectContaining({ flag: "outlier" })]);
  });

  it.each([
    ["no token", { "x-scale-token": "" }],
    ["a wrong token", { "x-scale-token": "not-the-token" }],
  ])("rejects %s with 401 before touching the database", async (_name, headers) => {
    const response = await POST(scaleRequest('{"weight_kg":80.1}', headers));
    expect(response.status).toBe(401);
    expect(createSecretClient).not.toHaveBeenCalled();
  });

  it("rejects a body over 1 KB by its Content-Length", async () => {
    const response = await POST(scaleRequest('{"weight_kg":80.1}', { "content-length": "1025" }));
    expect(response.status).toBe(413);
    expect(createSecretClient).not.toHaveBeenCalled();
  });

  it("requires a Content-Length", async () => {
    const request = scaleRequest('{"weight_kg":80.1}');
    request.headers.delete("content-length");
    const response = await POST(request);
    expect(response.status).toBe(411);
  });

  it.each([
    ["not JSON", "weight=80"],
    ["a missing weight", "{}"],
    ["a weight as text", '{"weight_kg":"80.1"}'],
    ["a weight under 20 kg", '{"weight_kg":19.9}'],
    ["a weight over 300 kg", '{"weight_kg":300.1}'],
  ])("rejects %s with 400", async (_name, body) => {
    const response = await POST(scaleRequest(body));
    expect(response.status).toBe(400);
    expect(createSecretClient).not.toHaveBeenCalled();
  });

  it("returns 503 until the owner has signed in once", async () => {
    const calls = fakeSupabase(null);
    const response = await POST(scaleRequest('{"weight_kg":80.1}'));
    expect(response.status).toBe(503);
    expect(calls).toEqual([
      ["from", "settings"],
      ["select", "time_zone, rollover_hour"],
    ]);
  });
});
