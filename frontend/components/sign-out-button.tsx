"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { logoutFromBackend } from "@/lib/regstack/backend-auth";
import { Button } from "@/components/ui/button";
import { LogOutIcon } from "@/components/ui/icons";

export function SignOutButton({ variant = "button" }: { variant?: "button" | "link" }) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await Promise.all([supabase.auth.signOut(), logoutFromBackend()]);
    router.replace("/login");
    router.refresh();
  }

  if (variant === "link") {
    return (
      <button
        type="button"
        onClick={handleSignOut}
        className="signout flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
      >
        <LogOutIcon width={13} height={13} strokeWidth={1.8} />
        Abmelden
      </button>
    );
  }

  return (
    <Button variant="ghost" onClick={handleSignOut} className="w-full">
      Abmelden
    </Button>
  );
}
