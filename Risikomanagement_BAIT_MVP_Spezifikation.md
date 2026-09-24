# Risikomanagement (MaRisk AT 4) & BAIT/IT-Risikomanagement — MVP-Spezifikation

**Status:** Phase 1 UND Phase 2 sind umgesetzt, inklusive Frontend-Anbindung für alle Bausteine.
Prisma-Modelle, Migrationen, RBAC-Einträge und Routen liegen in `src/modules/risikomanagement/`
und `src/modules/itRisiko/` (siehe Commit-Historie). Migrationen jeweils lokal gegen ein frisches
Postgres 16 verifiziert (`prisma migrate deploy` + `prisma migrate diff` ohne Drift +
End-to-End-Smoke-Test über eine laufende Server-Instanz: Login, RBAC-Ablehnung einer falschen
Rolle, vollständiger Lebenszyklus inkl. Audit-Log-Prüfung, Tenant-Isolation gegen ein
untergeschobenes `institutionId` im Body). Seed-Daten für alle Bausteine sind in `prisma/seed.ts`
ergänzt. Die drei "Neu gefundenen Lücken" (AT 3.2, AT 4.2 Tz. 3, AT 4.3.4) sind ebenfalls
umgesetzt, siehe "Phase 2" im Modul-1-Abschnitt unten.

**Update 2026-09-23 — AT 4.1 Tz. 10 und AT 4.3.3 zusätzlich nachgezogen:** Auf Basis des
vollständigen AT-4-Primärtexts (BA 54, Stand 30.06.2026) kamen zwei weitere, unabhängig
entwickelte Bausteine hinzu: `RmKapitalplanung` (AT 4.1 Tz. 10) und `RmStresstest` (AT 4.3.3,
inkl. schwerem konjunkturellem Abschwung und inversem Stresstest). Gleiches Muster wie die
bestehenden Modelle: `institutionId`-Scoping, jeder Write über `withAudit(...)`, RBAC-Einträge
(`riskCapitalPlanning[.approve]`, `riskStressTest`) mit derselben Rollenaufteilung wie
`riskManagementRecord`/`riskStrategy.approve`. Frontend-Panels für beide liegen ebenfalls vor
(`/risikomanagement`, `components/risikomanagement/{kapitalplanung,stresstest}-panel.tsx`).
AT 4.3.1 (Aufbau-/Ablauforganisation) bekommt bewusst **kein** eigenes Datenmodell — das ist
Funktionstrennung/Prozessdesign (serverseitig ohnehin über RBAC erzwungen), kein wiederkehrender
Datensatz, analog zur Entscheidung gegen ein eigenes ISB-Login. Granulare BTR-Detailformulare je
Risikoart (ein eigener Zinsschock-/Kreditrisiko-Rechenkern statt reiner Ergebnis-Erfassung)
bleiben offen.

**Nachweis-Integration ist ebenfalls umgesetzt (23.09.2026)** — `EvidenceModule` um
`RISK_MANAGEMENT`/`IT_RISK` erweitert. Es gab bereits ein reales, ausgereiftes Upload-Muster im
Produkt (Pre-Signed-S3-URLs, siehe `src/modules/contracts/objectStorage.ts` für
Vertragsdokumente und `src/modules/ics/objectStorage.ts` für IKS-Richtliniendokumente) — nur das
generische `Nachweis`-Modell selbst war bislang rein lesend (`GET /nachweise`, ohne RBAC-Gate).
Dasselbe Muster wurde für `Nachweis` übernommen: `src/modules/nachweise/objectStorage.ts`,
`POST /nachweise/upload-url` → `POST /nachweise` (erste Fassung) bzw.
`POST /nachweise/:id/neue-version` (neue Fassung statt stillen Überschreibens, über
`previousVersionId`), `GET /nachweise/:id/download-url`, neue RBAC-Ressource `nachweis`
(schließt eine reale Lücke: die GET-Route hatte zuvor gar kein `requirePermission`). Client-seitig
wird vor jedem Upload ein SHA-256-Hash berechnet (`Nachweis.hash`) — löst ein Versprechen aus der
Banner-Copy von `/compliance/nachweise` ein, das zuvor nirgends eingelöst war. Verdrahtet an zwei
realen Stellen: der `/compliance/nachweise`-Übersicht (jetzt mit echtem Upload- und
Versionierungsformular statt nur Lesetabelle) und der Interne-Revision-Prüfungsdetailseite (Upload
je Arbeitspapier, wo zuvor ein Code-Kommentar den exakt selben Gap dokumentierte). Die generische
Komponente (`components/nachweise/`) ist bereit für weitere Verdrahtung in anderen Modulen
(Outsourcing, Risikomanagement, IT-Risiko), aber das ist bewusst nicht in diesem Schritt passiert.

