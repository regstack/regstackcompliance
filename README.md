# RegStack

Reales Backend + Frontend für das Auslagerungsmanagement gem. MaRisk AT 9 (BA 54, 30.06.2026) —
der Produktivbau hinter dem Cockpit-Prototyp (`regstack_cockpit.html`). Das Repo enthält zwei
getrennt deploybare Apps:

- **Backend** (Repo-Root, `src/`) — Node.js/Express + TypeScript, PostgreSQL via Prisma,
  serverseitige RBAC und ein unveränderlicher Audit-Trail auf jedem Write. Läuft lokal als
  persistenter Server (`src/server.ts`) und wird auf Vercel als Serverless Function deployt
  (`api/index.ts`).
- **Frontend** (`frontend/`) — Next.js 16 / React 19 / Tailwind 4 App Router, Auth über Supabase
  (`@supabase/ssr`), tauscht die Supabase-Session gegen eine Backend-Session (siehe
  "Auth-Bridge" unten).

## Stack

- **Backend-Runtime:** Node.js 20+, Express, TypeScript (strict)
- **DB:** PostgreSQL 16, Prisma ORM (Schema in `prisma/schema.prisma`)
- **Backend-Auth:** JWT (`jsonwebtoken`), Passwort-Hashing via `bcryptjs`, Fixed-Window
  Rate-Limiting auf Login (`src/middleware/rateLimit.ts`)
- **Validierung:** `zod` an jeder Route
- **Frontend:** Next.js 16, React 19, Tailwind 4, Supabase (`@supabase/supabase-js`, `@supabase/ssr`)
- **Hosting:** Backend als Vercel Serverless Function (`vercel.json` rewrite → `api/index.ts`),
  Frontend als eigenes Vercel-Projekt. `regstack.de`/`www.regstack.de` zeigt die öffentliche
  Marketing-Seite, `app.regstack.de` das Login/App-Gate (Hostname-Split in `frontend/proxy.ts`).
  **Offen:** Der Businessplan sieht EU-Hosting (AWS EU-Region oder Hetzner) vor — die aktuelle
  Vercel-Deployment ist ein Interimsstand, keine EU-Data-Residency-Garantie; siehe
  `RegStack_Businessplan.md`.

## Warum dieses Repo so aussieht, wie es aussieht

Jede der drei "non-negotiables" aus der Backend-Spezifikation ist eine Zeile Code, kein
Kommentar:

1. **Audit-Trail auf jedem Write** — `src/middleware/auditTrail.ts` (`withAudit(...)`) schreibt
   den fachlichen Write und die `AuditLogEvent`-Zeile in **derselben DB-Transaktion**. Es gibt
   keinen Codepfad, der eine Änderung ohne passenden Audit-Eintrag persistiert.
2. **Serverseitige RBAC** — `src/middleware/rbac.ts` prüft Rolle × Ressource × Aktion bei jedem
   Request neu, unabhängig davon, was das Frontend anzeigt oder ausblendet.
3. **EU-Hosting/Verschlüsselung** — Infrastrukturentscheidung, noch nicht final umgesetzt (siehe
   "Offen" oben); `.env.example` und `docker-compose.yml` sind ausdrücklich nur für lokale
   Entwicklung markiert.

Die Klassifizierungslogik (`src/modules/outsourcingActivities/classify.ts`) ist ein direkter Port
der Funktion `classify()` aus `regstack_cockpit.html` — CSC-Modell (Materialität UND Umfassende
Auswirkung, zwei unabhängige Schwellen) und Tesla-FS-Modell (Materialität × Anbieter-Risiko,
ODER/UND) bleiben absichtlich in beiden Artefakten identisch, damit Prototyp und Backend nie
auseinanderlaufen.

## Auth-Bridge (Supabase ↔ Backend)

