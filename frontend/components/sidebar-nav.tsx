"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/sign-out-button";
import type { InternalRole, ModuleType } from "@/lib/regstack/session";

const NAV_ITEMS: { href: string; label: string; module: ModuleType; active: boolean }[] = [
  { href: "/outsourcing", label: "Outsourcing", module: "outsourcing", active: true },
  { href: "/compliance", label: "Compliance", module: "compliance", active: true },
  { href: "/interne-revision", label: "Interne Revision", module: "internal_audit", active: true },
];

const ROLE_LABELS: Record<InternalRole, string> = {
  institution_admin: "Institution Admin",
  geschaeftsleitung: "Geschäftsleitung",
  power_user: "Power User",
  fachbereich: "Fachbereich",
  praktikant: "Praktikant",
  read_only: "Read Only",
};

export function SidebarNav({
  fullName,
  email,
  roles,
}: {
  fullName: string;
  email: string | null;
  roles: { module: ModuleType | null; role: InternalRole }[];
}) {
  const pathname = usePathname();
  const isGeschaeftsleitung = roles.some((r) => r.role === "geschaeftsleitung");

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-border-subtle bg-surface">
      <div className="flex items-center gap-2.5 border-b border-border-subtle px-5 py-5">
        <div className="h-7 w-7 rounded-md bg-copper-500" />
        <span className="text-sm font-semibold tracking-wide text-foreground">
          RegStack
        </span>
      </div>

      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {isGeschaeftsleitung && (
          <Link
            href="/dashboard"
            className={`block rounded-md px-3 py-2 text-sm transition-colors ${
              pathname.startsWith("/dashboard")
                ? "bg-copper-500/10 text-copper-300 font-medium"
                : "text-muted-foreground hover:bg-surface-raised hover:text-foreground"
            }`}
          >
            Dashboard
          </Link>
        )}
        {NAV_ITEMS.map((item) => {
          const isCurrent = pathname.startsWith(item.href);
          if (!item.active) {
            return (
              <div
                key={item.href}
                className="flex items-center justify-between rounded-md px-3 py-2 text-sm text-muted-foreground/50"
              >
                <span>{item.label}</span>
                <span className="rounded-full border border-border-strong px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
                  bald
                </span>
              </div>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-md px-3 py-2 text-sm transition-colors ${
                isCurrent
                  ? "bg-copper-500/10 text-copper-300 font-medium"
                  : "text-muted-foreground hover:bg-surface-raised hover:text-foreground"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border-subtle px-4 py-4">
        <p className="truncate text-sm font-medium text-foreground">{fullName}</p>
        <p className="truncate text-xs text-muted-foreground">{email}</p>
        <div className="mt-2 flex flex-wrap gap-1">
          {roles.map((r, i) => (
            <span
              key={i}
              className="rounded-full bg-graphite-800 px-2 py-0.5 text-[10px] text-graphite-300"
            >
              {ROLE_LABELS[r.role]}
              {r.module ? ` · ${r.module}` : ""}
            </span>
          ))}
        </div>
        <div className="mt-3">
          <SignOutButton />
        </div>
      </div>
    </aside>
  );
}
