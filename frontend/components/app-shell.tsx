"use client";

import { useEffect, useState } from "react";
import { SidebarNav } from "@/components/sidebar-nav";
import { MenuIcon } from "@/components/ui/icons";
import type { InternalRole, ModuleType } from "@/lib/regstack/session";

/**
 * The sidebar is a fixed 292px column with no responsive behavior of its own — below the md
 * breakpoint it becomes an off-canvas drawer (fixed, slid in over a backdrop) instead of being
 * squeezed into the remaining viewport width alongside the main content.
 */
export function AppShell({
  fullName,
  email,
  roles,
  children,
}: {
  fullName: string;
  email: string | null;
  roles: { module: ModuleType | null; role: InternalRole }[];
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="flex min-h-screen bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[60] focus:rounded-md focus:bg-copper-500 focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-accent-foreground"
      >
        Zum Inhalt springen
      </a>
      <div className="fixed inset-x-0 top-0 z-30 flex items-center gap-3 border-b border-border-subtle bg-surface px-4 py-3 md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Menü öffnen"
          aria-expanded={open}
          aria-controls="app-sidebar"
          className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-border-strong text-foreground hover:bg-surface-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-copper-500"
        >
          <MenuIcon width={18} height={18} />
        </button>
        <span className="text-sm font-semibold tracking-wide text-foreground">RegStack</span>
      </div>

      {open && (
        <button
          type="button"
          aria-label="Menü schließen"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
        />
      )}

      <div
        id="app-sidebar"
        className={`fixed inset-y-0 left-0 z-50 transition-transform duration-200 ease-out md:static md:transition-none md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarNav fullName={fullName} email={email} roles={roles} onNavigate={() => setOpen(false)} />
      </div>

      <main id="main-content" className="flex-1 px-4 pb-8 pt-20 md:px-8 md:py-8">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
