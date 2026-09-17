// AT 9 Tz. 6–8 Vertragsprüf-Katalog. Ported from the (Supabase-hosted) `vertragscheckliste_katalog`
// table's actual rows: the Express/Prisma backend only stores a status per code
// (Contract.clauseChecklist), it doesn't know the catalog text itself, so the catalog lives here
// as a static reference — the legal wording doesn't change per tenant.
export type ChecklistCatalogItem = {
  code: string;
  tzReferenz: "AT 9 Tz. 6" | "AT 9 Tz. 7" | "AT 9 Tz. 8";
  bezeichnung: string;
  buchstabe: string | null;
  erlaeuterung: string | null;
  nurBeiWeiterverlagerung: boolean;
};

export const CONTRACT_CHECKLIST_CATALOG: ChecklistCatalogItem[] = [
  {
    code: "ausstiegsstrategie_mitwirkung",
    tzReferenz: "AT 9 Tz. 6",
    bezeichnung:
      "Handlungsoptionen für den Fall unbeabsichtigter/unerwarteter Beendigung der Auslagerung, einschließlich – soweit sinnvoll und möglich – einer Ausstiegsstrategie",
    buchstabe: null,
    erlaeuterung: null,
    nurBeiWeiterverlagerung: false,
  },
  {
    code: "leistungsbeschreibung",
    tzReferenz: "AT 9 Tz. 7",
    bezeichnung: "Spezifizierung und ggf. Abgrenzung der vom Auslagerungsunternehmen zu erbringenden Leistung",
    buchstabe: "a",
    erlaeuterung: null,
    nurBeiWeiterverlagerung: false,
  },
  {
    code: "vertragslaufzeit",
    tzReferenz: "AT 9 Tz. 7",
    bezeichnung: "Datum des Beginns und ggf. des Endes der Auslagerungsvereinbarung",
    buchstabe: "b",
    erlaeuterung: null,
    nurBeiWeiterverlagerung: false,
  },
  {
    code: "anzuwendendes_recht",
    tzReferenz: "AT 9 Tz. 7",
    bezeichnung: "Sofern von deutschem Recht abweichend: das geltende Recht für die Auslagerungsvereinbarung",
    buchstabe: "c",
    erlaeuterung: null,
    nurBeiWeiterverlagerung: false,
  },
  {
    code: "erbringungsort",
    tzReferenz: "AT 9 Tz. 7",
    bezeichnung:
      "Standorte (Regionen oder Länder), in denen die Dienstleistung erbracht und/oder maßgebliche Daten gespeichert und verarbeitet werden, sowie die Regelung, dass das Institut bei einem Standortwechsel benachrichtigt wird",
    buchstabe: "d",
    erlaeuterung: null,
    nurBeiWeiterverlagerung: false,
  },
  {
    code: "dienstleistungsguete",
    tzReferenz: "AT 9 Tz. 7",
    bezeichnung: "Vereinbarte Dienstleistungsgüte mit eindeutig festgelegten Leistungszielen",
    buchstabe: "e",
    erlaeuterung: null,
    nurBeiWeiterverlagerung: false,
  },
  {
    code: "versicherungsschutz",
    tzReferenz: "AT 9 Tz. 7",
    bezeichnung: "Soweit zutreffend: Nachweis eines Versicherungsschutzes des Auslagerungsunternehmens für bestimmte Risiken",
    buchstabe: "f",
    erlaeuterung: null,
    nurBeiWeiterverlagerung: false,
  },
  {
    code: "notfallkonzepte",
    tzReferenz: "AT 9 Tz. 7",
    bezeichnung: "Anforderungen für die Umsetzung und Überprüfung von Notfallkonzepten",
    buchstabe: "g",
    erlaeuterung: null,
    nurBeiWeiterverlagerung: false,
  },
  {
    code: "informations_pruefungsrechte",
    tzReferenz: "AT 9 Tz. 7",
    bezeichnung: "Festlegung angemessener Informations- und Prüfungsrechte der Internen Revision sowie externer Prüfer",
    buchstabe: "h",
    erlaeuterung: "Umfasst gemäß Erläuterung zu Tz. 7 auch die für Zutritt, Zugang oder Zugriff erforderlichen Leistungen.",
    nurBeiWeiterverlagerung: false,
  },
  {
    code: "aufsichtsbehoerden_kontrollrechte",
    tzReferenz: "AT 9 Tz. 7",
    bezeichnung:
      "Sicherstellung der uneingeschränkten Informations- und Prüfungsrechte sowie der Kontrollmöglichkeiten der gemäß § 25b Abs. 3 KWG zuständigen Behörden bezüglich der ausgelagerten Aktivitäten und Prozesse",
    buchstabe: "i",
    erlaeuterung: null,
    nurBeiWeiterverlagerung: false,
  },
  {
    code: "weisungs_kontrollrechte",
    tzReferenz: "AT 9 Tz. 7",
    bezeichnung: "Soweit erforderlich: Weisungsrechte",
    buchstabe: "j",
    erlaeuterung:
      "Müssen nicht explizit vereinbart werden, wenn die vom Auslagerungsunternehmen zu erbringende Leistung im Auslagerungsvertrag hinreichend klar spezifiziert ist.",
    nurBeiWeiterverlagerung: false,
  },
  {
    code: "datenschutz_sicherheit",
    tzReferenz: "AT 9 Tz. 7",
    bezeichnung: "Regelungen, die sicherstellen, dass datenschutzrechtliche Bestimmungen und sonstige Sicherheitsanforderungen beachtet werden",
    buchstabe: "k",
    erlaeuterung: null,
    nurBeiWeiterverlagerung: false,
  },
  {
    code: "kuendigungsrechte",
    tzReferenz: "AT 9 Tz. 7",
    bezeichnung: "Kündigungsrechte und angemessene Kündigungsfristen",
    buchstabe: "l",
    erlaeuterung:
      "Sollte das Auslagerungsunternehmen zur Unterstützung bei Übertragung auf ein anderes Auslagerungsunternehmen oder bei Reintegration ins Institut verpflichten.",
    nurBeiWeiterverlagerung: false,
  },
  {
    code: "weiterverlagerung_regelungen",
    tzReferenz: "AT 9 Tz. 7",
    bezeichnung:
      "Regelungen über die Möglichkeit und die Modalitäten einer Weiterverlagerung, die sicherstellen, dass das Institut die bankaufsichtsrechtlichen Anforderungen weiterhin einhält",
    buchstabe: "m",
    erlaeuterung: null,
    nurBeiWeiterverlagerung: false,
  },
  {
    code: "informationspflicht_entwicklungen",
    tzReferenz: "AT 9 Tz. 7",
    bezeichnung:
      "Verpflichtung des Auslagerungsunternehmens, das Institut über Entwicklungen zu informieren, die die ordnungsgemäße Erledigung der ausgelagerten Aktivitäten und Prozesse beeinträchtigen können",
    buchstabe: "n",
    erlaeuterung: null,
    nurBeiWeiterverlagerung: false,
  },
  {
    code: "weiterverlagerung_berichtspflicht_fortbestand",
    tzReferenz: "AT 9 Tz. 8",
    bezeichnung: "Das Auslagerungsunternehmen bleibt gegenüber dem Institut berichtspflichtig, auch wenn es Aufgaben auf ein Subunternehmen weiterverlagert",
    buchstabe: null,
    erlaeuterung: null,
    nurBeiWeiterverlagerung: true,
  },
  {
    code: "weiterverlagerung_zustimmungsvorbehalt",
    tzReferenz: "AT 9 Tz. 8",
    bezeichnung:
      "Zustimmungsvorbehalte des auslagernden Instituts bzw. konkrete Voraussetzungen, wann Weiterverlagerungen einzelner Arbeits-/Prozessschritte möglich sind",
    buchstabe: null,
    erlaeuterung: null,
    nurBeiWeiterverlagerung: true,
  },
  {
    code: "weiterverlagerung_subunternehmen_einklang",
    tzReferenz: "AT 9 Tz. 8",
    bezeichnung: "Vertragliche Sicherstellung, dass Vereinbarungen des Auslagerungsunternehmens mit Subunternehmen im Einklang mit dem originären Auslagerungsvertrag stehen",
    buchstabe: null,
    erlaeuterung: null,
    nurBeiWeiterverlagerung: true,
  },
  {
    code: "weiterverlagerung_informationspflicht",
    tzReferenz: "AT 9 Tz. 8",
    bezeichnung: "Informationspflicht des Auslagerungsunternehmens an das auslagernde Institut bei Weiterverlagerungen",
    buchstabe: null,
    erlaeuterung: null,
    nurBeiWeiterverlagerung: true,
  },
];
