import { getSessionContext } from "@/lib/regstack/session";
import { AppShell } from "@/components/app-shell";
import { SignOutButton } from "@/components/sign-out-button";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getSessionContext();

  // proxy.ts guarantees an authenticated auth user here; a null ctx means
  // that auth user has no Stammdaten (persons) row yet.
  if (!ctx) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 text-center">
        <div className="max-w-sm">
          <p className="text-sm text-foreground">
            Ihr Konto ist angemeldet, aber es existiert noch kein Stammdaten-Eintrag
            (persons) dafür.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Ein Institution Admin muss Sie zunächst in den Stammdaten anlegen.
          </p>
          <div className="mt-4">
            <SignOutButton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <AppShell fullName={ctx.fullName} email={ctx.email} roles={ctx.roles}>
      {children}
    </AppShell>
  );
}
