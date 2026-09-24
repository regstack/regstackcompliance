import type { ReactNode } from "react";
import {
  AlertTriangleIcon,
  BoxIcon,
  ClipboardListIcon,
  CpuIcon,
  FileBarChartIcon,
  FileTextIcon,
  FlagIcon,
  GaugeIcon,
  NetworkIcon,
  ScaleIcon,
  SearchCheckIcon,
  SettingsIcon,
  ShieldIcon,
  UsersIcon,
} from "@/components/ui/icons";

// A local, nav-only module key — deliberately NOT the Supabase-generated `ModuleType` enum
// (lib/regstack/session.ts, backed by the `module_type` Postgres enum in the Supabase project
// this repo doesn't hold migrations for). Accounting, IKS, Risikomanagement, and IT-Risiko/BAIT
// are all Express/Prisma-backed modules like Interne Revision before them, but none of them have
// a Supabase role_assignments entry — adding one would mean a Supabase schema migration this repo
// can't run. The switcher renders every entry here unconditionally already (it doesn't filter by
// ctx.roles), and real access control is each module's own layout.tsx checking the backend
// session (getBackendSession + canWrite*), same pattern Outsourcing already used — so a local key
// set costs nothing and avoids a dependency this repo can't fulfill.
export type NavModuleKey =
  | "outsourcing"
  | "compliance"
  | "internal_audit"
  | "accounting"
  | "iks"
  | "risikomanagement"
  | "it_risiko";

export type NavLink = { href: string; label: string };
export type NavGroup = { title: string | null; icon: ReactNode; items: NavLink[] };

export type ModuleNav = {
  module: NavModuleKey;
  label: string;
  href: string;
  switcherIcon: ReactNode;
  active: boolean;
  dashboardHref: string;
  dashboardLabel: string;
  groups: NavGroup[];
};

const iconProps = { width: 14, height: 14 } as const;

