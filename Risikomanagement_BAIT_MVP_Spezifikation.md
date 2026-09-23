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
"Korrekturen nach Quellenabgleich" unten.

**BAIT-Kapitelbezeichnungen jetzt gegen die Primärquelle geprüft (23.09.2026):** uns liegt jetzt
der Volltext von Rundschreiben 10/2017 (BA) in der Fassung vom 16.12.2024 vor. Die zwölf Kapitel
(Kap. 11 ist aufgehoben) lauten exakt: 1. IT-Strategie, 2. IT-Governance, 3.
Informationsrisikomanagement, 4. Informationssicherheitsmanagement, 5. Operative
Informationssicherheit, 6. Identitäts- und Rechtemanagement, 7. IT-Projekte und
Anwendungsentwicklung, 8. IT-Betrieb, 9. Auslagerungen und sonstiger Fremdbezug von
IT-Dienstleistungen, 10. IT-Notfallmanagement, 12. Kritische Infrastrukturen. Die weiter unten
verwendeten "Arbeitstitel" waren an zwei Stellen falsch nummeriert und werden hiermit korrigiert:
das ursprünglich als "Kap. 5" bezeichnete Berechtigungsmanagement ist tatsächlich **Kap. 6**, das
als "Kap. 6" bezeichnete IT-Projekte-Register ist **Kap. 7**, "Kap. 7" IT-Betrieb ist **Kap. 8**
und "Kap. 8" Auslagerungssteuerung ist **Kap. 9**. Kap. 12 (Kritische Infrastrukturen) betrifft
nur KRITIS-Betreiber (§ 8a BSIG) und bleibt bewusst außen vor — siehe "Bewusst nicht umgesetzt"
unten.

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

**Phase 2 — umgesetzt (23.09.2026):** vier weitere Bausteine, korrekt nummeriert gegen den
jetzt vorliegenden Primärtext (siehe Korrektur oben):

| Baustein | Zweck | BAIT-Kapitel |
|---|---|---|
| Berechtigungsmanagement | `ItBerechtigung` — Einrichtung/Genehmigung, Rezertifizierung, Entzug; Flag für privilegierte/technische Benutzer | Kap. 6 Identitäts- und Rechtemanagement |
| IT-Projekte-Register | `ItProjekt` — Portfolio-Steuerung, Lessons-Learned bei Abschluss | Kap. 7 IT-Projekte und Anwendungsentwicklung |
| IDV-Zusatzfelder | `ItAsset` erweitert um `istIdv`/`fremdOderEigenentwicklung`/`technischVerantwortlichUserId`/`technologie` statt eines zweiten Registers | Kap. 7.13/7.14 IDV |
| Änderungsmanagement | `ItAenderung` — beantragt→genehmigt→umgesetzt, mit Rückabwicklungsplan | Kap. 8 IT-Betrieb |
| Betriebsstörungen | `ItBetriebsstoerung` — bewusst getrennt von `ItSicherheitsvorfall` (Kap. 4/5), da die BAIT "Störung" explizit von "Informationssicherheitsvorfall" abgrenzt (Tz. 4.7) | Kap. 8 IT-Betrieb |
| IT-Notfallmanagement | `ItNotfallplan` (RTO/RPO/Notbetrieb je Asset) + `ItNotfalltest` (mindestens jährlich, Tz. 10.4) | Kap. 10 IT-Notfallmanagement |

Migration `20260923000000_bait_kap6_7_8_10_workflows`, RBAC-Ressourcen `itAccessRecord` /
`itProjectRecord` / `itOperationsRecord` / `itContingencyRecord` (gleiche vorläufige
Rollenzuordnung wie die Phase-1-Ressourcen — `RISIKOCONTROLLING`/`ADMIN` schreiben, alle
Modul-Rollen lesen), Routen unter `/it-risiko/berechtigungen`, `/it-risiko/projekte`,
`/it-risiko/aenderungen`, `/it-risiko/betriebsstoerungen`, `/it-risiko/notfallmanagement`.
Tests in `tests/risk-bait-rbac.test.ts`.