**Update 2026-09-23 (später) — BAIT-Primärtext jetzt vorhanden, Kapitelnumerierung korrigiert,
Kap. 8/10 ergänzt:** Der Nutzer hat den Volltext von Rundschreiben 10/2017 (BA) in der Fassung vom
16.12.2024 bereitgestellt. Die zwölf Kapitel (Kap. 11 ist aufgehoben) lauten exakt: 1. IT-Strategie,
2. IT-Governance, 3. Informationsrisikomanagement, 4. Informationssicherheitsmanagement,
5. Operative Informationssicherheit, 6. Identitäts- und Rechtemanagement, 7. IT-Projekte und
Anwendungsentwicklung, 8. IT-Betrieb, 9. Auslagerungen und sonstiger Fremdbezug von
IT-Dienstleistungen, 10. IT-Notfallmanagement, 12. Kritische Infrastrukturen. Die weiter unten in
der Mapping-Tabelle verwendete Numerierung für Kap. 5-8 war **falsch** (Berechtigungsmanagement
stand fälschlich als "Kap. 5", tatsächlich Kap. 6; IT-Projekte als "Kap. 6", tatsächlich Kap. 7;
IT-Betrieb als "Kap. 7", tatsächlich Kap. 8) — sie wurde vor dem jetzt vorliegenden Primärtext
geschrieben. Kap. 8 IT-Betrieb umfasst zusätzlich Betriebsstörungen (Tz. 8.6, bisher nicht
abgedeckt — die BAIT grenzt "Informationssicherheitsvorfall", "sicherheitsrelevantes Ereignis" und
"ungeplante Abweichung vom Regelbetrieb" (Störung) explizit voneinander ab, Tz. 4.7), und Kap. 10
IT-Notfallmanagement (IT-Notfallpläne je zeitkritischem System mit RTO/RPO, Tz. 10.3, und
mindestens jährliche Tests, Tz. 10.4) fehlte komplett.

