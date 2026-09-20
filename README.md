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
  aufsichtsrechtlichen Meldung fachlich/rechtlich gegen die aktuellen ITS-Templates prüfen. Ein
  Strukturvergleich (20.09.2026, nur Sekundärquellen — BaFin/EUR-Lex waren aus der Sandbox nicht
  erreichbar, siehe `Risikomanagement_BAIT_MVP_Spezifikation.md` Abschnitt „Primärquellen-Abgleich
  BAIT/DORA (20.09.2026)") deckte drei strukturelle Lücken gegen das Sechs-Ebenen-Modell der 15
  Meldevorlagen auf (Meldepflichtige Einheit, Anbieter, Vertragsverhältnis, IKT-Dienstleistung,
  Funktion/Asset, Weiterverlagerungskette) — **inzwischen additiv geschlossen**: `IctArrangement`
  hat jetzt `annualCostEur`/`exitStrategyNote` je Vertrag, `IctService` bildet mehrere
  IKT-Dienstleistungen/SLA je Vertrag ab, und `IctSubcontracting` bildet die
  Weiterverlagerungskette strukturiert ab (dieselbe Baumstruktur wie `Weiterverlagerung` bei AT 9).
  `hasSubcontracting`/`subcontractingNote` bleiben als schnelle Freitext-Filterung erhalten. Was
  weiterhin fehlt: eine echte Feld-für-Feld-Prüfung gegen die XBRL-CSV-Taxonomie der Annexe I–IV
  selbst (nur über die sechs Ebenen strukturell abgeglichen, nicht über jedes einzelne Datenfeld).
- Risikomanagement (MaRisk AT 4) und IT-Risikomanagement/BAIT: eine erste Fassung ist da
  (`src/modules/risikomanagement/`, `src/modules/itRisiko/`, UI unter `/risikomanagement` und
  `/it-risiko`) — Risikoinventur, Geschäfts-/Risikostrategien, Risikotragfähigkeit und Berichte
  auf der einen Seite, IT-Strategie, Schutzbedarfsfeststellung, IT-Risikoregister und
  Sicherheitsvorfälle auf der anderen. Offene Fragen (u. a. kein eigener ISB-Login im MVP) siehe
  `Risikomanagement_BAIT_MVP_Spezifikation.md`.
- Backup/Disaster-Recovery: tägliche Zweitsicherung + automatischer Struktur-Restore-Check sind
  umgesetzt (siehe oben); Supabase-eigenes PITR-Tier aktivieren, wöchentliche/monatliche
  Retention-Staffelung und der erste vollständige anwendungsseitige Restore-Test stehen noch aus
  (`docs/backup-disaster-recovery.md`, Abschnitt 7).
- Objektspeicher-Anbieter für hochgeladene Vertragsdokumente ist noch nicht gewählt — die
  S3-kompatible Anbindung (Pre-Signed Upload/Download, `src/modules/contracts/objectStorage.ts`)
  funktioniert mit jedem Anbieter (AWS S3, Hetzner Object Storage, MinIO, …), sobald `S3_BUCKET`
  und Zugangsdaten gesetzt sind (siehe `.env.example`).
- Deployment-Pipeline (CD) nach der Hosting-Entscheidung (AWS EU vs. Hetzner) — CI deckt bisher
  nur Lint/Test/Build ab, keinen Deploy-Schritt.
