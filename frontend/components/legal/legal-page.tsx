import Link from "next/link";
import { ShieldIcon } from "@/components/ui/icons";

export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border-subtle">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-gradient-to-br from-copper-400 to-copper-600 text-accent-foreground">
              <ShieldIcon width={16} height={16} strokeWidth={1.8} />
            </div>
            <span className="text-sm font-semibold tracking-wide text-foreground">RegStack</span>
          </Link>
          <nav className="flex gap-4 text-xs text-muted-foreground">
            <Link href="/impressum" className="hover:text-copper-400">
              Impressum
            </Link>
            <Link href="/datenschutz" className="hover:text-copper-400">
              Datenschutz
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
          <div className="prose-legal mt-8 space-y-6 text-sm leading-relaxed text-foreground">{children}</div>
        </div>
      </main>

      <footer className="border-t border-border-subtle">
        <div className="mx-auto flex max-w-3xl flex-col gap-2 px-6 py-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} RegStack UG (haftungsbeschränkt)</span>
          <Link href="/" className="hover:text-copper-400">
            ← Zurück zur Startseite
          </Link>
        </div>
      </footer>
    </div>
  );
}
