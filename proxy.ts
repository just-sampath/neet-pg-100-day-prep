import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE } from "@/lib/auth/session";
import { getRuntimeMode } from "@/lib/runtime/mode";
import { updateSupabaseSession } from "@/lib/supabase/proxy";

const PUBLIC_PATHS = new Set(["/login"]);

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.has(pathname);
  const isAsset =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico" ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/sw.js" ||
    pathname === "/offline.html" ||
    pathname.startsWith("/icon") ||
    pathname.startsWith("/apple-icon") ||
    pathname.startsWith("/icons/");

  if (isAsset) {
    return NextResponse.next();
  }

  if (getRuntimeMode() === "supabase") {
    const { response, user } = await updateSupabaseSession(request);

    if (!user && !isPublic) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    if (user && isPublic) {
      return NextResponse.redirect(new URL("/today", request.url));
    }

    return response;
  }

  const sessionId = request.cookies.get(SESSION_COOKIE)?.value;
  if (!sessionId && !isPublic) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (sessionId && isPublic) {
    return NextResponse.redirect(new URL("/today", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
