"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { href: string; label: string };
type NavGroup = { title: string | null; items: NavItem[] };

const NAV: NavGroup[] = [
  { title: null, items: [{ href: "/compliance", label: "Dashboard" }] },
  {
    title: "Rechtsnormenkataster · Tz. 2",
    items: [
      { href: "/compliance/normen", label: "Rechtsnormenkataster" },
      { href: "/compliance/ueberwachung", label: "Überwachung" },
    ],
  },
  {
    title: "Risiken, Kontrollen & Nachweise · Tz. 1",
    items: [
      { href: "/compliance/risiken", label: "Risiken & Kontrollen" },
      { href: "/compliance/nachweise", label: "Nachweis-Ablage" },
    ],
  },
  { title: "Feststellungen & Maßnahmen", items: [{ href: "/compliance/feststellungen", label: "Feststellungen & Maßnahmen" }] },
  {
    title: "Organisation & Rechte · Tz. 3–5",
    items: [
      { href: "/compliance/governance", label: "Governance & Beauftragte" },
      { href: "/compliance/zugriff", label: "Informationsrechte" },
    ],
  },
  {
    title: "Berichte & Nachweis · Tz. 6",
    items: [
      { href: "/compliance/bericht", label: "Bericht an die Geschäftsleitung" },
      { href: "/compliance/audit", label: "Audit-Trail" },
      { href: "/compliance/export", label: "Export für Wirtschaftsprüfer:innen" },
    ],
  },
];

export function ComplianceNav() {
  const pathname = usePathname();

  return (
    <nav className="mb-6 space-y-3 border-b border-border-subtle pb-4">
      {NAV.map((group, i) => (
        <div key={i} className="flex flex-wrap items-center gap-1.5">
          {group.title && (
            <span className="mr-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">
              {group.title}
            </span>
          )}
          {group.items.map((item) => {
            const isCurrent = item.href === "/compliance" ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  isCurrent
                    ? "border-copper-500 bg-copper-500/10 text-copper-300"
                    : "border-border-strong text-muted-foreground hover:border-copper-500/50 hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
