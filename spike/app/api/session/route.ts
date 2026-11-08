import { NextResponse } from "next/server";

const SERVER_COOKIE = "spike_session";
const FOUR_HUNDRED_DAYS = 400 * 24 * 60 * 60;

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SERVER_COOKIE, new Date().toISOString(), {
    path: "/",
    sameSite: "lax",
    httpOnly: false,
    secure: true,
    maxAge: FOUR_HUNDRED_DAYS,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SERVER_COOKIE);
  return response;
}
