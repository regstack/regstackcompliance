import type { ReactNode } from "react";
import type { ModuleType } from "@/lib/regstack/session";
import {
  AlertTriangleIcon,
  BoxIcon,
  ClipboardListIcon,
  FileBarChartIcon,
  FileTextIcon,
  FlagIcon,
  SearchCheckIcon,
  SettingsIcon,
  ShieldIcon,
  UsersIcon,
} from "@/components/ui/icons";

export type NavLink = { href: string; label: string };
export type NavGroup = { title: string | null; icon: ReactNode; items: NavLink[] };

export type ModuleNav = {
  module: ModuleType;
  label: string;
  href: string;
  switcherIcon: ReactNode;
  active: boolean;
  dashboardHref: string;
  dashboardLabel: string;
  groups: NavGroup[];
};

const iconProps = { width: 14, height: 14 } as const;

export const MODULE_NAV: Record<ModuleType, ModuleNav> = {
  outsourcing: {
    module: "outsourcing",
    label: "Outsourcing",
    href: "/outsourcing",
    switcherIcon: <BoxIcon {...iconProps} />,
    active: true,
    dashboardHref: "/outsourcing",
    dashboardLabel: "Auslagerungsregister",
    groups: [],
  },
  compliance: {
    module: "compliance",
    label: "Compliance",
    href: "/compliance",
    switcherIcon: <ShieldIcon {...iconProps} />,
    active: true,
    dashboardHref: "/compliance",
    dashboardLabel: "Dashboard",
    groups: [
      {
        title: "Rechtsnormenkataster · Tz. 2",
        icon: <FileTextIcon {...iconProps} />,
        items: [
          { href: "/compliance/normen", label: "Rechtsnormenkataster" },
          { href: "/compliance/ueberwachung", label: "Überwachung" },
        ],
      },
      {
        title: "Risiken, Kontrollen & Nachweise · Tz. 1",
        icon: <AlertTriangleIcon {...iconProps} />,
        items: [
          { href: "/compliance/risiken", label: "Risiken & Kontrollen" },
          { href: "/compliance/nachweise", label: "Nachweis-Ablage" },
        ],
      },
      {
        title: "Feststellungen",
        icon: <FlagIcon {...iconProps} />,
        items: [{ href: "/compliance/feststellungen", label: "Feststellungen & Maßnahmen" }],
      },
      {
        title: "Organisation · Tz. 3–5",
        icon: <UsersIcon {...iconProps} />,
        items: [
          { href: "/compliance/governance", label: "Governance & Beauftragte" },
          { href: "/compliance/zugriff", label: "Informationsrechte" },
        ],
      },
      {
        title: "Berichte · Tz. 6",
        icon: <FileBarChartIcon {...iconProps} />,
        items: [
          { href: "/compliance/bericht", label: "Bericht an die Geschäftsleitung" },
          { href: "/compliance/audit", label: "Audit-Trail" },
          { href: "/compliance/export", label: "Export für Wirtschaftsprüfer:innen" },
        ],
      },
    ],
  },
  internal_audit: {
    module: "internal_audit",
    label: "Interne Revision",
    href: "/interne-revision",
    switcherIcon: <SearchCheckIcon {...iconProps} />,
    active: true,
    dashboardHref: "/interne-revision",
    dashboardLabel: "Dashboard",
    groups: [
      {
        title: "Prüfungsuniversum & Plan · Tz. 6",
        icon: <ClipboardListIcon {...iconProps} />,
        items: [{ href: "/interne-revision/pruefungsuniversum", label: "Prüfungsuniversum & Plan" }],
      },
      {
        title: "Prüfungen & Feststellungen · Tz. 7–12",
        icon: <FlagIcon {...iconProps} />,
        items: [
          { href: "/interne-revision/pruefungen", label: "Prüfungen" },
          { href: "/interne-revision/feststellungen", label: "Feststellungen & Nachverfolgung" },
          { href: "/interne-revision/externe-pruefungen", label: "Externe Prüfung — Feststellungen" },
        ],
      },
      {
        title: "Berichte · Tz. 9",
        icon: <FileBarChartIcon {...iconProps} />,
        items: [
          { href: "/interne-revision/quartalsbericht", label: "Quartalsbericht" },
          { href: "/interne-revision/jahresbericht", label: "Jahresbericht" },
        ],
      },
      {
        title: "Unabhängigkeit, Personal & Schulungen · Tz. 3–4",
        icon: <UsersIcon {...iconProps} />,
        items: [{ href: "/interne-revision/personal", label: "Personal & Schulungen" }],
      },
      {
        title: "Governance, QS & Projekte · Tz. 1–2",
        icon: <ShieldIcon {...iconProps} />,
        items: [{ href: "/interne-revision/governance", label: "Governance, QS & Projekte" }],
      },
      {
        title: "Audit-Trail, Export & Einstellungen",
        icon: <SettingsIcon {...iconProps} />,
        items: [
          { href: "/interne-revision/audit", label: "Audit-Trail" },
          { href: "/interne-revision/export", label: "Export für Wirtschaftsprüfer:innen" },
          { href: "/interne-revision/einstellungen", label: "Einstellungen" },
        ],
      },
    ],
  },
};

export const MODULE_ORDER: ModuleType[] = ["outsourcing", "compliance", "internal_audit"];

export function moduleForPathname(pathname: string): ModuleType | null {
  for (const mod of MODULE_ORDER) {
    if (pathname.startsWith(MODULE_NAV[mod].href)) return mod;
  }
  return null;
}
