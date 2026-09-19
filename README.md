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
.github/workflows/ci.yml        Lint, Typecheck, Test, Migration gegen Postgres-Service, Build,
                                 Deploy-Trigger (Render) nach grüner CI auf main
render.yaml                     Render-Blueprint für den Backend-Dienst (siehe Abschnitt Deployment)
```

## Deployment

Die Datenbank ist Supabase-Postgres (Region eu-central-1/Frankfurt) — `DATABASE_URL` zeigt direkt
darauf, es gibt keine separate RDS-/Hetzner-Datenbank. Der Node/Express-Prozess selbst läuft
separat auf [Render](https://render.com) (`render.yaml` im Repo-Root ist die Blueprint-Definition
dafür), da Supabase keine langlaufenden Node-Prozesse hostet.

Einrichtung (einmalig):

1. In Render: „New → Blueprint" und dieses Repo verbinden — übernimmt `render.yaml`.
2. Die mit `sync: false` markierten Umgebungsvariablen (siehe `render.yaml`, u. a.
   `DATABASE_URL`, `JWT_SECRET`, `S3_*`) im Render-Dashboard eintragen — deren echte Werte stehen
   nie in diesem Repo.
3. Auto-Deploy in Render deaktivieren (Settings → Build & Deploy) und stattdessen den
   Deploy-Hook-Link (Settings → Deploy Hook) als GitHub-Actions-Secret
   `RENDER_DEPLOY_HOOK_URL` in diesem Repo hinterlegen.

Danach löst jeder Push auf `main`, der die CI-Jobs (Lint/Typecheck/Test/Build) übersteht, automatisch
ein Deployment auf Render aus (`deploy`-Job in `.github/workflows/ci.yml`) — ein roter CI-Lauf
deployt nie.

Das Frontend (Next.js, `frontend/`) läuft auf Vercel; Vercels eigene Git-Integration deployt es
bereits automatisch bei jedem Push, dafür ist kein zusätzlicher CI-Schritt nötig.

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
- Backup/Disaster-Recovery: tägliche Zweitsicherung + automatischer Struktur-Restore-Check sind
  umgesetzt (siehe oben); Supabase-eigenes PITR-Tier aktivieren, wöchentliche/monatliche
  Retention-Staffelung und der erste vollständige anwendungsseitige Restore-Test stehen noch aus
  (`docs/backup-disaster-recovery.md`, Abschnitt 7).
- Objektspeicher-Anbieter für hochgeladene Vertragsdokumente ist noch nicht gewählt — die
  S3-kompatible Anbindung (Pre-Signed Upload/Download, `src/modules/contracts/objectStorage.ts`)
  funktioniert mit jedem Anbieter (AWS S3, Hetzner Object Storage, MinIO, …), sobald `S3_BUCKET`
  und Zugangsdaten gesetzt sind (siehe `.env.example`).
