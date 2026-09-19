import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { YearOverYearBarChart } from "@/components/buchhaltung/charts/year-over-year-bar-chart";
import { BiggestMovers, type MoverDatum } from "@/components/buchhaltung/charts/biggest-movers";
import type { YearSeriesDatum } from "@/components/buchhaltung/charts/year-over-year-bar-chart";

function MoversLegend() {
  return (
    <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full" style={{ background: "var(--chart-increase)" }} /> Zunahme
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full" style={{ background: "var(--chart-decrease)" }} /> Abnahme
      </span>
    </div>
  );
}

export function AccountingAnalysis({
  bilanzData,
  bilanzYears,
  guvData,
  guvYears,
  bilanzMovers,
  guvMovers,
  compact = false,
}: {
  bilanzData: YearSeriesDatum[];
  bilanzYears: number[];
  guvData: YearSeriesDatum[];
  guvYears: number[];
  bilanzMovers: MoverDatum[];
  guvMovers: MoverDatum[];
  compact?: boolean;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Bilanz — Entwicklung je Position (Jahresvergleich)</CardTitle>
        </CardHeader>
        <CardBody>
          {bilanzYears.length === 0 ? (
            <p className="text-sm text-muted-foreground">Noch keine Bilanzdaten vorhanden.</p>
          ) : (
            <YearOverYearBarChart data={bilanzData} years={bilanzYears} height={compact ? 260 : 320} />
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Gewinn- und Verlustrechnung — Entwicklung (Jahresvergleich)</CardTitle>
        </CardHeader>
        <CardBody>
          {guvYears.length === 0 ? (
            <p className="text-sm text-muted-foreground">Noch keine GuV-Daten vorhanden.</p>
          ) : (
            <YearOverYearBarChart data={guvData} years={guvYears} height={compact ? 260 : 320} />
          )}
        </CardBody>
      </Card>

      {!compact && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Bilanz — größte Veränderungen ggü. Vorjahr</CardTitle>
              <MoversLegend />
            </CardHeader>
            <CardBody>
              {bilanzMovers.length === 0 ? (
                <p className="text-sm text-muted-foreground">Noch keine zwei Geschäftsjahre zum Vergleich vorhanden.</p>
              ) : (
                <BiggestMovers data={bilanzMovers} />
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>GuV — größte Veränderungen ggü. Vorjahr</CardTitle>
              <MoversLegend />
            </CardHeader>
            <CardBody>
              {guvMovers.length === 0 ? (
                <p className="text-sm text-muted-foreground">Noch keine zwei Geschäftsjahre zum Vergleich vorhanden.</p>
              ) : (
                <BiggestMovers data={guvMovers} />
              )}
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}
