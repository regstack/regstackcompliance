import { Banner } from "@/components/ui/banner";

export type DashboardBannerData = {
  execEscalationOpenCount: number;
  eskalationFaelligCount: number;
  gesamtGlFaelligCount: number;
  qsOverdueCount: number;
  lastQsDate: string | null;
  qsIntervallMonate: number;
  openAccessIncidentCount: number;
  kapazitaetOver: boolean;
  plannedDays: number;
  kapazitaet: number;
};

/** Read-only banner stack for the Interne-Revision dashboard — only renders a banner when the
 * underlying condition is actually true, in the priority order given by the module spec. */
export function DashboardBanners({ data }: { data: DashboardBannerData }) {
  const {
    execEscalationOpenCount, eskalationFaelligCount, gesamtGlFaelligCount,
    qsOverdueCount, lastQsDate, qsIntervallMonate, openAccessIncidentCount,
    kapazitaetOver, plannedDays, kapazitaet,
  } = data;

  return (
    <div className="space-y-3">
      {execEscalationOpenCount > 0 && (
        <Banner tone="crit" title={`${execEscalationOpenCount} Feststellung(en) gegen Geschäftsleiter ohne vollständige Meldung`}>
          Tz. 8: unverzügliche Berichterstattung an die Geschäftsleitung sowie Information von BaFin und Deutscher
          Bundesbank fehlt (ganz oder teilweise).
        </Banner>
      )}
      {eskalationFaelligCount > 0 && (
        <Banner tone="warn" title={`${eskalationFaelligCount} Feststellung(en) über der angemessenen Frist unbeseitigt`}>
          Tz. 12 S.1: Der Leiter der Internen Revision muss die fachlich zuständigen Geschäftsleitungsmitglieder
          schriftlich informieren.
        </Banner>
      )}
      {gesamtGlFaelligCount > 0 && (
        <Banner tone="crit" title={`${gesamtGlFaelligCount} Feststellung(en) trotz Eskalation weiter unbeseitigt`}>
          Tz. 12 S.2: Seit der Information der zuständigen Geschäftsleitungsmitglieder ist eine Quartalsgrenze
          verstrichen — die gesamte Geschäftsleitung ist spätestens im nächsten vierteljährlichen Bericht zu
          informieren.
        </Banner>
      )}
      {qsOverdueCount > 0 && (
        <Banner tone="warn" title="Überprüfung von Planung, Methoden und Qualität überfällig">
          Tz. 1 S.2 — letzte regelmäßige Überprüfung: {lastQsDate ?? "keine dokumentiert"}. Intervall laut
          Einstellungen: {qsIntervallMonate} Monate.
        </Banner>
      )}
      {openAccessIncidentCount > 0 && (
        <Banner tone="crit" title={`${openAccessIncidentCount} offene Einschränkung(en) des Informations- und Zugriffsrechts`}>
          Tz. 1 S.3/4: Das vollständige und uneingeschränkte Informations- und Zugriffsrecht ist der Internen
          Revision jederzeit zu gewährleisten — eine ungelöste Einschränkung ist der Geschäftsleitung vorzulegen.
        </Banner>
      )}
      {kapazitaetOver && (
        <Banner tone="warn" title="Geplanter Aufwand übersteigt die verfügbare Kapazität">
          {plannedDays} geplante Personentage stehen {kapazitaet} verfügbaren gegenüber — eine Planabweichung ist
          absehbar und nach Tz. 9 im Quartalsbericht zu beurteilen.
        </Banner>
      )}
    </div>
  );
}