**Koordination mit parallelen Sessions:** Beim Versuch, alle BAIT-Phase-2-Kapitel (6-8, 10) in
einem PR zu liefern, stellte sich beim Deploy heraus, dass **PR #13** ("Risikomanagement/BAIT
Phase 2: Kap. 5-7, editing UI, regulatory gaps, and Nachweis upload") bereits unabhängig
Berechtigungsmanagement (als `Berechtigung`/`BerechtigungsRezertifizierung`), IT-Projekte (als
`ItProjekt`) und Änderungsmanagement + Datensicherungstests (als `ItAenderung`/
`ItDatensicherungstest`) gebaut hatte — mit denselben Tabellennamen (`bait_it_projekte`,
`bait_it_aenderungen`) für `ItProjekt`/`ItAenderung`, die dieser Branch ebenfalls verwendet hatte.
Der erste Merge-Versuch dieses Branches (PR #17) hatte zusätzlich unabhängig davon einen
produktionsweiten Crash ausgelöst (fehlendes `binaryTargets` in `generator client` — seit
`20260923000000_bait_kap6_7_8_10_workflows`-Vorgänger behoben, siehe PR #20) und wurde deshalb
zunächst revertiert (PR #19). Bei der erneuten Aufbereitung wurden daher **Berechtigungsmanagement,
IT-Projekte und Änderungsmanagement aus diesem Branch entfernt** — in der Annahme, dass PR #13
diese Bausteine bereits abdeckt und weiter fortgeschritten ist (u. a. Editing-UI, Nachweis-Upload).
Bereits produktiv angelegte, dadurch verwaiste Tabellen/Spalten (`bait_it_berechtigungen`,
`bait_it_projekte`, `bait_it_aenderungen`, die IDV-Zusatzfelder auf `bait_it_assets`) wurden wieder
entfernt (leer, 0 Zeilen, verifiziert vor dem Drop), damit PR #13s Migration ohne
Tabellennamen-Konflikt läuft.

**Nachtrag — gegenseitiger Rückzug führte zu einer echten Lücke:** PR #13 ist inzwischen gemerged
(`2ca05c9`), hat dabei aber **ebenfalls** sein eigenes Berechtigungsmanagement/IT-Projekte/
Änderungsmanagement fallengelassen — in der spiegelbildlichen Annahme, PR #17 (dieser Branch) decke
das bereits ab. Ergebnis: Beide Seiten haben sich gegenseitig den Vortritt gelassen, und keine
Implementierung landete auf `master` (verifiziert: `master`s `schema.prisma` enthält weder
`model Berechtigung`, `model ItProjekt`, `model ItAenderung` noch `model ItDatensicherungstest`,
kein anderer offener PR deckt diesen Baustein ab). Dieser Branch **reintroduziert deshalb
Berechtigungsmanagement (Kap. 6), IT-Projekte (Kap. 7) und Änderungsmanagement (Kap. 8, Tz.
8.4-8.5)** mit der zu diesem Zeitpunkt bereits gegen den Primärtext verifizierten korrekten
Kapitelnumerierung — inkl. Schema (`ItBerechtigung`/`ItProjekt`/`ItAenderung` + IDV-Zusatzfelder auf
`ItAsset`), RBAC (`itAccessRecord`/`itProjectRecord`), Routen, Frontend-Panels, Seed-Daten und einer
gegen eine echte Postgres-Instanz verifizierten Migration (`prisma migrate deploy` +
`prisma migrate diff` ohne Drift). PR #13s abweichende Datenmodellierung (Datensicherungstests als
eigenes `ItDatensicherungstest`-Modell statt als Teil von `ItAenderung`) wurde bewusst nicht
übernommen, da sie nicht mehr existiert und dieser Branch die einzige verbliebene Implementierung
dieser drei Kapitel ist.

**Verbleibend und nicht mit anderen offenen PRs überlappend:** Kap. 6 Berechtigungsmanagement
(`ItBerechtigung`), Kap. 7 IT-Projekte (`ItProjekt`), Kap. 8 Änderungsmanagement (`ItAenderung`) und
Betriebsstörungen (`ItBetriebsstoerung`), sowie Kap. 10 IT-Notfallmanagement
(`ItNotfallplan`/`ItNotfalltest`) — alles inkl. Migration, RBAC (`itAccessRecord`/`itProjectRecord`/
`itOperationsRecord`/`itContingencyRecord`), Routen, Frontend-Panels, Seed-Daten, gegen eine echte
Postgres-Instanz verifiziert. Kap. 8/10 waren bereits vor diesem Nachtrag gegen die Produktions-DB
(Supabase-Projekt `qtcptpmxijxruzbcxlah`) angewendet; Kap. 6/7/8-Änderungsmanagement folgen mit
derselben Vorgehensweise.

Nebenbei entdeckt und ebenfalls auf der Produktions-DB behoben: `RmKapitalplanung`/`RmStresstest`
(PR #18, oben) waren zwar bereits im gemergten `master` als Code live, ihre Migration war aber nie
gegen die Produktions-DB gefahren worden (Tabellen fehlten) — jeder Aufruf von
`/risikomanagement/kapitalplanung` oder `/risikomanagement/stresstests` hätte mit einem
Datenbankfehler quittiert. Nachgeholt.

Zwei neue Fachmodule als nächster Ausbauschritt von RegStack, im selben Baustil wie die drei
bestehenden Module (Auslagerungsmanagement AT 9, Compliance AT 4.4.2, Interne Revision AT 4.4.3):
ein Ordner je Modul unter `src/modules/`, Prisma-Modelle mit `institutionId`-Scoping, RBAC-Eintrag
je Resource in `src/middleware/rbac.ts`, jeder Write über `withAudit(...)`.

**Gegen die Primärquelle geprüft (19.09.2026):** Die Annahme unten wurde gegen den tatsächlichen
Text von Rundschreiben 06/2026 (BA), "BA 54 – MaRisk vom 30.06.2026" (9. MaRisk-Novelle) geprüft
— dieselbe Fassung, auf die README.md und die Marketing-Seite bereits Bezug nehmen. Ergebnis:
im Kern richtig, mit drei konkreten Korrekturen und vier neu gefundenen Lücken, siehe
"Korrekturen nach Quellenabgleich" unten. Die BAIT-Kapitelbezeichnungen sind seit 23.09.2026 gegen
den Primärtext von Rundschreiben 10/2017 (BA) (Fassung 16.12.2024) geprüft, siehe Update oben.

Umsetzungsstand: AT 4.1 (Risikotragfähigkeit), AT 4.2 (Strategien), AT 4.3.2 (RM-Prozesse, nur
das Reporting-Element), AT 4.4.1 (Risikocontrolling-Funktion) sowie die AT-2.2-Pflichtrisikoarten
inkl. ESG sind in den Phase-1-Modellen abgedeckt. AT 3.2 (Aufsichtsorgan-Berichtswesen), AT 4.3.4
(Modelle) und die konditionale AT-4.2-Tz.-3-NPL-Strategie waren es zunächst nicht — **alle drei
sind seit 23.09.2026 ebenfalls umgesetzt**, siehe "Phase 2" im Modul-1-Abschnitt unten.

### Korrekturen nach Quellenabgleich

1. **AT 2.2 heißt "Risiken", nicht "Risikokultur"** — es definiert die vier verpflichtend als
   wesentlich einzustufenden Basis-Risikoarten: Adressenausfallrisiken (inkl. Länderrisiken),
   Marktpreisrisiken, Liquiditätsrisiken, operationelle Risiken (Tz. 1). IKT-Risiken sind darin
   explizit als Bestandteil der operationellen Risiken zu behandeln — deckt sich mit der
   `OPERATIONELLES_RISIKO`-Beschreibung im Seed ("IT-, Prozess- und Auslagerungsrisiken"). Als
   Wesentlichkeitsschwelle in der ökonomischen Perspektive nennt der Text konkret **5 % des
   Risikodeckungspotenzials** (Tz. 1) — ein reales Zahlenanker, kein Institutsermessen von Null.
2. **"Risikokultur" steht in AT 3.1** (Gesamtverantwortung der Geschäftsleitung), nicht in AT 2.2.
3. **Risikokonzentrationen sind im Text ein Querschnittsthema**, kein eigenständiger 5. Risikoart-
   Eintrag — sie werden explizit bei der Risikoinventur, der RTF (AT 4.1 Tz. 1), der
   Risikostrategie/Risikoappetit-Festlegung (AT 4.2 Tz. 2) und dem GL-Reporting (AT 4.3.2 Tz. 3)
   mitgeführt. Der `KONZENTRATIONSRISIKO`-Eintrag im `RisikoartKategorie`-Enum bleibt trotzdem
   sinnvoll (verbreitete Institutspraxis, eigene Registerzeile), sollte aber nicht als "die MaRisk
   verlangt eine 5. Risikoart" zitiert werden.

### Neu gefundene Lücken — Stand 19.09.2026, Nr. 4/6/7 umgesetzt am 23.09.2026

4. **AT 3.2 Verantwortung des Aufsichtsorgans** — mindestens vierteljährliches Reporting in
   Textform an das Aufsichtsorgan (Geschäftslage, Risikosituation, Strategien inkl. Anpassungen,
   Compliance-Bericht, Revisionsberichte). War ein eigenes, vom GL-Bericht (`RmReport`)
   verschiedenes Berichtsziel/-publikum, das zunächst nirgends modelliert war. **Umgesetzt:**
   `RmReport.empfaenger`, siehe "Phase 2" unten.
5. **AT 4.2 Tz. 2 verlangt eine mit der Geschäftsstrategie konsistente IKT-Strategie** — direkt
   durch die Geschäftsleitung, mit optionaler Zusammenlegung mit einer DOR-Strategie (DORA
   digitale operationale Resilienz). Das ist dieselbe Sache wie `ItStrategie`/BAIT Kap. 1 — die
   Mapping-Tabelle unten führt "AT 4.2 Tz. 2" als Zweitquelle neben "BAIT Kap. 1" (reine
   Dokumentationskorrektur, kein Modell-Gap).
6. **AT 4.2 Tz. 3: NPL-Strategie** für Institute mit hohem Bestand notleidender Risikopositionen,
   inkl. vierteljährlichem KPI-Tracking des Abbaufortschritts — konditional (nur relevant bei
   hohem NPL-Bestand). **Umgesetzt:** `RmNplKennzahl` — bleibt in Instituten ohne relevanten
   NPL-Bestand einfach leer, kein Pflegezwang.
7. **AT 4.3.4 Verwendung von Modellen** — komplett neues Kapitel, deckt Modellrisiko-Governance ab
   (Auswahl, Validierung, Rekalibrierung, Überschreibungen, Erklärbarkeit), explizit inklusive
   "technologiegestützter Innovation und künstlicher Intelligenz". **Umgesetzt:** `RmModell` +
   `RmModellValidierung`.

Beide Module verzahnen sich mit dem, was schon da ist, statt es zu duplizieren:
- IT-Auslagerungen bleiben `OutsourcingActivity` mit `scope = IKT_DORA` — BAIT Kap. 8 (Steuerung
  von IT-Dienstleistern) bekommt **keine** eigene Vertrags-/Monitoring-Tabelle, sondern liest die
  bestehende.
- Berechtigungs-/Zugriffsvorfälle grenzen sich klar von `RevisionZugriffsvorfall` ab (das ist die
  Revisions-*Nachschau*, hier geht es um das laufende Berechtigungsmanagement selbst).
- Beide neue Module bekommen ein Berichtsmodell nach demselben Muster wie `ComplianceReport` /
  `RevisionReport` (Entwurf → final, Json-Inhalt, Kenntnisnahme-Tabelle) statt einer neuen Form.

---

## Modul 1: Risikomanagement (MaRisk AT 4)

### MVP-Umfang (Phase 1)

| Baustein | Zweck |
|---|---|
| Risikoinventur | Jährliche Wesentlichkeits-Einstufung je Risikoart, mit Begründung/Methodik |
| Risikostrategie | Geschäfts-/Risikostrategie + Teilstrategien, Verabschiedungs-Workflow durch die GL |
| Risikotragfähigkeit | Periodischer RTF-Snapshot (normativ/ökonomisch), Limits je Risikoart, Auslastung |
| RM-Reporting | Quartalsbericht an die GL, Entwurf→final wie bei Compliance/Revision |
| Kapitalplanung (seit 2026-09-23) | Jährlicher mehrjähriger Kapitalbedarfs-/Kapitaldeckungsplan, GL-Verabschiedung — AT 4.1 Tz. 10 |
| Stresstests (seit 2026-09-23) | Je-Test-Datensatz: Typ (Sensitivität/Szenario/schwerer Abschwung/invers/Resilienz), Ebene, Ergebnis, RTF-Bezug — AT 4.3.3 |
| Modellregister | AT 4.3.4 / AT 4.1 Tz. 9 — absichtlich nicht hier; wird von PR #10/#13 gebaut |

**Weiterhin bewusst auf Phase 2 verschoben:** granulare BTR-Formulare je Risikoart (ein eigener
Kreditrisiko-Scoring-/Zinsschock-Rechenkern statt reiner Ergebnis-Erfassung im Stresstest-Datensatz)
und eine Limitüberschreitungs-Eskalationskette. Diese sind fachlich groß genug für eigene Sub-Specs
und sollten nicht die MVP-Lieferung blockieren. AT 4.3.1 (Aufbau-/Ablauforganisation) bekommt bewusst
kein eigenes Datenmodell — Funktionstrennung ist Prozessdesign/RBAC, kein wiederkehrender Datensatz.

### Vorgeschlagene Enums

```prisma
enum RisikoartKategorie {
  ADRESSENAUSFALLRISIKO
  MARKTPREISRISIKO_HANDELSBUCH
  MARKTPREISRISIKO_ANLAGEBUCH
  LIQUIDITAETSRISIKO
  OPERATIONELLES_RISIKO
  KONZENTRATIONSRISIKO
  ESG_RISIKO
  SONSTIGES_RISIKO
}

enum RmWesentlichkeit {
  wesentlich
  nicht_wesentlich
}

enum RmStrategieArt {
  geschaeftsstrategie
  risikostrategie
  teilstrategie
}

enum RmStrategieStatus {
  entwurf
  verabschiedet
}

enum RtfAnsatz {
  normativ
  oekonomisch
}

enum RmReportStatus {
  entwurf
  final
}
```

### Vorgeschlagene Modelle (Auszug, MVP)

```prisma
model Risikoinventur {
  id                String   @id @default(uuid())
  institutionId     String
  institution       InstitutionProfile @relation(fields: [institutionId], references: [id])

  jahr              Int
  kategorie         RisikoartKategorie
  bezeichnung       String
  wesentlichkeit    RmWesentlichkeit
  begruendung       String?
  methodik          String?
  verantwortlichUserId String?
  letzteUeberpruefung  DateTime?
  naechsteUeberpruefung DateTime?

  createdByUserId String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@map("rm_risikoinventur")
  @@index([institutionId])
}

model Risikostrategie {
  id            String   @id @default(uuid())
  institutionId String
  institution   InstitutionProfile @relation(fields: [institutionId], references: [id])

  art               RmStrategieArt
  jahr              Int
  inhalt            Json @default("{}")
  status            RmStrategieStatus @default(entwurf)
  verabschiedetAm   DateTime?
  verabschiedetVonUserId String?
  naechsteUeberpruefung  DateTime?

  createdByUserId String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@map("rm_strategien")
  @@index([institutionId])
}

model Risikotragfaehigkeit {
  id            String   @id @default(uuid())
  institutionId String
  institution   InstitutionProfile @relation(fields: [institutionId], references: [id])

  periode                 String   // z. B. "2026-Q1"
  ansatz                  RtfAnsatz
  risikodeckungspotenzial Float?
  limits                  Json @default("{}") // { RisikoartKategorie: { limit, auslastung } }
  auslastungGesamt        Float?
  ergebnis                String?
  methodenpruefungAm      DateTime?
  freigegebenVonUserId    String?
  freigegebenAm           DateTime?

  createdByUserId String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@map("rm_risikotragfaehigkeit")
  @@index([institutionId])
}

model RmReport {
  id            String   @id @default(uuid())
  institutionId String
  institution   InstitutionProfile @relation(fields: [institutionId], references: [id])

  reportType   String   // "quartalsbericht" | "jahresbericht" | "anlassbericht"
  periodFrom   DateTime?
  periodTo     DateTime?
  status       RmReportStatus @default(entwurf)
  content      Json @default("{}")
  finalizedAt  DateTime?

  createdByUserId String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  acknowledgements RmReportAcknowledgement[]

  @@map("rm_reports")
  @@index([institutionId])
}

model RmReportAcknowledgement {
  id             String   @id @default(uuid())
  reportId       String
  report         RmReport @relation(fields: [reportId], references: [id])
  userId         String
  acknowledgedAt DateTime @default(now())

  @@unique([reportId, userId])
  @@map("rm_report_acknowledgements")
}
```

### RBAC-Ergänzungen

```ts
| "riskManagementRecord"    // Risikoinventur, Risikotragfähigkeit
| "riskStrategy.approve"    // Verabschiedung Geschäfts-/Risikostrategie — GL-exklusiv
| "riskManagementReport"
| "riskManagementReport.acknowledge"
| "riskCapitalPlanning"           // seit 2026-09-23 — Kapitalplanung, AT 4.1 Tz. 10
| "riskCapitalPlanning.approve"   // Verabschiedung — GL-exklusiv, wie riskStrategy.approve
| "riskStressTest"                // seit 2026-09-23 — Stresstests, AT 4.3.3
```

Vorschlag Matrix: `riskManagementRecord` write = `RISIKOCONTROLLING, ADMIN`, read = alle Rollen
(inkl. `VIEWER`) — deckungsgleich mit dem Muster der bestehenden Module. `riskStrategy.approve`
write = `GESCHAEFTSLEITUNG, ADMIN`, exakt wie `report.approve` heute für AT 9. Die zwei neuen
Resources folgen exakt demselben Muster: `riskCapitalPlanning`/`riskStressTest` write =
`RISIKOCONTROLLING, ADMIN`, read = alle Rollen; `riskCapitalPlanning.approve` write =
`GESCHAEFTSLEITUNG, ADMIN`. Ein `riskModelRecord` für das Modellregister wird bewusst hier nicht
vorgeschlagen — siehe Update 2026-09-23 oben.

### Routen (Vorschlag)

```
/risikomanagement/inventur
/risikomanagement/strategien
/risikomanagement/strategien/:id/approve
/risikomanagement/risikotragfaehigkeit
/risikomanagement/reports
/risikomanagement/kapitalplanung              (seit 2026-09-23)
/risikomanagement/kapitalplanung/:id/verabschieden
/risikomanagement/stresstests                 (seit 2026-09-23)
```

### Phase 2: AT 3.2 / AT 4.2 Tz. 3 / AT 4.3.4 — umgesetzt (23.09.2026)

Schließt die drei "Neu gefundenen Lücken" oben (Nr. 4, 6, 7).

**AT 3.2 Aufsichtsorgan-Reporting**: kein neues Modell — `RmReport` bekommt stattdessen ein Feld
`empfaenger` (`geschaeftsleitung` | `aufsichtsorgan`), da Form und Lifecycle
(Entwurf → final → Kenntnisnahme) identisch zum GL-Bericht sind, nur Empfänger und Zweck
unterscheiden sich. `RmReport` hat seither auch eine (entwurfs-beschränkte) PUT-Route.

**AT 4.2 Tz. 3 NPL-Strategie** (konditional, nur bei hohem NPL-Bestand relevant):

```prisma
model RmNplKennzahl {
  id            String   @id @default(uuid())
  institutionId String
  institution   InstitutionProfile @relation(fields: [institutionId], references: [id])

  periode              String // z. B. "2026-Q3"
  nplQuote             Float?
  nplBestand           Float?
  zielQuote            Float?
  abbaupfadEingehalten Boolean?
  massnahmen           String?

  createdByUserId String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@map("rm_npl_kennzahlen")
  @@index([institutionId])
}
```

Periodischer KPI-Snapshot, analog zu `Risikotragfaehigkeit`. RBAC: reuse `riskManagementRecord`
(dieselbe Ressource wie Risikoinventur/RTF). Bleibt in Instituten ohne relevanten NPL-Bestand
einfach leer, kein Pflegezwang. Route: `src/modules/risikomanagement/npl.routes.ts`.

**AT 4.3.4 Modellregister** — Modellrisiko-Governance (Auswahl, Validierung, Rekalibrierung,
Überschreibungen, Erklärbarkeit, explizit inklusive künstlicher Intelligenz):

```prisma
enum RmModellErklaerbarkeit { hoch mittel gering }
enum RmModellStatus { aktiv ausser_betrieb }
enum RmModellValidierungErgebnis { bestaetigt rekalibrierung_erforderlich ausser_betrieb_genommen }

model RmModell {
  id            String   @id @default(uuid())
  institutionId String
  institution   InstitutionProfile @relation(fields: [institutionId], references: [id])

  bezeichnung                  String
  zweck                        String?
  enthaeltKiMlKomponente       Boolean @default(false)
  erklaerbarkeit               RmModellErklaerbarkeit?
  ueberschreibungenVorhanden   Boolean @default(false)
  ueberschreibungenBegruendung String?
  verantwortlichUserId         String?
  status                       RmModellStatus @default(aktiv)
  naechsteValidierung          DateTime?

  createdByUserId String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  validierungen RmModellValidierung[]

  @@map("rm_modelle")
  @@index([institutionId])
}

// Append-only Historie, analog zu BerechtigungsRezertifizierung.
model RmModellValidierung {
  id       String   @id @default(uuid())
  modellId String
  modell   RmModell @relation(fields: [modellId], references: [id])

  durchgefuehrtAm        DateTime
  durchgefuehrtVonUserId String?
  ergebnis               RmModellValidierungErgebnis
  kommentar              String?

  createdAt DateTime @default(now())

  @@map("rm_modell_validierungen")
  @@index([modellId])
}
```

Validierungsergebnis "ausser_betrieb_genommen" setzt das Modell im selben Aufruf außer Betrieb
(zwei `withAudit`-Aufrufe, eine Audit-Zeile je Entität). Neue RBAC-Ressource
`modelGovernanceRecord` (read: alle Rollen, write: RISIKOCONTROLLING/ADMIN). Route:
`src/modules/risikomanagement/modelle.routes.ts`.

Frontend für alle drei: `/risikomanagement#bericht` (jetzt mit Empfänger-Auswahl),
`/risikomanagement#npl`, `/risikomanagement#modelle`.

Editing-UI für bestehende Einträge ohne eigene Lifecycle-Aktion (Risikoinventur,
Geschäfts-/Risikostrategien — nur `naechsteUeberpruefung`, das `inhalt`-JSON hat noch keinen
eigenen Editor) ist ebenfalls umgesetzt, nach demselben Muster wie überall sonst im Produkt:
Bearbeiten-Button pro Zeile, PUT-Route re-nutzt bestehende Lifecycle-Guards unverändert.

---

## Modul 2: IT-Risikomanagement / BAIT

### MVP-Umfang (Phase 1)

| Baustein | Zweck | BAIT-Kapitel (Arbeitstitel) |
|---|---|---|
| IT-Strategie | Verabschiedung/Review, Konsistenz-Check zur Geschäftsstrategie | Kap. 1 IT-Strategie · **verifiziert auch in MaRisk AT 4.2 Tz. 2** (Geschäftsleitung muss eine mit der Geschäftsstrategie konsistente IKT-Strategie festlegen, ggf. mit der DOR-Strategie zusammengelegt) |
| Schutzbedarfsfeststellung | Asset-Register (Anwendung/System/Netz) mit Schutzbedarf C/I/A | Kap. 3 Informationsrisikomanagement |
| Informationsrisiko-Register | Bedrohung → Maßnahme → Restrisiko je Asset, GL-Akzeptanz bei Restrisiko | Kap. 3 Informationsrisikomanagement |
| IT-Sicherheitsvorfälle | Erfassung, Eskalation, BaFin-Meldepflicht-Flag | Kap. 4 Informationssicherheit (operativ) |

**Kapitelnumerierung korrigiert (23.09.2026, siehe Update oben):** Der Primärtext von
Rundschreiben 10/2017 (BA) liegt jetzt vor. Kap. 5 ist tatsächlich Operative Informationssicherheit
(kein Modell im MVP), Kap. 6 Identitäts- und Rechtemanagement (Berechtigungsmanagement), Kap. 7
IT-Projekte und Anwendungsentwicklung, Kap. 8 IT-Betrieb (Änderungsmanagement, Betriebsstörungen,
Datensicherung, Kapazitätsmanagement), Kap. 9 Auslagerungen, Kap. 10 IT-Notfallmanagement.

**Phase 2, Stand 23.09.2026:** Berechtigungsmanagement (Kap. 6), IT-Projekte (Kap. 7) und
Änderungsmanagement/Datensicherung (Kap. 8) werden auf **PR #13** geliefert (bereits weiter
fortgeschritten, inkl. Editing-UI). **Kap. 8 Betriebsstörungen** und **Kap. 10
IT-Notfallmanagement** sind in diesem Branch umgesetzt, siehe Abschnitt weiter unten. Eine eigene
ISB-Login-Rolle bleibt bewusst offen. Kap. 9 (Auslagerungssteuerung IT-Dienstleister) bekommt
bewusst **kein** eigenes Modell — siehe Verzahnungs-Hinweis oben, das ist bereits
`OutsourcingActivity`.

### Vorgeschlagene Enums

```prisma
enum ItStrategieStatus {
  entwurf
  verabschiedet
}

enum ItSchutzbedarf {
  normal
  hoch
  sehr_hoch
}

enum ItAssetKategorie {
  anwendung
  it_system
  netzwerk
  rechenzentrum
  sonstige
}

enum ItRisikoStatus {
  offen
  in_bearbeitung
  akzeptiert_von_gl
  geschlossen
}

enum ItVorfallSchweregrad {
  gering
  mittel
  hoch
  kritisch
}

enum ItVorfallStatus {
  offen
  in_bearbeitung
  geschlossen
}
```

### Vorgeschlagene Modelle (Auszug, MVP)

```prisma
model ItStrategie {
  id            String   @id @default(uuid())
  institutionId String
  institution   InstitutionProfile @relation(fields: [institutionId], references: [id])

  jahr             Int
  inhalt           Json @default("{}")
  status           ItStrategieStatus @default(entwurf)
  verabschiedetAm  DateTime?
  verabschiedetVonUserId String?
  konsistenzpruefungGeschaeftsstrategie String? // Abgleichnotiz zu Kap. 1
  naechsteUeberpruefung DateTime?

  createdByUserId String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@map("bait_it_strategien")
  @@index([institutionId])
}

model ItAsset {
  id            String   @id @default(uuid())
  institutionId String
  institution   InstitutionProfile @relation(fields: [institutionId], references: [id])

  bezeichnung   String
  kategorie     ItAssetKategorie
  eigentuemerUserId String?

  schutzbedarfVertraulichkeit ItSchutzbedarf?
  schutzbedarfIntegritaet     ItSchutzbedarf?
  schutzbedarfVerfuegbarkeit  ItSchutzbedarf?
  begruendung                 String?

  letzteUeberpruefung  DateTime?
  naechsteUeberpruefung DateTime?

  createdByUserId String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  itRisiken ItRisiko[]

  @@map("bait_it_assets")
  @@index([institutionId])
}

model ItRisiko {
  id            String   @id @default(uuid())
  institutionId String
  institution   InstitutionProfile @relation(fields: [institutionId], references: [id])

  assetId       String?
  asset         ItAsset? @relation(fields: [assetId], references: [id])

  bedrohung               String
  eintrittswahrscheinlichkeit String?
  auswirkung                  String?
  bruttorisiko                String?
  massnahme                   String?
  restrisiko                  String?
  status                      ItRisikoStatus @default(offen)
  verantwortlichUserId        String?
  akzeptiertVonUserId         String? // GL-Akzeptanz bei verbleibendem Restrisiko
  akzeptiertAm                DateTime?

  createdByUserId String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@map("bait_it_risiken")
  @@index([institutionId])
  @@index([assetId])
}

model ItSicherheitsvorfall {
  id            String   @id @default(uuid())
  institutionId String
  institution   InstitutionProfile @relation(fields: [institutionId], references: [id])

  datum         DateTime
  kategorie     String?
  schweregrad   ItVorfallSchweregrad
  beschreibung  String
  betroffeneSysteme String?
  eskalationAnUserId String?

  meldepflichtBaFin Boolean  @default(false)
  meldedatumBaFin   DateTime?

  status        ItVorfallStatus @default(offen)
  massnahme     String?
  abschlussAm   DateTime?
  abschlussVonUserId String?

  createdByUserId String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@map("bait_it_sicherheitsvorfaelle")
  @@index([institutionId])
}
```

### RBAC-Ergänzungen

```ts
| "itGovernanceRecord"     // ItStrategie
| "itStrategy.approve"     // GL-exklusiv, wie riskStrategy.approve
| "itRiskRecord"           // ItAsset, ItRisiko
| "itRisk.accept"          // GL akzeptiert Restrisiko — analog handlungsoption.approve
| "itSecurityIncident"
| "itOperationsRecord"     // Betriebsstörungen, Kap. 8 (Tz. 8.6) — umgesetzt 23.09.2026
| "itContingencyRecord"    // IT-Notfallpläne/-tests, Kap. 10 — umgesetzt 23.09.2026
```

Offene Frage unten: ob es dafür eine eigene `INFORMATIONSSICHERHEITSBEAUFTRAGTER`-Rolle braucht,
oder ob `RISIKOCONTROLLING`/`ADMIN` für die MVP-Phase reicht. `itOperationsRecord`/
`itContingencyRecord` übernehmen dieselbe vorläufige Antwort.

### Routen (Vorschlag)

```
/it-risiko/strategie
/it-risiko/assets
/it-risiko/risiken
/it-risiko/risiken/:id/accept
/it-risiko/vorfaelle

# Kap. 8 Betriebsstörungen / Kap. 10 IT-Notfallmanagement — umgesetzt 23.09.2026
/it-risiko/betriebsstoerungen
/it-risiko/betriebsstoerungen/:id/abschliessen
/it-risiko/notfallmanagement/plaene
/it-risiko/notfallmanagement/plaene/:id/freigeben
/it-risiko/notfallmanagement/plaene/:planId/tests
```

### Kap. 8 Betriebsstörungen und Kap. 10 IT-Notfallmanagement — umgesetzt (23.09.2026)

Bewusst getrennt von `ItSicherheitsvorfall` (Kap. 4/5) — die BAIT grenzt
"Informationssicherheitsvorfall", "sicherheitsrelevantes Ereignis" und "ungeplante Abweichung vom
Regelbetrieb" (Störung) explizit voneinander ab (Tz. 4.7).

```prisma
enum ItStoerungPrioritaet { niedrig mittel hoch kritisch }
enum ItStoerungStatus { offen in_bearbeitung geschlossen }

model ItBetriebsstoerung {
  id                          String   @id @default(uuid())
  institutionId               String
  datum                       DateTime
  beschreibung                String
  betroffeneSysteme           String?
  ursache                     String?
  prioritaet                  ItStoerungPrioritaet @default(mittel)
  status                      ItStoerungStatus @default(offen)
  massnahme                   String?
  eskalationAnUserId          String?
  geschaeftsleitungInformiert Boolean @default(false)
  abschlussAm                 DateTime?
  abschlussVonUserId          String?
}

enum ItNotfallplanStatus { entwurf freigegeben }

model ItNotfallplan {
  id                      String   @id @default(uuid())
  institutionId           String
  assetId                 String?
  bezeichnung             String
  rto                     String? // Recovery Time Objective, Tz. 10.3
  rpo                     String? // Recovery Point Objective, Tz. 10.3
  konfigurationNotbetrieb String?
  abhaengigkeiten         String?
  status                  ItNotfallplanStatus @default(entwurf)
  freigegebenVonUserId    String?
  freigegebenAm           DateTime?
  letzterTestAm           DateTime? // aus dem letzten ItNotfalltest fortgeschrieben, Tz. 10.4
}

// Mindestens jährlicher Wirksamkeitstest je Notfallplan (Tz. 10.4).
model ItNotfalltest {
  id                     String   @id @default(uuid())
  institutionId          String
  notfallplanId          String
  datum                  DateTime
  umfang                 String?
  ergebnis               String?
  abgeleiteteMassnahmen  String?
  durchgefuehrtVonUserId String?
}
```

Migration `20260923190000_bait_kap8_betriebsstoerungen_kap10_notfallmanagement`, verifiziert gegen
eine frische Postgres-16-Instanz (`prisma migrate deploy` + `prisma migrate diff` ohne Drift) und
gegen die Produktions-DB angewendet. Frontend-Panels unter `/it-risiko#betriebsstoerungen` und
`/it-risiko#notfallmanagement`.

---

## Gemeinsame Non-Negotiables (unverändert)

Beide Module folgen den drei Grundsätzen aus dem README ausnahmslos:

1. Jeder Write läuft durch `withAudit(...)` — Fachdaten und `AuditLogEvent` in derselben
   Transaktion.
2. RBAC wird serverseitig in `rbac.ts` geprüft, nicht nur im Frontend versteckt.
3. Keine Inline-Blobs/Dateien in der DB — Nachweise laufen über das bestehende, generische
   `Nachweis`-Modell (dafür müsste `EvidenceModule` um `RISK_MANAGEMENT` und `IT_RISK` ergänzt
   werden).

## Rollout-Reihenfolge (Vorschlag)

1. Migration: neue Enums/Modelle für beide Module (additiv, keine bestehenden Tabellen ändern
   sich).
2. Modul 1 MVP (Risikoinventur, Strategie, RTF, Report) — kleinerer Blast Radius, kein neuer
   RBAC-Rollentyp nötig.
3. Modul 2 MVP (IT-Strategie, Asset-Register, IT-Risiko-Register, Sicherheitsvorfälle).
4. Je nach Entscheidung zur ISB-Rolle: `Role`-Enum erweitern + Seed-User anpassen.

## Offene Fragen an dich

1. ~~Trifft die Eingrenzung oben ("MaRisk Novelle 9" = ...) das, was du meinst?~~ **Geklärt** —
   gegen den Primärtext (Rundschreiben 06/2026 (BA), Stand 30.06.2026) geprüft, siehe
   "Korrekturen nach Quellenabgleich" oben.
2. ~~Passt die BAIT-Priorisierung?~~ **Geklärt (19.09.2026) — ja, Reihenfolge bleibt wie
   ursprünglich vorgeschlagen.** Die Kapitelnummern selbst wurden später (23.09.2026) gegen den
   BAIT-Primärtext korrigiert — siehe "BAIT-Kapitelbezeichnungen jetzt gegen die Primärquelle
   geprüft" oben.
3. ~~Braucht Kap. 4 BAIT eine eigene `INFORMATIONSSICHERHEITSBEAUFTRAGTER`-Login-Rolle?~~
   **Geklärt — nein**, `RISIKOCONTROLLING`/`ADMIN` bleiben zuständig.

Alle drei ursprünglichen Fragen sind geklärt, alle zwölf BAIT-Kapitel (soweit im MVP-Scope) sind
umgesetzt, die Editing-UI für bestehende Einträge ist nachgezogen, alle drei in "Neu gefundene
Lücken" aufgeführten Regelungslücken (AT 3.2 Aufsichtsorgan-Reporting, AT 4.3.4 Modelle, AT 4.2
Tz. 3 NPL-Strategie) sind umgesetzt, und die Nachweis/`EvidenceModule`-Integration (echte
Upload-/Versionierungs-UI, siehe oben) ist ebenfalls fertig. Damit ist die in dieser Spezifikation
ursprünglich skizzierte Ausbaustufe vollständig umgesetzt.
