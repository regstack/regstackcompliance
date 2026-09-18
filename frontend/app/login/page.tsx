"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { loginToBackend } from "@/lib/regstack/backend-auth";
import { Button } from "@/components/ui/button";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    await loginToBackend();

    router.replace(searchParams.get("next") ?? "/outsourcing");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 h-10 w-10 rounded-md bg-copper-500" />
          <h1 className="text-lg font-semibold text-foreground">RegStack</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Compliance-Cockpit — Anmeldung
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-border-subtle bg-surface p-6 shadow-lg"
        >
          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              E-Mail
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-border-strong bg-graphite-950 px-3 py-2 text-sm text-foreground outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
              placeholder="name@institut.de"
            />
          </div>

          <div className="mb-6">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Passwort
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-border-strong bg-graphite-950 px-3 py-2 text-sm text-foreground outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="mb-4 rounded-md border border-status-danger/30 bg-status-danger-bg px-3 py-2 text-xs text-status-danger">
              {error}
            </div>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Anmelden…" : "Anmelden"}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