Das Frontend nutzt Supabase Auth für Sign-up/Sign-in. Damit RBAC und Audit-Trail trotzdem
serverseitig im Express-Backend greifen (nicht im Next.js-Prozess), tauscht `loginToBackend`
die bereits verifizierte Supabase-Session gegen eine Backend-Session: ein kurzlebiges, mit dem
gemeinsamen `JWT_SECRET` signiertes Token geht an `POST /api/auth/exchange`
(`src/modules/users/auth.routes.ts`), das Backend stellt dagegen ein reguläres Session-JWT aus.
Es gibt keinen zweiten Passwortspeicher, der aus dem Tritt geraten kann — Supabase bleibt die
einzige Quelle für Zugangsdaten.

## Lokal starten

### Backend

```bash
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

### Frontend

```bash
cd frontend
npm install
npm run dev                          # http://localhost:3000
```

Es gibt kein `frontend/.env.example` — folgende Variablen in `.env.local` selbst anlegen:
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (aus dem Supabase-Projekt),
`JWT_SECRET` (identisch zum Backend, sonst schlägt `/auth/exchange` fehl), `BACKEND_URL`
(z. B. `http://localhost:4000` lokal).

Lokal (und auf Vercel-Preview-URLs) werden Marketing-Seite und App vom selben Host bedient — der
Hostname-Split (`regstack.de` vs. `app.regstack.de`) greift nur auf den Produktiv-Domains.

## Struktur

```
prisma/schema.prisma            10 Entitäten: InstitutionProfile, User, OutsourcingActivity,
                                 RiskAnalysis, Contract, HandlungsoptionRecord, RegistryEntry,
                                 MonitoringRecord, Report, AuditLogEvent
prisma/migrations/…_init/       Hand-verifizierte Initial-Migration
src/middleware/auth.ts          JWT-Auth (requireAuth)
src/middleware/rbac.ts          Rollen-/Rechte-Matrix (requirePermission)
src/middleware/auditTrail.ts    withAudit() — transaktionaler Audit-Trail
src/middleware/rateLimit.ts     Fixed-Window Rate-Limiting (u.a. Login)
src/modules/…                   Ein Ordner je Entität/Prozess (Route + Validierung)
prisma/seed.ts                  Musterdaten, deckungsgleich mit regstack_cockpit.html
api/index.ts                    Vercel-Entrypoint — exportiert createApp() als Function-Handler
vercel.json                     Rewrite aller Pfade auf die Backend-Function
tests/                          Vitest — classify.ts (CSC/Tesla) und rbac.ts, ohne DB-Abhängigkeit
.github/workflows/ci.yml        Lint, Typecheck, Test, Migration gegen Postgres-Service, Build
frontend/app/                   Next.js App Router — Marketing-Homepage, Login, authentifizierte App
frontend/proxy.ts               Hostname-Split (regstack.de vs. app.regstack.de) + Supabase-Session
frontend/lib/supabase/          Supabase-Client (Browser + Server)
frontend/lib/regstack/          Backend-Auth-Bridge (Supabase-Session → Backend-JWT), API-Client
```

## Nächste Schritte (Phase 2–3 aus der Backend-Spezifikation)

- EU-Data-Residency-Entscheidung: aktuelle Vercel-Deployment ist ein Interimsstand, der
  Businessplan verlangt AWS EU oder Hetzner — siehe "Offen" im Stack-Abschnitt oben.
- Objektspeicher-Anbindung für `Contract.fileObjectKey` (S3-kompatibel — AWS S3 EU oder Hetzner
  Object Storage) inkl. Pre-Signed-Upload-Endpoint; aktuell nimmt die API nur die Metadaten
  entgegen (siehe `contracts.routes.ts`).
- DORA-Registermodul (Art. 28–30) — bewusst außerhalb dieses MVP, siehe
  `AT9_Vollstaendigkeitspruefung_und_Backend_Verifikation.md`, Abschnitt 2.
- Monitoring/Alerting auf der Produktiv-Deployment (Fehlerraten, fehlgeschlagene Deployments) —
  aktuell nicht eingerichtet.
