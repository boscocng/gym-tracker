import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { requireEnv } from "@/server/env";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet, headers) => {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
          for (const [key, value] of Object.entries(headers)) {
            response.headers.set(key, value);
          }
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  if (data?.claims || request.nextUrl.pathname === "/login") {
    return response;
  }

  const toLogin = NextResponse.redirect(new URL("/login", request.url));
  for (const cookie of response.cookies.getAll()) {
    toLogin.cookies.set(cookie);
  }
  return toLogin;
}

export const config = {
  matcher: ["/((?!api/scale|api/mcp|_next/static|_next/image|favicon.ico|manifest.webmanifest|apple-icon).*)"],
};
