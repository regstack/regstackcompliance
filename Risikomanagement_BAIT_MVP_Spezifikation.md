# Risikomanagement (MaRisk AT 4) & BAIT/IT-Risikomanagement — MVP-Spezifikation

**Status:** Beide Module sind vollständig umgesetzt — Prisma-Modelle, Migration, RBAC-Einträge
und Routen liegen in `src/modules/risikomanagement/` und `src/modules/itRisiko/` (siehe
Commit-Historie), das Frontend ist unter `/risikomanagement` und `/it-risiko` angebunden, und
`prisma/seed.ts` liefert Musterdaten für alle acht Modelle (Risikoinventur, Risikostrategie,
Risikotragfähigkeit, RmReport, ItStrategie, ItAsset, ItRisiko, ItSicherheitsvorfall). Migration
lokal gegen ein frisches Postgres 16 verifiziert (`prisma migrate deploy` + `prisma migrate diff`
ohne Drift + Smoke-Test über den generierten Client). `EvidenceModule` wurde um `RISK_MANAGEMENT`
und `IT_RISK` erweitert, sodass Nachweise und Feststellungen aus externen Prüfungen jetzt auch
gegen diese beiden Module gebucht werden können. Offen bleiben nur noch die drei Fragen im
letzten Abschnitt.

Zwei neue Fachmodule als nächster Ausbauschritt von RegStack, im selben Baustil wie die drei
bestehenden Module (Auslagerungsmanagement AT 9, Compliance AT 4.4.2, Interne Revision AT 4.4.3):
ein Ordner je Modul unter `src/modules/`, Prisma-Modelle mit `institutionId`-Scoping, RBAC-Eintrag
je Resource in `src/middleware/rbac.ts`, jeder Write über `withAudit(...)`.

**Gegen die Primärquelle geprüft (19.09.2026):** Die Annahme unten wurde gegen den tatsächlichen
Text von Rundschreiben 06/2026 (BA), "BA 54 – MaRisk vom 30.06.2026" (9. MaRisk-Novelle) geprüft
— dieselbe Fassung, auf die README.md und die Marketing-Seite bereits Bezug nehmen. Ergebnis:
im Kern richtig, mit drei konkreten Korrekturen und vier neu gefundenen Lücken, siehe
"Korrekturen nach Quellenabgleich" unten. Die BAIT-Kapitelbezeichnungen (Rundschreiben 10/2017
(BA)) wurden am 20.09.2026 zusätzlich per Websuche gegengeprüft (kein direkter Primärtext-Zugriff
möglich, siehe "Primärquellen-Abgleich BAIT/DORA" unten) — **ein konkreter Fund:** die
BAIT-Kapitelliste, gegen die unten gemappt wird, ist unvollständig, siehe dort.

Umsetzungsstand: AT 4.1 (Risikotragfähigkeit), AT 4.2 (Strategien), AT 4.3.2 (RM-Prozesse, nur
das Reporting-Element), AT 4.4.1 (Risikocontrolling-Funktion), die AT-2.2-Pflichtrisikoarten
inkl. ESG sowie AT 3.2 (Aufsichtsorgan-Berichtswesen, `AufsichtsorganBericht`/
`rm_aufsichtsorgan_berichte`, siehe Punkt 4 unten) sind in den Phase-1-Modellen abgedeckt.
AT 4.3.4 (Modelle) und die konditionale AT-4.2-Tz.-3-NPL-Strategie sind es nicht — siehe unten.

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

### Neu gefundene Lücken (nicht im aktuellen Modell)

4. **AT 3.2 Verantwortung des Aufsichtsorgans** — mindestens vierteljährliches Reporting in
   Textform an das Aufsichtsorgan (Geschäftslage, Risikosituation, Strategien inkl. Anpassungen,
   Compliance-Bericht, Revisionsberichte). Ein eigenes, vom GL-Bericht (`RmReport`) verschiedenes
   Berichtsziel/-publikum — **umgesetzt** als `AufsichtsorganBericht` (`src/modules/risikomanagement/
   aufsichtsorganBerichte.routes.ts`, Route `/risikomanagement/aufsichtsorganberichte`,
   RBAC-Resource `supervisoryBoardReport`, GL-exklusiv): Entwurf → final → **versendet** — der
   dritte Status dokumentiert die tatsächliche Übermittlung an das Aufsichtsorgan als eigenen
   Nachweis, weil das Aufsichtsorgan selbst keinen RegStack-Login hat und ein Kenntnisnahme-Flow
   wie bei `RmReport` deshalb nicht passt. Migration lokal gegen ein frisches Postgres 16
   verifiziert (`prisma migrate deploy` + `prisma migrate diff` ohne Drift + Smoke-Test), Frontend
   unter `/risikomanagement` (`AufsichtsorganBerichtPanel`) angebunden, Musterdaten in
   `prisma/seed.ts` (ein Bericht im Status `versendet`, zeigt den vollen Zyklus).
