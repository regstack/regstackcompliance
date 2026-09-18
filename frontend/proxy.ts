import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Next.js 16 renamed middleware.ts -> proxy.ts (same execution model).
// This keeps the Supabase session cookie refreshed on every request, splits
// the marketing homepage (regstack.de) from the authenticated app
// (app.regstack.de), and redirects unauthenticated visitors of the app away
// from the authenticated app shell. Local dev and Vercel preview URLs don't
// match either hostname, so they keep serving marketing + app from the same
// host, exactly as before the split.
const APP_HOST = "app.regstack.de";
const MARKETING_HOSTS = new Set(["regstack.de", "www.regstack.de"]);

export async function proxy(request: NextRequest) {
  const hostname = (request.headers.get("host") ?? request.nextUrl.hostname).split(":")[0];
  const pathname = request.nextUrl.pathname;
  const isMarketingHost = MARKETING_HOSTS.has(hostname);
  const isAppHost = hostname === APP_HOST;

  // The marketing domain only ever serves the homepage — every other path
  // (login, the authenticated app) belongs on the app subdomain.
  if (isMarketingHost && pathname !== "/") {
    return NextResponse.redirect(
      new URL(pathname + request.nextUrl.search, `https://${APP_HOST}`)
    );
  }

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

  // The app subdomain has no homepage of its own — send visitors straight
  // into the app shell (login gate handles anonymous vs. authenticated).
  if (isAppHost && pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = user ? "/outsourcing" : "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  const isAuthRoute = pathname.startsWith("/login");
  const isMarketingRoute = pathname === "/" && !isAppHost;
  const isPublicRoute = isAuthRoute || isMarketingRoute;

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // A Server Action request (e.g. the login form's own loginToBackend call, made right after
  // Supabase sign-in succeeds) is also a request to /login and would otherwise get redirected
  // away here before it ever reaches the action handler — breaking the backend-session bridge.
  const isServerAction = request.headers.get("next-action") !== null;

  if (user && isAuthRoute && !isServerAction) {
    const url = request.nextUrl.clone();
    url.pathname = "/outsourcing";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (user && isMarketingRoute) {
    if (isMarketingHost) {
      return NextResponse.redirect(new URL("/outsourcing", `https://${APP_HOST}`));
    }
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
