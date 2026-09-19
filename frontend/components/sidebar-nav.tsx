"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/sign-out-button";
import { ChevronDownIcon, GridIcon, ShieldIcon } from "@/components/ui/icons";
import { MODULE_NAV, MODULE_ORDER, moduleForPathname } from "@/lib/regstack/nav-groups";
import type { InternalRole, ModuleType } from "@/lib/regstack/session";

const ROLE_LABELS: Record<InternalRole, string> = {
  institution_admin: "Institution Admin",
  geschaeftsleitung: "Geschäftsleitung",
  power_user: "Power User",
  fachbereich: "Fachbereich",
  praktikant: "Praktikant",
  read_only: "Read Only",
};

function initials(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

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
  const activeModule = moduleForPathname(pathname);
  const onDashboard = !activeModule && pathname.startsWith("/dashboard");

  const [switcherOpen, setSwitcherOpen] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        setSwitcherOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <aside className="flex w-[292px] shrink-0 flex-col bg-surface border-r border-border-subtle">
      <div className="flex items-center gap-3 px-[22px] pb-4 pt-[22px]">
        <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-copper-400 to-copper-600 text-accent-foreground">
          <ShieldIcon width={17} height={17} strokeWidth={1.8} />
        </div>
        <span className="text-[15px] font-semibold tracking-wide text-foreground">RegStack</span>
      </div>

      <div ref={switcherRef} className="relative px-4 pb-4">
        <button
          type="button"
          onClick={() => setSwitcherOpen((v) => !v)}
          className="switcher flex w-full items-center gap-2.5 rounded-[11px] border border-border-subtle bg-surface px-3 py-2.5 text-left transition-colors"
        >
          <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[7px] bg-copper-500/[0.16] text-copper-300">
            {onDashboard ? <GridIcon width={13} height={13} /> : activeModule ? MODULE_NAV[activeModule].switcherIcon : <GridIcon width={13} height={13} />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Modul</span>
            <span className="block truncate text-[13.5px] font-semibold text-foreground">
              {onDashboard ? "Dashboard" : activeModule ? MODULE_NAV[activeModule].label : "Modul wählen"}
            </span>
          </span>
          <ChevronDownIcon
            width={15}
            height={15}
            className={`shrink-0 text-graphite-300 transition-transform ${switcherOpen ? "rotate-180" : ""}`}
          />
        </button>

        {switcherOpen && (
          <div className="absolute left-4 right-4 top-full z-10 mt-1.5 overflow-hidden rounded-[11px] border border-border-subtle bg-surface-raised shadow-[0_10px_24px_-14px_rgba(0,0,0,0.7)]">
            {isGeschaeftsleitung && (
              <Link
                href="/dashboard"
                onClick={() => setSwitcherOpen(false)}
                className={`navlink flex items-center gap-2.5 px-3 py-2.5 text-[13px] font-medium ${
                  onDashboard ? "text-copper-300" : "text-muted-foreground"
                }`}
              >
                <GridIcon width={14} height={14} />
                Dashboard
              </Link>
            )}
            {MODULE_ORDER.map((mod) => {
              const nav = MODULE_NAV[mod];
              return (
                <Link
                  key={mod}
                  href={nav.href}
                  onClick={() => setSwitcherOpen(false)}
                  className={`navlink flex items-center gap-2.5 px-3 py-2.5 text-[13px] font-medium ${
                    activeModule === mod ? "text-copper-300" : "text-muted-foreground"
                  }`}
                >
                  {nav.switcherIcon}
                  {nav.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <div className="mx-4 mb-3.5 h-px bg-border-subtle" />

      <nav className="flex flex-1 flex-col overflow-y-auto px-3 pb-2">
        {activeModule ? (
          <>
            <Link
              href={MODULE_NAV[activeModule].dashboardHref}
              className={`navlink relative mb-4 flex items-center gap-2.5 rounded-[10px] py-2.5 pl-4 pr-3 text-[13.5px] font-semibold ${
                pathname === MODULE_NAV[activeModule].dashboardHref
                  ? "bg-copper-500/[0.13] text-copper-300"
                  : "navlink-inactive text-graphite-200"
              }`}
            >
              {pathname === MODULE_NAV[activeModule].dashboardHref && (
                <span className="absolute bottom-1.5 left-0 top-1.5 w-[3px] rounded-full bg-copper-500" />
              )}
              <GridIcon width={16} height={16} strokeWidth={1.7} className="shrink-0" />
              {MODULE_NAV[activeModule].dashboardLabel}
            </Link>

            {MODULE_NAV[activeModule].groups.map((group, gi) => (
              <div key={gi}>
                {gi > 0 && <div className="mx-4 mb-3 mt-2 h-px bg-graphite-800" />}
                {group.title && (
                  <div className="flex items-center gap-2 px-3 pb-2 pl-4 text-graphite-400">
                    {group.icon}
                    <span className="text-[11px] font-bold uppercase tracking-wide">{group.title}</span>
                  </div>
                )}
                {group.items.map((item, ii) => {
                  const isCurrent = pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`navlink flex items-center rounded-[10px] py-2.5 pl-[42px] pr-3 text-[13.5px] font-medium ${
                        ii === group.items.length - 1 ? "mb-1.5" : ""
                      } ${isCurrent ? "bg-copper-500/[0.13] text-copper-300" : "navlink-inactive text-graphite-200"}`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            ))}
          </>
        ) : (
          <p className="px-4 py-2 text-xs text-muted-foreground">
            Wählen Sie oben ein Modul, um dessen Seiten zu sehen.
          </p>
        )}
      </nav>

      <div className="flex flex-col gap-2.5 border-t border-border-subtle px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-copper-600 text-[12px] font-bold text-copper-100">
            {initials(fullName)}
          </div>
          <div className="min-w-0">
            <div className="truncate text-[13px] font-semibold text-foreground">{fullName}</div>
            <div className="truncate text-[11px] text-muted-foreground">{email}</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          {roles.map((r, i) => (
            <span key={i} className="rounded-full bg-graphite-800 px-2 py-0.5 text-[10px] text-graphite-300">
              {ROLE_LABELS[r.role]}
              {r.module ? ` · ${r.module}` : ""}
            </span>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <Link href="/konto" className="text-xs font-medium text-muted-foreground hover:text-copper-400">
            Konto & Sicherheit
          </Link>
          <SignOutButton variant="link" />
        </div>
      </div>
    </aside>
  );
}
