import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSecretClient } from "@/server/supabase";
import { fakeSupabase } from "@/test-support/fake-supabase";
import { POST } from "./route";

vi.mock("@/server/supabase", () => ({ createSecretClient: vi.fn() }));

const TOKEN = "test-mcp-token";

function rpc(method: string, params: unknown, authorization: string | null = `Bearer ${TOKEN}`) {
  const headers = new Headers({
    "content-type": "application/json",
    accept: "application/json, text/event-stream",
    "mcp-protocol-version": "2025-06-18",
  });
  if (authorization) {
    headers.set("authorization", authorization);
  }
  return new Request("http://localhost/api/mcp", {
    method: "POST",
    headers,
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
}

async function result(response: Response) {
  const text = await response.text();
  const data = text.split("\n").find((line) => line.startsWith("data: "));
  return JSON.parse(data ? data.slice("data: ".length) : text).result;
}

beforeEach(() => {
  vi.stubEnv("MCP_TOKEN", TOKEN);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});

describe("POST /api/mcp", () => {
  it.each([
    ["no Authorization header", null],
    ["a wrong token", "Bearer wrong-token"],
    ["the token without the Bearer scheme", TOKEN],
    ["another scheme", `Basic ${TOKEN}`],
  ])("refuses %s", async (_case, authorization) => {
    const response = await POST(rpc("tools/list", {}, authorization));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "unauthorized" });
    expect(createSecretClient).not.toHaveBeenCalled();
  });

  it("lists the read-only tools for the right token", async () => {
    const response = await POST(rpc("tools/list", {}));

    expect(response.status).toBe(200);
    const { tools } = await result(response);
    expect(tools.map((tool: { name: string }) => tool.name)).toEqual([
      "get_overview",
      "get_weights",
      "get_sets",
      "get_exercise_history",
      "get_days",
      "get_addons",
    ]);
    expect(tools.every((tool: { annotations: { readOnlyHint: boolean } }) => tool.annotations.readOnlyHint)).toBe(
      true,
    );
  });

  it("answers a tool call from the database", async () => {
    const { client, calls } = fakeSupabase({
      settings: [
        {
          data: { unit: "kg", time_zone: "UTC", rollover_hour: 4, rest_rule: "six_of_seven", start_date: "2026-11-01" },
          error: null,
        },
      ],
      addons: [
        {
          data: [
            {
              id: 1,
              name: "Creatine",
              addon_periods: [{ id: 1, details: "5 g", start_day: "2026-11-01", end_day: null }],
            },
          ],
          error: null,
        },
      ],
    });
    vi.mocked(createSecretClient).mockReturnValue(client as unknown as ReturnType<typeof createSecretClient>);

    const response = await POST(rpc("tools/call", { name: "get_addons", arguments: {} }));

    const { content, isError } = await result(response);
    expect(isError).toBeFalsy();
    expect(JSON.parse(content[0].text).addons).toEqual([
      { name: "Creatine", periods: [{ details: "5 g", start: "2026-11-01", end: null }] },
    ]);
    expect(calls).toContainEqual(["select", "unit, time_zone, rollover_hour, rest_rule, start_date"]);
  });
});
