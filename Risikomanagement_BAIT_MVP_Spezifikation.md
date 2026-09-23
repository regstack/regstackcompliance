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

Zwei neue Fachmodule als nächster Ausbauschritt von RegStack, im selben Baustil wie die drei
bestehenden Module (Auslagerungsmanagement AT 9, Compliance AT 4.4.2, Interne Revision AT 4.4.3):
ein Ordner je Modul unter `src/modules/`, Prisma-Modelle mit `institutionId`-Scoping, RBAC-Eintrag
je Resource in `src/middleware/rbac.ts`, jeder Write über `withAudit(...)`.

**Gegen die Primärquelle geprüft (19.09.2026):** Die Annahme unten wurde gegen den tatsächlichen
Text von Rundschreiben 06/2026 (BA), "BA 54 – MaRisk vom 30.06.2026" (9. MaRisk-Novelle) geprüft
— dieselbe Fassung, auf die README.md und die Marketing-Seite bereits Bezug nehmen. Ergebnis:
im Kern richtig, mit drei konkreten Korrekturen und vier neu gefundenen Lücken, siehe
"Korrekturen nach Quellenabgleich" unten. Die BAIT-Kapitelbezeichnungen (Rundschreiben 10/2017
(BA)) sind davon unberührt und weiterhin ungeprüft — dafür liegt uns noch kein Primärtext vor.

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

**Bewusst auf Phase 2 verschoben:** Benutzerberechtigungsmanagement/Rezertifizierungszyklen
(Kap. 5), IT-Projekte-Register (Kap. 6), IT-Betrieb/Kapazitätskennzahlen (Kap. 7), eine eigene
ISB-Login-Rolle. Kap. 8 (Auslagerungssteuerung IT-Dienstleister) bekommt bewusst **kein** eigenes
Modell — siehe Verzahnungs-Hinweis oben, das ist bereits `OutsourcingActivity`.

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
```

Offene Frage unten: ob es dafür eine eigene `INFORMATIONSSICHERHEITSBEAUFTRAGTER`-Rolle braucht,
oder ob `RISIKOCONTROLLING`/`ADMIN` für die MVP-Phase reicht.

### Routen (Vorschlag)

```
/it-risiko/strategie
/it-risiko/assets
/it-risiko/risiken
/it-risiko/risiken/:id/accept
/it-risiko/vorfaelle
```

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
