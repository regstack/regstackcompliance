# Backup- und Disaster-Recovery-Plan — Produktiv-Datenbank

Dieses Dokument ist Infrastruktur-/Betriebsdokumentation, kein Code. Es beschreibt, wie die
produktive PostgreSQL-Datenbank von RegStack gesichert und im Ernstfall wiederhergestellt wird.
RegStack ist selbst ein MaRisk-AT9-Werkzeug für seine Kunden — der gleiche Sorgfaltsmaßstab, den
das Produkt von ausgelagerten Dienstleistern verlangt (Tz. 9: Notfallkonzept, Ersetzbarkeit,
Nachweispflicht), gilt für den eigenen Betrieb.

**Status:** Die Datenbank läuft auf Supabase-Postgres (Region eu-central-1/Frankfurt), das
Backend als Vercel-Serverless-Function (siehe README, Abschnitt „Deployment"). Ein Teil dieses
Plans ist inzwischen umgesetzt — siehe Abschnitt 2/3 — der Rest ist mit **[Noch einzurichten]**
markiert.

## 1. Ziele: RPO/RTO

| Kennzahl | Ziel | Begründung |
|---|---|---|
| **RPO** (Recovery Point Objective) | ≤ 15 Minuten via Supabase-PITR (sobald aktiviert, Abschnitt 2); ≤ 24 Stunden allein über die eigene tägliche Zweitsicherung | Ein Datenverlust von einem Tag wäre bei einem Audit-Trail-System (jeder Write ist eine Nachweispflicht) nicht hinnehmbar — deshalb ist Supabase-PITR die primäre Verteidigungslinie, nicht der tägliche Dump. |
| **RTO** (Recovery Time Objective) | ≤ 4 Stunden für einen vollständigen Restore aus Backup | Ein Ausfall des Kernsystems blockiert Kunden bei Fristen (Vertrags-, Handlungsoptions-, Monitoring-Deadlines, siehe `src/modules/notifications`) — das System muss zügig wieder verfügbar sein, ohne die zugrunde liegenden Fristen selbst zu verändern. Kein Multi-AZ-Failover-Ziel, da das Setup aktuell keine synchron replizierte Standby-Instanz vorsieht. |

Diese Ziele sind Zielwerte für die Betriebsplanung, keine vertraglich zugesicherten SLAs
gegenüber Kunden — Letzteres ist eine Geschäftsentscheidung außerhalb dieses Dokuments.

## 2. Backup-Strategie

Zwei unabhängige Ebenen, bewusst nicht nur eine — eine reine Supabase-Backup-Strategie hat einen
Single Point of Failure: das eigene Supabase-Konto/-Projekt selbst (Fehlkonfiguration,
versehentliches Löschen, Abrechnungsproblem, Anbieterausfall).

1. **Supabase-eigene Backups/PITR** — je nach Supabase-Plan automatisierte tägliche Backups bzw.
   Point-in-Time-Recovery. **[Noch einzurichten]**: im Supabase-Dashboard prüfen, welche Stufe der
   aktuelle Plan bietet, und PITR aktivieren, sobald das Projekt produktiv genutzt wird — das ist
   die primäre, von Supabase verwaltete Verteidigungslinie mit dem besten RPO (kontinuierlich statt
   täglich).
2. **Eigene, unabhängige Sicherung** (umgesetzt) — `.github/workflows/backup.yml` + `npm run
   backup:run` (`src/modules/backup/backupDatabase.ts`):
   - Täglicher `pg_dump` gegen die Produktivdatenbank, **nur das `public`-Schema** (das, was
     Prisma verwaltet) — bewusst ohne Supabases eigene interne Schemas (`auth`, `storage`,
     `realtime` samt deren Extensions/Rollen): erstens ist das Supabases eigene
     Sicherungsverantwortung, zweitens würde ein Dump davon bei einem Restore-Test in eine normale
     Postgres-Instanz mit hoher Wahrscheinlichkeit fehlschlagen, weil dort Supabase-spezifische
     Extensions/Rollen fehlen.
   - `--clean --if-exists --no-owner --no-acl`: macht den Dump idempotent (keine Fehler beim
     Restore in eine leere Datenbank) und portabel (keine Abhängigkeit von den exakten Rollen der
     Quelldatenbank).
   - Komprimiert (gzip) und in S3-kompatiblen Objektspeicher hochgeladen (dieselbe Anbindung wie
     `src/modules/contracts/objectStorage.ts`, standardmäßig derselbe Bucket unter dem Präfix
     `db-backups/`, optional per `S3_BACKUP_BUCKET` ein eigener, stärker abgeschotteter Bucket).
   - **Aufbewahrung:** echte Großvater-Vater-Sohn-Staffelung (`selectStaleKeysTiered` in
     `src/modules/backup/backupDatabase.ts`) — innerhalb des Tages-Fensters bleibt jede Sicherung
     erhalten, danach wird pro ISO-Kalenderwoche nur die älteste zur wöchentlichen Sicherung
     hochgestuft, danach pro Kalendermonat nur die älteste zur monatlichen; alles außerhalb aller
     drei Fenster wird gelöscht. Konfigurierbar über `BACKUP_RETENTION_DAILY_DAYS`/
     `BACKUP_RETENTION_WEEKLY_WEEKS`/`BACKUP_RETENTION_MONTHLY_MONTHS`. Ein S3-Schlüssel, dessen
     Zeitstempel sich nicht aus dem Dateinamen parsen lässt, wird nie als "veraltet" eingestuft —
     im Zweifel eher zu viel behalten als versehentlich etwas Fremdes löschen.
   - **Zielwerte (Default-Konfiguration):**
     - 7 tägliche Backups ✅
     - 4 wöchentliche Backups ✅
     - 12 monatliche Backups ✅
   - Diese Aufbewahrung betrifft ausschließlich die *technischen Backups* zur Wiederherstellung im
     Störungsfall. Sie ersetzt nicht die fachliche Aufbewahrungspflicht für Audit-Trail- und
     Nachweisdaten selbst (MaRisk-, handels- und steuerrechtliche Fristen, siehe
     `frontend/app/datenschutz/page.tsx`, Abschnitt 8) — diese wird über die Anwendungsdaten
     innerhalb der laufenden Datenbank sichergestellt, nicht über Backup-Retention.

**Verschlüsselung/Zugriff:** Backups liegen im S3-kompatiblen Objektspeicher verschlüsselt at-rest
(Provider-Standard); Zugriff ist auf die S3-Zugangsdaten in den GitHub-Actions-Secrets beschränkt
(dieselbe Personengruppe, die auch die Produktions-DB-Zugangsdaten verwaltet).

## 3. Wiederherstellungstest (Restore Drill)

Ein ungetestetes Backup ist kein Backup — deshalb ist ein Teil davon jetzt automatisiert, nicht nur
ein vierteljährlicher manueller Termin.

**Automatisiert, bei jedem Backup-Lauf** (`verify-restore`-Job in `.github/workflows/backup.yml`):
restauriert den soeben erstellten Dump in eine frische, isolierte Postgres-Instanz (ein
Wegwerf-Container, existiert nur für diesen CI-Lauf) und prüft mit `npx prisma migrate status`,
dass die wiederhergestellte Datenbank vollständig migriert und strukturell korrekt ist. Das deckt
„die Sicherung ist beschädigt/unvollständig" tagesaktuell ab, nicht erst beim nächsten
vierteljährlichen Termin — genau das Szenario, das ein Backup ohne Restore-Test nicht abfängt.

**Weiterhin manuell, mindestens vierteljährlich** (der automatisierte Check prüft Struktur, nicht
Anwendungsverhalten):

1. Einen aktuellen Dump aus dem Objektspeicher (`db-backups/`) in eine isolierte Testinstanz
   einspielen (nie in eine Umgebung mit Produktivzugriff).
2. Stichproben-Validierung: Zeilenanzahl je Kerntabelle (`users`, `outsourcing_activities`,
   `audit_log_events`, …) gegen einen zeitnahen Referenzwert aus der Produktivdatenbank
   vergleichen; ein Login mit einem Test-User und ein lesender API-Aufruf (`/health`,
   `/api/activities`) müssen gegen ein aus dem Backup gestartetes Backend erfolgreich sein.
3. Tatsächliche Restore-Dauer messen und gegen das RTO-Ziel (Abschnitt 1) protokollieren.
4. Ergebnis (Datum, Dauer, Prüfergebnis, durchführende Person) dokumentieren — analog zum
   Nachweis-Log, das die Anwendung selbst für Kunden-Monitoring verlangt (`MonitoringRecord`,
   Tz. 9): Wer ausgelagerte Notfallprozesse von Kunden verlangt, muss den eigenen nachweisen
   können.
5. Testinstanz nach Abschluss vollständig löschen.

**Erster anwendungsseitiger Restore-Test — durchgeführt 2026-09-19 (Claude Sonnet 5, gegen eine
lokale Postgres-16-Instanz mit Seed-Daten als Stellvertreter für die Produktivdatenbank, da diese
Sandbox keinen Zugriff auf die echte Supabase-Produktivdatenbank hat):**

- `pg_dump` mit denselben Flags wie `src/modules/backup/backupDatabase.ts` (`--clean --if-exists
  --no-owner --no-acl`) gegen die Seed-Datenbank.
- Restore in eine frische, isolierte zweite lokale Datenbank; `npx prisma migrate status` bestätigt
  strukturell vollständig und aktuell.
- Stichprobe Zeilenanzahl (`users`, `outsourcing_activities`, `audit_log_events`, `ict_providers`,
  `ict_arrangements`, `externe_pruefungen`) — alle exakt identisch zwischen Quelle und
  wiederhergestellter Instanz.
- Backend gegen die wiederhergestellte Instanz gestartet; Login mit einem echten Seed-User
  (`compliance@beispiel-leasing.de`) erfolgreich; authentifizierter Read (`GET /api/activities`)
  liefert korrekte Daten zurück.
- Testinstanz und alle temporären Dateien danach vollständig entfernt.
- **Einschränkung:** Seed-Datensatzgröße, nicht produktionsgroß — die gemessene Dauer (Sekunden)
  ist daher keine belastbare Aussage zum RTO-Ziel (Abschnitt 1) gegen die echte Produktivdatenbank.
  Bestätigt aber den kompletten Mechanismus (Dump-Format, Restore-Prozess, Schema-Kompatibilität,
  Anwendungsverhalten gegen die wiederhergestellte DB) als funktionsfähig — genau die Lücke, die
  der tägliche automatisierte `verify-restore`-Job (nur Struktur) nicht abdeckt. Ein Durchlauf
  gegen einen echten Produktions-Dump mit Dauermessung steht weiterhin aus.

## 4. Rollen und Verantwortlichkeiten

- **Owner:** aktuell die Inhaberperson selbst (solo — kein dediziertes Ops-Team). Verantwortlich
  für Einrichtung (GitHub-Secrets, Supabase-PITR), Überwachung (Abschnitt 5) und Durchführung des
  vierteljährlichen Restore-Drills.
- **Zugriff auf Backups:** beschränkt auf die GitHub-Actions-Secrets
  (`PRODUCTION_DATABASE_URL_DIRECT`, `S3_*`) dieses Repos und den S3-Bucket selbst — nicht an die
  `ADMIN`-Rolle *in der Anwendung* geknüpft (Anwendungsrollen und Infrastrukturzugriff sind
  getrennte Berechtigungsebenen).
- **Runbook:** die konkreten Befehle sind der Code selbst (`src/modules/backup/backupDatabase.ts`,
  `.github/workflows/backup.yml`) — kein separates Runbook-Dokument nötig, solange Backup und
  Restore-Test automatisiert bleiben. Ein manueller Notfall-Restore (Abschnitt 3, Schritt 1) läuft
  über denselben Dump aus `db-backups/`, per `psql <verbindung> -f dump.sql` nach dem Download.

## 5. Monitoring und Eskalation

- Ein fehlgeschlagener `backup`- oder `verify-restore`-Job erscheint im GitHub-Actions-Tab dieses
  Repos; GitHub schickt bei einem fehlgeschlagenen Scheduled-Workflow standardmäßig eine E-Mail an
  die Repo-Owner — keine zusätzliche Einrichtung nötig, aber gut, das im Blick zu behalten statt
  sich allein auf die E-Mail zu verlassen.
- Ein fehlgeschlagener Backup-Lauf ist ein Vorfall mit Eskalation (bei Solo-Betrieb: selbst
  beheben) innerhalb von 24 Stunden, nicht erst beim nächsten geplanten Check.

## 6. Regulatorischer Bezug

- **MaRisk AT 9**, Tz. 9 (Notfallkonzept/Business Continuity) — dieser Plan ist das Pendant für
  den eigenen Betrieb zu dem, was RegStack von den ausgelagerten Dienstleistern seiner Kunden
  verlangt.
- **§ 25b KWG** — Nachvollziehbarkeit und Verfügbarkeit ausgelagerter Prozesse/Daten.
- **DORA (Verordnung (EU) 2022/2554), Art. 12** — Backup-Policies und Wiederherstellungsverfahren
  für IKT-Systeme; unabhängig vom DORA-Registermodul selbst (`src/modules/ictRegister/`, siehe
  README).

## 7. Offene Punkte

- Supabase-eigenes PITR/Backup-Tier im Dashboard aktivieren (Abschnitt 2, Ebene 1) — Code-seitig
  ist nur die unabhängige Zweitsicherung (Ebene 2) umgesetzt.
- GitHub-Actions-Secrets für `.github/workflows/backup.yml` einrichten
  (`PRODUCTION_DATABASE_URL_DIRECT`, `S3_ENDPOINT`, `S3_BUCKET`, `S3_BACKUP_BUCKET`,
  `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`) — ohne sie läuft der Workflow ins Leere.
  `PRODUCTION_DATABASE_URL_DIRECT` muss Supabases direkte (nicht gepoolte) Verbindung sein, siehe
  Kommentar in `src/scripts/backup-database.ts`.
- ~~Wöchentliche/monatliche Retention-Staffelung automatisieren~~ — **erledigt, siehe Abschnitt
  2:** echte Großvater-Vater-Sohn-Staffelung statt Zähl-Limit.
- ~~Ersten vollständigen (manuellen, anwendungsseitigen) Restore-Test terminieren und Ergebnis
  dokumentieren~~ — **erledigt am 2026-09-19, siehe Abschnitt 3.** Mechanismus bestätigt
  funktionsfähig; ein Durchlauf gegen einen echten Produktions-Dump (statt Seed-Daten) mit
  Dauermessung für das RTO-Ziel steht weiterhin aus, bevor das System für echte Kundendaten
  produktiv geht.
