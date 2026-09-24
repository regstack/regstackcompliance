# RegStack Backend

Reales Backend für das Auslagerungsmanagement gem. MaRisk AT 9 (BA 54, 30.06.2026) — der
Produktivbau hinter dem Cockpit-Prototyp (`regstack_cockpit.html`). Node.js/Express + TypeScript,
PostgreSQL via Prisma, serverseitige RBAC und ein unveränderlicher Audit-Trail auf jedem Write.

## Stack

- **Runtime:** Node.js 20+, Express, TypeScript (strict)
- **DB:** PostgreSQL 16, Prisma ORM (Schema in `prisma/schema.prisma`)
- **Auth:** JWT (`jsonwebtoken`), Passwort-Hashing via `bcryptjs`
- **Validierung:** `zod` an jeder Route
- **Hosting (Ziel, nicht Teil dieses Repos):** AWS EU-Region oder Hetzner, siehe
  `RegStack_Businessplan.md` im Projekt

## Warum dieses Repo so aussieht, wie es aussieht

Jede der drei "non-negotiables" aus der Backend-Spezifikation ist eine Zeile Code, kein
Kommentar:

1. **Audit-Trail auf jedem Write** — `src/middleware/auditTrail.ts` (`withAudit(...)`) schreibt
   den fachlichen Write und die `AuditLogEvent`-Zeile in **derselben DB-Transaktion**. Es gibt
   keinen Codepfad, der eine Änderung ohne passenden Audit-Eintrag persistiert.
2. **Serverseitige RBAC** — `src/middleware/rbac.ts` prüft Rolle × Ressource × Aktion bei jedem
   Request neu, unabhängig davon, was das Frontend anzeigt oder ausblendet.
3. **EU-Hosting/Verschlüsselung** — Infrastrukturentscheidung, nicht Teil des Codes; `.env.example`
   und `docker-compose.yml` sind ausdrücklich nur für lokale Entwicklung markiert.

Die Klassifizierungslogik (`src/modules/outsourcingActivities/classify.ts`) ist ein direkter Port
der Funktion `classify()` aus `regstack_cockpit.html` — CSC-Modell (Materialität UND Umfassende
Auswirkung, zwei unabhängige Schwellen) und Tesla-FS-Modell (Materialität × Anbieter-Risiko,
ODER/UND) bleiben absichtlich in beiden Artefakten identisch, damit Prototyp und Backend nie
auseinanderlaufen.

## Lokal starten

Dieses Repo wurde in einer Sandbox ohne Root-Rechte, ohne Docker und ohne Netzwerkzugriff auf die
npm-Registry angelegt — der komplette Code, das Prisma-Schema und die initiale Migration sind
fertig geschrieben und verifiziert, aber **`npm install` und `prisma migrate dev` wurden hier noch
nie ausgeführt**. Das musst du (oder eine Claude-Code-CLI-Session mit vollem Zugriff) einmal lokal
nachholen:

```bash
cd RegStack
cp .env.example .env                 # Secrets lokal anpassen
docker compose up -d                 # startet Postgres 16 auf localhost:5432
npm install
npx prisma migrate deploy            # spielt prisma/migrations/20260101000000_init ein
npm run seed                         # Musterdaten: Beispiel Leasing AG + 3 Auslagerungen
npm run dev                          # http://localhost:4000
```

Health-Check: `curl http://localhost:4000/health`. Login mit den Seed-Usern (Passwort
`regstack-dev-2026`): `geschaeftsleitung@beispiel-leasing.de`, `compliance@beispiel-leasing.de`,
`admin@regstack.de`.

`prisma/seed.ts` ist nicht idempotent (mischt `.upsert()` mit einfachem `.create()`) — ein
zweiter `npm run seed`-Lauf gegen eine bereits befüllte DB schlägt an der ersten
Unique-Constraint-Verletzung fehl. Zum Zurücksetzen `npm run db:reset` (= `prisma migrate reset`,
setzt die DB komplett zurück, spielt alle Migrationen erneut ein und seedet automatisch neu, dank
des `prisma.seed`-Eintrags in `package.json`) statt `npm run seed` erneut auszuführen.

