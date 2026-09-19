# Risikomanagement (MaRisk AT 4) & BAIT/IT-Risikomanagement — MVP-Spezifikation

**Status:** Backend-Scaffolding für beide Module ist umgesetzt — Prisma-Modelle, Migration,
RBAC-Einträge und Routen liegen in `src/modules/risikomanagement/` und `src/modules/itRisiko/`
(siehe Commit-Historie). Migration lokal gegen ein frisches Postgres 16 verifiziert
(`prisma migrate deploy` + `prisma migrate diff` ohne Drift + Smoke-Test über den generierten
Client). Offen: Frontend-Anbindung, Seed-Daten, Nachweis-Integration (`EvidenceModule` um
`RISK_MANAGEMENT`/`IT_RISK` erweitern) und die drei Fragen im letzten Abschnitt.

Zwei neue Fachmodule als nächster Ausbauschritt von RegStack, im selben Baustil wie die drei
bestehenden Module (Auslagerungsmanagement AT 9, Compliance AT 4.4.2, Interne Revision AT 4.4.3):
ein Ordner je Modul unter `src/modules/`, Prisma-Modelle mit `institutionId`-Scoping, RBAC-Eintrag
je Resource in `src/middleware/rbac.ts`, jeder Write über `withAudit(...)`.

**Annahme, bitte gegenprüfen:** "MaRisk Novelle 9" wird hier als die aktuell gültigen
Risikomanagement-Kapitel der MaRisk gelesen — AT 2.2 (Risikokultur), AT 3 (Gesamtverantwortung
GL), AT 4.1 (Risikotragfähigkeit), AT 4.2 (Strategien), AT 4.3.1–4.3.3 (IKS, RM-Prozesse,
Stresstests), AT 4.4.1 (Risikocontrolling-Funktion) sowie die BTR-Risikoartenkapitel, inkl. der
zuletzt ergänzten ESG-Risiko-Anforderungen. Die genaue Novellen-Nummerierung/-Fassung sollte vor
dem Schema-Rollout einmal mit dem Vorschrifttext abgeglichen werden — analog zur Sorgfalt, mit der
`AT9_Vollstaendigkeitspruefung_und_Backend_Verifikation.md` für das Auslagerungsmodul geführt
wurde. Gleiches gilt für die BAIT-Kapitelbezeichnungen unten (Rundschreiben 10/2017 (BA) i. d. F.
der letzten Novellierung) — Tz.-Verweise sind hier bewusst ausgespart, bis der Text final
verifiziert ist.

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
| IT-Strategie | Verabschiedung/Review, Konsistenz-Check zur Geschäftsstrategie | Kap. 1 IT-Strategie |
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
