import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Next.js 16 renamed middleware.ts -> proxy.ts (same execution model).
// This keeps the Supabase session cookie refreshed on every request and
// redirects unauthenticated visitors away from the authenticated app shell.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthRoute = request.nextUrl.pathname.startsWith("/login");
  const isMarketingRoute = request.nextUrl.pathname === "/";
  const isPublicRoute = isAuthRoute || isMarketingRoute;

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // A Server Action request (e.g. the login form's own loginToBackend call, made right after
  // Supabase sign-in succeeds) is also a request to /login and would otherwise get redirected
  // away here before it ever reaches the action handler — breaking the backend-session bridge.
  const isServerAction = request.headers.get("next-action") !== null;

  if (user && (isMarketingRoute || (isAuthRoute && !isServerAction))) {
    const url = request.nextUrl.clone();
    url.pathname = "/outsourcing";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