**Bewusst nicht umgesetzt:** eine eigene ISB-Login-Rolle (offene Frage 3 unten bleibt offen);
Kap. 8.7/8.8 (Datensicherungskonzept-Dokument, Kapazitätsplanung) — die tägliche technische
Datensicherung selbst läuft bereits über `docs/backup-disaster-recovery.md`, ein eigenes
BAIT-Nachweisdokument dafür ist ein sauberer Phase-3-Kandidat; Kap. 8.2 vollständige
Bestandsangaben (Patchlevel, Supportverträge) — `ItAsset` deckt Schutzbedarf/Eigentümer ab, nicht
die volle CMDB-Tiefe. Kap. 9 (Auslagerungssteuerung IT-Dienstleister) bekommt weiterhin bewusst
**kein** eigenes Modell — siehe Verzahnungs-Hinweis oben, das ist bereits `OutsourcingActivity`.
Kap. 12 (Kritische Infrastrukturen) ist KRITIS-Betreiber-spezifisch (§ 8a BSIG) und für das MVP
nicht relevant, solange kein Institut als KRITIS-Betreiber eingestuft ist.

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
| "itAccessRecord"         // Phase 2, Kap. 6 — ItBerechtigung
| "itProjectRecord"        // Phase 2, Kap. 7 — ItProjekt
| "itOperationsRecord"     // Phase 2, Kap. 8 — ItAenderung, ItBetriebsstoerung
| "itContingencyRecord"    // Phase 2, Kap. 10 — ItNotfallplan, ItNotfalltest
```

Offene Frage unten: ob es dafür eine eigene `INFORMATIONSSICHERHEITSBEAUFTRAGTER`-Rolle braucht,
oder ob `RISIKOCONTROLLING`/`ADMIN` für die MVP-Phase reicht — Phase 2 übernimmt für alle vier
neuen Ressourcen dieselbe vorläufige Antwort (`RISIKOCONTROLLING`/`ADMIN` schreiben).

### Routen

```
/it-risiko/strategie
/it-risiko/assets
/it-risiko/risiken
/it-risiko/risiken/:id/accept
/it-risiko/vorfaelle

# Phase 2
/it-risiko/berechtigungen
/it-risiko/berechtigungen/:id/rezertifizieren
/it-risiko/berechtigungen/:id/deaktivieren
/it-risiko/berechtigungen/:id/entziehen
/it-risiko/projekte
/it-risiko/projekte/:id/abschliessen
/it-risiko/projekte/:id/abbrechen
/it-risiko/aenderungen
/it-risiko/aenderungen/:id/genehmigen
/it-risiko/aenderungen/:id/umsetzen
/it-risiko/aenderungen/:id/zurueckstellen
/it-risiko/betriebsstoerungen
/it-risiko/betriebsstoerungen/:id/abschliessen
/it-risiko/notfallmanagement/plaene
/it-risiko/notfallmanagement/plaene/:id/freigeben
/it-risiko/notfallmanagement/plaene/:planId/tests
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

## Rollout-Reihenfolge

1. Migration: neue Enums/Modelle für beide Module (additiv, keine bestehenden Tabellen ändern
   sich). ✅ (`20260919090000_risikomanagement_and_bait_module`)
2. Modul 1 MVP (Risikoinventur, Strategie, RTF, Report) — kleinerer Blast Radius, kein neuer
   RBAC-Rollentyp nötig. ✅
3. Modul 2 MVP (IT-Strategie, Asset-Register, IT-Risiko-Register, Sicherheitsvorfälle). ✅
4. Modul 2 Phase 2 (Berechtigungsmanagement Kap. 6, IT-Projekte Kap. 7, Änderungen/Störungen
   Kap. 8, Notfallmanagement Kap. 10). ✅ (`20260923000000_bait_kap6_7_8_10_workflows`)
5. Je nach Entscheidung zur ISB-Rolle: `Role`-Enum erweitern + Seed-User anpassen. Offen.
6. Frontend-Anbindung für die vier Phase-2-Bausteine (bisher nur Backend + Tests + Seed-Daten).
   Offen.

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
