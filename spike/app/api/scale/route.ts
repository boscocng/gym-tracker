import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

const MAX_BODY_BYTES = 1024;

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

function tokenMatches(received: string | null, expected: string): boolean {
  return received !== null && timingSafeEqual(digest(received), digest(expected));
}

export async function POST(request: Request) {
  const expected = process.env.SCALE_INGEST_TOKEN;
  if (!expected) {
    console.error("SCALE_INGEST_TOKEN is not set, rejecting scale post");
    return NextResponse.json({ error: "server misconfigured" }, { status: 500 });
  }
  if (!tokenMatches(request.headers.get("x-scale-token"), expected)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "body too large" }, { status: 413 });
  }
  const body = await request.text();
  console.log(`scale post: ${body}`);
  return NextResponse.json({ ok: true }, { status: 201 });
}
