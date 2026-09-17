import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/database.types";

// Server Component / Server Action client. Reads the session from cookies
// set by proxy.ts. Writes are swallowed when called from a Server Component
// (cookies can only be set from a Server Action, Route Handler, or proxy) —
// proxy.ts is what actually keeps the session refreshed.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component - proxy.ts handles refresh instead.
          }
        },
      },
    }
  );
}