5. **AT 4.2 Tz. 2 verlangt eine mit der Geschäftsstrategie konsistente IKT-Strategie** — direkt
   durch die Geschäftsleitung, mit optionaler Zusammenlegung mit einer DOR-Strategie (DORA
   digitale operationale Resilienz). Das ist dieselbe Sache wie `ItStrategie`/BAIT Kap. 1 — die
   Mapping-Tabelle unten sollte "AT 4.2 Tz. 2" als Zweitquelle neben "BAIT Kap. 1" führen.
6. **AT 4.2 Tz. 3: NPL-Strategie** für Institute mit hohem Bestand notleidender Risikopositionen,
   inkl. vierteljährlichem KPI-Tracking des Abbaufortschritts — konditional (nur relevant bei
   hohem NPL-Bestand), daher kein MVP-Kandidat, aber ein sauberer Phase-2-Kandidat, falls relevant.
7. **AT 4.3.4 Verwendung von Modellen** — komplett neues Kapitel, deckt Modellrisiko-Governance ab
   (Auswahl, Validierung, Rekalibrierung, Überschreibungen, Erklärbarkeit), explizit inklusive
   "technologiegestützter Innovation und künstlicher Intelligenz". Kein Modell dafür existiert
   bisher; ein schlankes `Modellregister` (Modell, Zweck, letzte Validierung, Erklärbarkeits-
   Bewertung) wäre der naheliegende Phase-2-Zuschnitt.

### Primärquellen-Abgleich BAIT/DORA (20.09.2026)

**Methode/Einschränkung:** Direkter Zugriff auf die Primärtexte (bafin.de, eur-lex.europa.eu,
de.wikipedia.org sowie sämtliche in der Suche gefundenen Sekundärquellen wie springlex.eu,
dbvev.de, cybersecurity-navigator.de) war aus dieser Sandbox nicht möglich — die Egress-Policy der
Umgebung blockiert ausnahmslos jeden dieser Hosts (`connect_rejected`, "organization policy"),
bestätigt per direktem `curl`-Test, nicht nur über das Fetch-Tool. Erreichbar war nur die
Websuche selbst (offenbar ein separater Kanal), die verdichtete Ergebnistexte liefert, aber keinen
zitierfähigen Tz.-genauen Volltext. Die folgenden Funde sind entsprechend **Websuche-Snippets,
keine Primärtext-Verifikation** — für eine belastbare Prüfung wie beim MaRisk-Abgleich oben (Tz.
für Tz. gegen den tatsächlichen Rundschreiben-Text) braucht es Zugriff von außerhalb dieser
Sandbox.

**BAIT (Rundschreiben 10/2017 (BA)):**
- Die aktuell gültige Fassung ist vom **16.12.2024** (wirksam ab 17.01.2025), nicht die
  Ursprungsfassung vom 03.11.2017, auf die die Mapping-Tabellen oben implizit Bezug nehmen. Bei
  einer künftigen Tz.-genauen Prüfung immer die 2024er-Fassung als Referenz nehmen.
- Die Kapitelliste, gegen die oben gemappt wird (Kap. 1 IT-Strategie, Kap. 3
  Informationsrisikomanagement, Kap. 4 Informationssicherheit, Kap. 5
  Benutzerberechtigungsmanagement, Kap. 6 IT-Projekte, Kap. 7 IT-Betrieb, Kap. 8 Auslagerungen) ist
  laut mehreren übereinstimmenden Sekundärquellen **unvollständig**: BAIT hat zusätzlich ein
  **Kap. 2 IT-Governance** (in der Mapping-Tabelle bisher komplett unerwähnt) und, seit der
  2021er-Novelle, ein **Kap. 9 Kritische Infrastrukturen** (KRITIS-Betreiber). Mit der 2024er-Fassung
  wurde außerdem ein früheres Kapitel zu Zahlungsdienstleister-Beziehungen aufgehoben (Überschneidung
  mit DORA). Kap. 4 könnte laut einer Quelle in "Informationssicherheitsmanagement" (Governance:
  Leitlinie, ISB, Sensibilisierung) und eine operative Teilkomponente zerfallen — ob das eine eigene
  Kapitelnummer oder nur eine Tz.-Ebene innerhalb Kap. 4 ist, ließ sich aus den Snippets nicht
  zweifelsfrei klären. **Handlungsempfehlung:** vor einer echten aufsichtsrechtlichen Verwendung der
  Kapitelverweise (RBAC-Kommentare, UI-Texte) die 2024er-Fassung volltextlich beschaffen und Kap. 2/4/9
  gezielt gegenprüfen.

