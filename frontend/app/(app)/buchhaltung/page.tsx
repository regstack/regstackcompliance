import Link from "next/link";
import {
  listBalanceSheets, listIncomeStatements, listAccountingNotes, listManagementReports,
  buildBilanzSectionTotals, buildGuvSectionTotals, buildBiggestMovers,
} from "@/lib/regstack/accounting";
import { getBackendSession } from "@/lib/regstack/backend-session";
import { accessGrantBanner } from "@/components/access-grants/access-gate";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { AccountingAnalysis } from "@/components/buchhaltung/accounting-analysis";

const DOC_LINKS = [
  { href: "/buchhaltung/bilanz", label: "Bilanz" },
  { href: "/buchhaltung/guv", label: "Gewinn- und Verlustrechnung" },
  { href: "/buchhaltung/anhang", label: "Anhang" },
  { href: "/buchhaltung/lagebericht", label: "Lagebericht" },
];

export default async function BuchhaltungPage() {
  const session = await getBackendSession();

  const gateBanner = await accessGrantBanner(session?.role, "ACCOUNTING");
  if (gateBanner) return gateBanner;

  const [balanceSheets, incomeStatements, notes, managementReports] = await Promise.all([
    listBalanceSheets(),
    listIncomeStatements(),
    listAccountingNotes(),
    listManagementReports(),
  ]);

  const { data: bilanzData, years: bilanzYears } = buildBilanzSectionTotals(balanceSheets);
  const { data: guvData, years: guvYears } = buildGuvSectionTotals(incomeStatements);
  const bilanzMovers = buildBiggestMovers(balanceSheets);
  const guvMovers = buildBiggestMovers(incomeStatements);

  const latestByType = [
    { label: "Bilanz", docs: balanceSheets, href: "/buchhaltung/bilanz" },
    { label: "GuV", docs: incomeStatements, href: "/buchhaltung/guv" },
    { label: "Anhang", docs: notes, href: "/buchhaltung/anhang" },
    { label: "Lagebericht", docs: managementReports, href: "/buchhaltung/lagebericht" },
  ];

  return (
    <div className="space-y-6">
      <AccountingAnalysis
        bilanzData={bilanzData}
        bilanzYears={bilanzYears}
        guvData={guvData}
        guvYears={guvYears}
        bilanzMovers={bilanzMovers}
        guvMovers={guvMovers}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {latestByType.map(({ label, docs, href }) => {
          const latest = [...docs].sort((a, b) => b.fiscalYear - a.fiscalYear)[0];
          return (
            <Link key={label} href={href}>
              <Card className="h-full px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
                {latest ? (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-lg font-semibold text-foreground">{latest.fiscalYear}</span>
                    <StatusPill status={latest.status} />
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">Noch keine Daten</p>
                )}
              </Card>
            </Link>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Alle Geschäftsjahre</CardTitle>
        </CardHeader>
        <CardBody className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-3">Geschäftsjahr</th>
                {DOC_LINKS.map((d) => (
                  <th key={d.href} className="py-2 pr-3">
                    {d.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...new Set([...balanceSheets, ...incomeStatements, ...notes, ...managementReports].map((d) => d.fiscalYear))]
                .sort((a, b) => b - a)
                .map((year) => (
                  <tr key={year} className="border-b border-border-subtle last:border-0">
                    <td className="py-2 pr-3 font-medium text-foreground">{year}</td>
                    {[balanceSheets, incomeStatements, notes, managementReports].map((docs, i) => {
                      const doc = docs.find((d) => d.fiscalYear === year);
                      return (
                        <td key={DOC_LINKS[i].href} className="py-2 pr-3">
                          {doc ? (
                            <Link href={`${DOC_LINKS[i].href}/${doc.id}`} className="hover:text-copper-300">
                              <StatusPill status={doc.status} />
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}
