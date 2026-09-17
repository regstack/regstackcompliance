"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { logoutFromBackend } from "@/lib/regstack/backend-auth";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await Promise.all([supabase.auth.signOut(), logoutFromBackend()]);
    router.replace("/login");
    router.refresh();
  }

  return (
    <Button variant="ghost" onClick={handleSignOut} className="w-full">
      Abmelden
    </Button>
  );
}