export const MODULE_NAV: Record<NavModuleKey, ModuleNav> = {
  outsourcing: {
    module: "outsourcing",
    label: "Outsourcing",
    href: "/outsourcing",
    switcherIcon: <BoxIcon {...iconProps} />,
    active: true,
    dashboardHref: "/outsourcing",
    dashboardLabel: "Auslagerungsregister",
    groups: [
      {
        title: "Bericht · Tz. 13",
        icon: <FileBarChartIcon {...iconProps} />,
        items: [{ href: "/outsourcing/bericht", label: "Bericht über die Auslagerungen" }],
      },
      {
        title: "IKT-Drittanbieter · DORA Art. 28–30",
        icon: <AlertTriangleIcon {...iconProps} />,
        items: [{ href: "/outsourcing/ict-register", label: "DORA-Register" }],
      },
    ],
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
  accounting: {
    module: "accounting",
    label: "Buchhaltung",
    href: "/buchhaltung",
    switcherIcon: <ScaleIcon {...iconProps} />,
    active: true,
    dashboardHref: "/buchhaltung",
    dashboardLabel: "Übersicht",
    groups: [
      {
        title: "Jahresabschluss",
        icon: <FileBarChartIcon {...iconProps} />,
        items: [
          { href: "/buchhaltung/bilanz", label: "Bilanz" },
          { href: "/buchhaltung/guv", label: "Gewinn- und Verlustrechnung" },
          { href: "/buchhaltung/anhang", label: "Anhang" },
          { href: "/buchhaltung/lagebericht", label: "Lagebericht" },
        ],
      },
    ],
  },
  iks: {
    module: "iks",
    label: "IKS",
    href: "/iks",
    switcherIcon: <NetworkIcon {...iconProps} />,
    active: true,
    dashboardHref: "/iks",
    dashboardLabel: "Übersicht",
    groups: [
      {
        title: "Prozesse & Kontrollen",
        icon: <ClipboardListIcon {...iconProps} />,
        items: [
          { href: "/iks/kontrollen", label: "Alle Kontrollen" },
          { href: "/iks/matrix", label: "Kontrollmatrix" },
          { href: "/iks/richtlinien", label: "Richtlinien & Workflow-Dokumente" },
        ],
      },
    ],
  },
  risikomanagement: {
    module: "risikomanagement",
    label: "Risikomanagement",
    href: "/risikomanagement",
    switcherIcon: <GaugeIcon {...iconProps} />,
    active: true,
    dashboardHref: "/risikomanagement",
    dashboardLabel: "Dashboard",
    groups: [
      {
        title: "Inventur & Strategien · AT 4.1–4.2",
        icon: <FileTextIcon {...iconProps} />,
        items: [{ href: "/risikomanagement#inventur", label: "Risikoinventur" }, { href: "/risikomanagement#strategien", label: "Geschäfts- & Risikostrategien" }],
      },
      {
        title: "Risikotragfähigkeit · AT 4.1",
        icon: <GaugeIcon {...iconProps} />,
        items: [{ href: "/risikomanagement#rtf", label: "RTF & Limitauslastung" }],
      },
      {
        title: "Berichte · AT 4.4.1 / AT 3.2",
        icon: <FileBarChartIcon {...iconProps} />,
        items: [{ href: "/risikomanagement#bericht", label: "Berichtswesen (GL & Aufsichtsorgan)" }],
      },
      {
        title: "NPL-Strategie · AT 4.2 Tz. 3",
        icon: <FlagIcon {...iconProps} />,
        items: [{ href: "/risikomanagement#npl", label: "NPL-Kennzahlen" }],
      },
      {
        title: "Modellrisiko · AT 4.3.4",
        icon: <CpuIcon {...iconProps} />,
        items: [{ href: "/risikomanagement#modelle", label: "Modellregister" }],
      },
    ],
  },
  it_risiko: {
    module: "it_risiko",
    label: "IT-Risiko / BAIT",
    href: "/it-risiko",
    switcherIcon: <CpuIcon {...iconProps} />,
    active: true,
    dashboardHref: "/it-risiko",
    dashboardLabel: "Dashboard",
    groups: [
      {
        title: "IT-Strategie · Kap. 1",
        icon: <FileTextIcon {...iconProps} />,
        items: [{ href: "/it-risiko#strategie", label: "IT-Strategie" }],
      },
      {
        title: "Informationsrisiko · Kap. 3",
        icon: <ShieldIcon {...iconProps} />,
        items: [{ href: "/it-risiko#assets", label: "Schutzbedarfsfeststellung" }, { href: "/it-risiko#risiken", label: "IT-Risikoregister" }],
      },
      {
        title: "Informationssicherheit · Kap. 4",
        icon: <AlertTriangleIcon {...iconProps} />,
        items: [{ href: "/it-risiko#vorfaelle", label: "Sicherheitsvorfälle" }],
      },
      {
        title: "Identitäts- und Rechtemanagement · Kap. 6",
        icon: <UsersIcon {...iconProps} />,
        items: [{ href: "/it-risiko#berechtigungen", label: "Berechtigungen" }],
      },
      {
        title: "IT-Projekte · Kap. 7",
        icon: <ClipboardListIcon {...iconProps} />,
        items: [{ href: "/it-risiko#projekte", label: "IT-Projekte" }],
      },
      {
        title: "IT-Betrieb · Kap. 8",
        icon: <SettingsIcon {...iconProps} />,
        items: [
          { href: "/it-risiko#aenderungen", label: "Änderungen" },
          { href: "/it-risiko#betriebsstoerungen", label: "Betriebsstörungen" },
        ],
      },
      {
        title: "IT-Notfallmanagement · Kap. 10",
        icon: <FlagIcon {...iconProps} />,
        items: [{ href: "/it-risiko#notfallmanagement", label: "Notfallpläne" }],
      },
    ],
  },
};

export const MODULE_ORDER: NavModuleKey[] = [
  "outsourcing",
  "compliance",
  "internal_audit",
  "risikomanagement",
  "it_risiko",
  "iks",
  "accounting",
];

export function moduleForPathname(pathname: string): NavModuleKey | null {
  for (const mod of MODULE_ORDER) {
    if (pathname.startsWith(MODULE_NAV[mod].href)) return mod;
  }
  return null;
}