## Struktur

```
prisma/schema.prisma            10 Entitäten: InstitutionProfile, User, OutsourcingActivity,
                                 RiskAnalysis, Contract, HandlungsoptionRecord, RegistryEntry,
                                 MonitoringRecord, Report, AuditLogEvent
prisma/migrations/…_init/       Hand-verifizierte Initial-Migration (siehe Kommentar oben in der
                                 Datei — `prisma migrate diff` gegen eine echte DB bestätigt sie)
src/middleware/auth.ts          JWT-Auth (requireAuth)
src/middleware/rbac.ts          Rollen-/Rechte-Matrix (requirePermission)
src/middleware/auditTrail.ts    withAudit() — transaktionaler Audit-Trail
src/modules/…                   Ein Ordner je Entität/Prozess (Route + Validierung)
prisma/seed.ts                  Musterdaten, deckungsgleich mit regstack_cockpit.html
tests/                          Vitest — classify.ts (CSC/Tesla) und rbac.ts, ohne DB-Abhängigkeit
.github/workflows/ci.yml        Lint, Typecheck, Test, Migration gegen Postgres-Service, Build
api/index.ts                    Vercel-Serverless-Einstieg — exportiert dieselbe createApp() wie
                                 src/server.ts, ohne app.listen() (siehe Abschnitt Deployment)
vercel.json                     Leitet alle Pfade an die api/index.ts-Function weiter
```

## Deployment

Die Datenbank ist Supabase-Postgres (Region eu-central-1/Frankfurt) — `DATABASE_URL` zeigt direkt
darauf, es gibt keine separate RDS-/Hetzner-Datenbank. Der Node/Express-Prozess selbst läuft als
**Vercel-Serverless-Function**: `api/index.ts` exportiert dieselbe `createApp()` wie
`src/server.ts` (nur ohne `app.listen()` — Vercels Node-Runtime nimmt eine exportierte
Express-App direkt als Request-Handler), `vercel.json` leitet alle Pfade dorthin um.

Sowohl das Frontend (Next.js, `frontend/`) als auch dieses Backend sind bei Vercel als eigene
Projekte verbunden; Vercels Git-Integration deployt beide automatisch bei jedem Push auf `master`
(und erzeugt Preview-Deployments für jeden Branch/PR) — dafür ist kein zusätzlicher CI-Schritt
nötig, `ci.yml` deckt nur Lint/Typecheck/Test/Build ab. Umgebungsvariablen (`DATABASE_URL`,
`JWT_SECRET`, `S3_*`, …) werden im jeweiligen Vercel-Projekt hinterlegt, nie in diesem Repo.

### Datenbank-Backup

`.github/workflows/backup.yml` sichert die Produktiv-DB täglich unabhängig von Supabases eigenen
Backups (`npm run backup:run`, siehe `docs/backup-disaster-recovery.md`) und restauriert den Dump
im selben Lauf in eine Wegwerf-Postgres-Instanz zur Kontrolle. Benötigt eigene GitHub-Secrets
(`PRODUCTION_DATABASE_URL_DIRECT` — Supabases **direkte**, nicht gepoolte Verbindung — plus die
`S3_*`-Zugangsdaten); ohne sie läuft der Workflow ins Leere, siehe Abschnitt 7 der Doku.

## Nächste Schritte (Phase 2–3 aus der Backend-Spezifikation)

- DORA-Registermodul (Art. 28–30): eine erste Fassung ist da (`src/modules/ictRegister/`,
  UI unter Outsourcing → „DORA-Register", `prisma/schema.prisma` — `IctProvider`/
  `IctArrangement`) — deckt die Kerninhalte ab (Anbieterregister, Vertragsverhältnisse,
  Kritikalitäts-Flag nach Art. 28 Abs. 3, CSV-Export), ist aber **keine geprüfte 1:1-Abbildung**
  der offiziellen EBA/ESA-Meldevorlagen (Durchführungsverordnung (EU) 2024/2956). Vor einer
  aufsichtsrechtlichen Meldung fachlich/rechtlich gegen die aktuellen ITS-Templates prüfen.
