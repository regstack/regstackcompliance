import Link from "next/link";
import { ShieldIcon } from "@/components/ui/icons";

export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border-subtle">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-gradient-to-br from-copper-400 to-copper-600 text-accent-foreground">
              <ShieldIcon width={16} height={16} strokeWidth={1.8} />
            </div>
            <span className="text-sm font-semibold tracking-wide text-foreground">
              RegStack
            </span>
          </Link>
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-copper-400"
          >
            Zurück zur Startseite
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {title}
          </h1>
          <p className="mt-2 text-xs text-muted-foreground">Stand: {updated}</p>
          <div className="prose-legal mt-8 space-y-8 text-sm leading-relaxed text-foreground">
            {children}
          </div>
        </div>
      </main>

      <footer className="border-t border-border-subtle">
        <div className="mx-auto flex max-w-3xl flex-col gap-2 px-6 py-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} RegStack</span>
          <div className="flex gap-4">
            <Link href="/impressum" className="hover:text-copper-400">
              Impressum
            </Link>
            <Link href="/datenschutz" className="hover:text-copper-400">
              Datenschutz
            </Link>
            <a
              href="mailto:admin@regstack.de"
              className="hover:text-copper-400"
            >
              admin@regstack.de
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export function LegalSection({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-sm font-semibold text-copper-400">{heading}</h2>
      <div className="mt-2 space-y-3 text-muted-foreground [&_a]:text-copper-400 [&_a:hover]:underline">
        {children}
      </div>
    </section>
  );
}

export function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded bg-status-danger-bg px-1 py-0.5 font-mono text-[0.8em] text-status-danger">
      [{children}]
    </span>
  );
}