**DORA-Registermodul (Durchführungsverordnung (EU) 2024/2956):**
Den 15 Meldevorlagen liegt ein Sechs-Ebenen-Modell zugrunde: (1) meldepflichtige Einheit +
Zweigstellen, (2) IKT-Drittanbieter inkl. konzerninterner Anbieter, (3) Vertragsverhältnis
(1 Datensatz je Vertrag) + Jahreskosten + Exit-Strategie, (4) je Vertrag bezogene IKT-Dienstleistungen
+ Service-Level-Objectives, (5) unterstützte Funktionen (mit CIF-Flag "kritisch oder wichtig") +
IKT-Assets + Datenklassifizierung, (6) Weiterverlagerungskette bei kritischen/wichtigen
Vertragsverhältnissen. Gegen `IctProvider`/`IctArrangement` (`prisma/schema.prisma`) geprüft ergeben
sich drei konkrete strukturelle Lücken (siehe auch README „Nächste Schritte"):
1. Keine Felder für **Jahreskosten** oder **Exit-Strategie** je Vertragsverhältnis (Ebene 3).
2. **Mehrere IKT-Dienstleistungen/SLA je Vertrag** werden nicht strukturiert abgebildet — nur ein
   einzelnes `functionDescription`-Freitextfeld (Ebene 4 fehlt als eigene Tabelle).
3. Die **Weiterverlagerungskette** (Ebene 6) ist nur ein Freitextfeld (`subcontractingNote`), nicht
   strukturiert, obwohl RegStack für AT 9 (`Weiterverlagerung`-Modell bei `OutsourcingActivity`)
   bereits ein Muster für strukturierte Ketten hat, das hier nicht wiederverwendet wird.

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

**Bewusst auf Phase 2 verschoben:** granulare BTR-Formulare je Risikoart (Kreditrisiko-Scoring,
Zinsschock-Rechner etc.), Stresstest-Workflow, Limitüberschreitungs-Eskalationskette. Diese sind
fachlich groß genug für eigene Sub-Specs und sollten nicht die MVP-Lieferung blockieren.

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
```

Vorschlag Matrix: `riskManagementRecord` write = `RISIKOCONTROLLING, ADMIN`, read = alle Rollen
(inkl. `VIEWER`) — deckungsgleich mit dem Muster der bestehenden Module. `riskStrategy.approve`
write = `GESCHAEFTSLEITUNG, ADMIN`, exakt wie `report.approve` heute für AT 9.

### Routen (Vorschlag)

```
/risikomanagement/inventur
/risikomanagement/strategien
/risikomanagement/strategien/:id/approve
/risikomanagement/risikotragfaehigkeit
/risikomanagement/reports
```

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

1. Trifft die Eingrenzung oben ("MaRisk Novelle 9" = aktuelle AT-4-Risikomanagement-Kapitel inkl.
   ESG) das, was du meinst, oder zielst du auf eine bestimmte Fassung/Novellen-Nummer, die ich noch
   nicht kenne?
2. Passt die BAIT-Priorisierung (IT-Strategie + Schutzbedarf + Risiko-Register + Sicherheitsvorfälle
   zuerst, Berechtigungsmanagement/IT-Projekte/IT-Betrieb später), oder ist für euer Institut z. B.
   das Berechtigungsmanagement (Kap. 5) dringlicher fürs MVP?
3. Braucht Kap. 4 BAIT (Informationssicherheit) eine eigene `INFORMATIONSSICHERHEITSBEAUFTRAGTER`-
   Login-Rolle, oder reicht `RISIKOCONTROLLING`/`ADMIN` fürs MVP?

Sobald das steht, kann ich direkt mit Modul 1 (Risikomanagement) anfangen: Prisma-Migration,
`src/modules/risikomanagement/`, RBAC-Einträge, Routen, Tests — im selben Zug wie die drei
bestehenden Module.