- Risikomanagement (MaRisk AT 4) und IT-Risikomanagement/BAIT: eine erste Fassung ist da
  (`src/modules/risikomanagement/`, `src/modules/itRisiko/`, UI unter `/risikomanagement` und
  `/it-risiko`) — Risikoinventur, Geschäfts-/Risikostrategien, Risikotragfähigkeit und Berichte
  auf der einen Seite, IT-Strategie, Schutzbedarfsfeststellung, IT-Risikoregister und
  Sicherheitsvorfälle auf der anderen. Seit 2026-09-23 ergänzt: Kapitalplanung (AT 4.1 Tz. 10) und
  Stresstests (AT 4.3.3), Routen unter `/risikomanagement/kapitalplanung`/`/risikomanagement/stresstests`
  inkl. UI-Panels auf `/risikomanagement`. Ein Modellregister (AT 4.3.4 / AT 4.1 Tz. 9 Validierung)
  ist bewusst **nicht** Teil davon — zwei andere offene PRs (#10, #13) bauen das bereits parallel;
  siehe `Risikomanagement_BAIT_MVP_Spezifikation.md` für Details. Auf der BAIT-Seite ebenfalls seit
  2026-09-23 ergänzt (gegen den jetzt vorliegenden Primärtext, Rundschreiben 10/2017 (BA)):
  Betriebsstörungen (Kap. 8) und IT-Notfallmanagement (Kap. 10), Routen unter
  `/it-risiko/betriebsstoerungen`/`/it-risiko/notfallmanagement`. Ebenfalls ergänzt:
  Berechtigungsmanagement (Kap. 6), IT-Projekte (Kap. 7) und Änderungsmanagement (Kap. 8), Routen
  unter `/it-risiko/berechtigungen`/`/it-risiko/projekte`/`/it-risiko/aenderungen` — ursprünglich
  zurückgestellt, weil PR #13 dieselben Bausteine parallel baute, dann aber wieder aufgenommen,
  nachdem PR #13 seine eigene Fassung ebenfalls zurückgezogen hatte und dadurch keine
  Implementierung mehr auf `master` existierte; siehe `Risikomanagement_BAIT_MVP_Spezifikation.md`,
  Abschnitt "Koordination mit parallelen Sessions". Offene Fragen (u. a. kein eigener ISB-Login im
  MVP) siehe ebenda.
- Backup/Disaster-Recovery: tägliche Zweitsicherung + automatischer Struktur-Restore-Check sind
  umgesetzt (siehe oben); Supabase-eigenes PITR-Tier aktivieren, wöchentliche/monatliche
  Retention-Staffelung und der erste vollständige anwendungsseitige Restore-Test stehen noch aus
  (`docs/backup-disaster-recovery.md`, Abschnitt 7).
- Objektspeicher ist entschieden und produktiv konfiguriert: Supabase Storage (S3-kompatibel,
  eu-central-1) über dieselbe Pre-Signed-Upload/Download-Anbindung
  (`src/modules/contracts/objectStorage.ts`) — Bucket `contracts` für Vertragsdokumente, Bucket
  `ics-files` für IKS-Nachweise/Richtliniendokumente. Beide sind private Buckets ohne eigene
  Storage-RLS-Policies; der Zugriff läuft ausschließlich über den Backend-Service-Role-Key,
  dieselbe serverseitige RBAC wie überall sonst im Repo.
- Deployment-Pipeline: erledigt über Vercels Git-Integration (siehe Abschnitt „Deployment" oben) —
  kein separater CD-Schritt nötig, `ci.yml` deckt Lint/Typecheck/Test/Build ab. Datenbankmigrationen
  laufen **nicht** automatisch im Vercel-Build (nur `prisma generate` via `postinstall`); nach jeder
  schema-ändernden Migration `prisma migrate deploy` einmal manuell gegen die Produktions-DB fahren.
