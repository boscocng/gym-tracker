import { createMcpHandler } from "mcp-handler";
import { NextResponse } from "next/server";
import { requireEnv } from "@/server/env";
import { registerTools } from "@/server/mcp/tools";
import { tokenMatches } from "@/server/token";

const mcp = createMcpHandler(registerTools, { serverInfo: { name: "gym-tracker", version: "0.1.0" } });

function bearerToken(request: Request): string | null {
  return request.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1] ?? null;
}

async function handler(request: Request): Promise<Response> {
  if (!tokenMatches(bearerToken(request), requireEnv("MCP_TOKEN"))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return mcp(request);
}

export { handler as DELETE, handler as GET, handler as POST };
