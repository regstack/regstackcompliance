"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { href: string; label: string };
type NavGroup = { title: string | null; items: NavItem[] };

const NAV: NavGroup[] = [
  { title: null, items: [{ href: "/interne-revision", label: "Dashboard" }] },
  {
    title: "Prüfungsuniversum & Plan · Tz. 6",
    items: [{ href: "/interne-revision/pruefungsuniversum", label: "Prüfungsuniversum & Plan" }],
  },
  {
    title: "Prüfungen & Feststellungen · Tz. 7-12",
    items: [
      { href: "/interne-revision/pruefungen", label: "Prüfungen" },
      { href: "/interne-revision/feststellungen", label: "Feststellungen & Nachverfolgung" },
    ],
  },
  {
    title: "Berichte · Tz. 9",
    items: [
      { href: "/interne-revision/quartalsbericht", label: "Quartalsbericht" },
      { href: "/interne-revision/jahresbericht", label: "Jahresbericht" },
    ],
  },
  {
    title: "Unabhängigkeit, Personal & Schulungen · Tz. 3-4",
    items: [{ href: "/interne-revision/personal", label: "Personal & Schulungen" }],
  },
  {
    title: "Governance, QS & Projekte · Tz. 1-2",
    items: [{ href: "/interne-revision/governance", label: "Governance, QS & Projekte" }],
  },
  {
    title: "Audit-Trail, Export & Einstellungen",
    items: [
      { href: "/interne-revision/audit", label: "Audit-Trail" },
      { href: "/interne-revision/export", label: "Export für Wirtschaftsprüfer:innen" },
      { href: "/interne-revision/einstellungen", label: "Einstellungen" },
    ],
  },
];

export function RevisionNav() {
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
            const isCurrent = item.href === "/interne-revision" ? pathname === item.href : pathname.startsWith(item.href);
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
