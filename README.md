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
```

## Nächste Schritte (Phase 2–3 aus der Backend-Spezifikation)

- DORA-Registermodul (Art. 28–30) — bewusst außerhalb dieses MVP, siehe
  `AT9_Vollstaendigkeitspruefung_und_Backend_Verifikation.md`, Abschnitt 2.
- Deployment-Pipeline (CD) nach der Hosting-Entscheidung (AWS EU vs. Hetzner) — CI deckt bisher
  nur Lint/Test/Build ab, keinen Deploy-Schritt.
- Rate-Limiting/Login-Throttling vor Produktivbetrieb (aktuell nicht Teil von `auth.routes.ts`).
