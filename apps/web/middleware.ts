import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/pricing(.*)",
  "/blog(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/v1/webhooks/(.*)",
  "/api/health",
]);

const isAdminRoute = createRouteMatcher(["/admin(.*)", "/api/v1/admin(.*)"]);

export default clerkMiddleware(async (auth, req: NextRequest) => {
  // Always let public routes through without auth checks
  if (isPublicRoute(req)) return NextResponse.next();

  try {
    const { userId, sessionClaims } = await auth();

    if (!userId) {
      const signInUrl = new URL("/sign-in", req.url);
      signInUrl.searchParams.set("redirect_url", req.url);
      return NextResponse.redirect(signInUrl);
    }

    if (isAdminRoute(req)) {
      const role = (sessionClaims?.metadata as { role?: string })?.role;
      if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }
  } catch {
    // If Clerk auth fails on a protected route, redirect to sign-in
    const signInUrl = new URL("/sign-in", req.url);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
