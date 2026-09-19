# Backup- und Disaster-Recovery-Plan — Produktiv-Datenbank

Dieses Dokument ist Infrastruktur-/Betriebsdokumentation, kein Code. Es beschreibt, wie die
produktive PostgreSQL-Datenbank von RegStack gesichert und im Ernstfall wiederhergestellt wird.
RegStack ist selbst ein MaRisk-AT9-Werkzeug für seine Kunden — der gleiche Sorgfaltsmaßstab, den
das Produkt von ausgelagerten Dienstleistern verlangt (Tz. 9: Notfallkonzept, Ersetzbarkeit,
Nachweispflicht), gilt für den eigenen Betrieb.

**Status:** Die endgültige Hosting-Entscheidung (AWS EU-Region vs. Hetzner, siehe `README.md`,
Abschnitt „Nächste Schritte") steht noch aus. Dieser Plan ist bewusst anbieterunabhängig
formuliert und muss nach der Entscheidung um konkrete Produktnamen/Runbooks ergänzt werden
(markiert unten mit **[Nach Hosting-Entscheidung ergänzen]**).

## 1. Ziele: RPO/RTO

| Kennzahl | Ziel | Begründung |
|---|---|---|
| **RPO** (Recovery Point Objective) | ≤ 15 Minuten | Kontinuierliches WAL-Shipping/Streaming statt nur täglicher Snapshots — ein Datenverlust von einem Tag wäre bei einem Audit-Trail-System (jeder Write ist eine Nachweispflicht) nicht hinnehmbar. |
| **RTO** (Recovery Time Objective) | ≤ 4 Stunden für einen vollständigen Restore aus Backup; ≤ 15 Minuten bei Failover auf eine synchron/semisynchron replizierte Standby-Instanz (Multi-AZ) | Ein Ausfall des Kernsystems blockiert Kunden bei Fristen (Vertrags-, Handlungsoptions-, Monitoring-Deadlines, siehe `src/modules/notifications`) — das System muss zügig wieder verfügbar sein, ohne die zugrunde liegenden Fristen selbst zu verändern. |

Diese Ziele sind Zielwerte für die Betriebsplanung, keine vertraglich zugesicherten SLAs
gegenüber Kunden — Letzteres ist eine Geschäftsentscheidung außerhalb dieses Dokuments.

## 2. Backup-Strategie

- **Kontinuierliches WAL-Archiving** (Write-Ahead-Log) parallel zum Betrieb, damit Point-in-Time-
  Recovery (PITR) auf jeden Zeitpunkt innerhalb der Aufbewahrungsfrist möglich ist — nicht nur auf
  den letzten Snapshot.
- **Täglicher vollständiger Snapshot** (Full Backup), außerhalb der Hauptnutzungszeit (nachts,
  Europa/Berlin).
- **Aufbewahrung** (Generationsprinzip, „Großvater-Vater-Sohn"):
  - 7 tägliche Backups
  - 4 wöchentliche Backups
  - 12 monatliche Backups
  - Diese Aufbewahrung betrifft ausschließlich die *technischen Backups* zur Wiederherstellung im
    Störungsfall. Sie ersetzt nicht die fachliche Aufbewahrungspflicht für Audit-Trail- und
    Nachweisdaten selbst (MaRisk-, handels- und steuerrechtliche Fristen, siehe
    `frontend/app/datenschutz/page.tsx`, Abschnitt 8) — diese wird über die Anwendungsdaten
    innerhalb der laufenden Datenbank sichergestellt, nicht über Backup-Retention.
- **Speicherort:** Backups werden in einer von der Primärdatenbank getrennten Availability
  Zone/Region innerhalb der EU gespeichert (nicht in derselben Zone wie die Produktivinstanz), um
  einen Totalausfall eines Rechenzentrums abzudecken, ohne die EU-Datenhoheit zu verlassen.
- **Verschlüsselung:** Backups werden verschlüsselt at-rest gespeichert (Provider-Standard-KMS
  oder gleichwertig) und der Zugriff auf den Backup-Speicher ist auf denselben eingeschränkten
  Personenkreis wie der Produktions-DB-Zugriff beschränkt (kein separates, schwächer geschütztes
  Backup-Bucket).
- **Konkrete Umsetzung [Nach Hosting-Entscheidung ergänzen]:**
  - AWS-Pfad: RDS/Aurora PostgreSQL mit automatisierten Backups + PITR aktiviert, Multi-AZ für
    Failover, `Backup Vault Lock`/S3-Objektsperre für unveränderliche Backup-Kopien.
  - Hetzner-Pfad: PostgreSQL 16 selbstverwaltet mit `pgBackRest` oder `WAL-G`, WAL-Ziel und
    Snapshots auf Hetzner Object Storage (S3-kompatibel) in einer zweiten Location, plus
    physische Streaming-Replika auf einem zweiten Server für schnelles Failover.

## 3. Wiederherstellungstest (Restore Drill)

Ein ungetestetes Backup ist kein Backup. Deshalb:

- **Frequenz:** mindestens vierteljährlich, zusätzlich nach jeder wesentlichen Änderung an
  Schema/Migrationskette (`prisma/migrations`).
- **Vorgehen:**
  1. Backup/PITR-Snapshot in eine isolierte, frische Instanz einspielen (nie in eine Umgebung mit
     Produktivzugriff).
  2. `npx prisma migrate deploy` gegen die wiederhergestellte Instanz ausführen und prüfen, dass
     kein Migrations-Drift besteht.
  3. Stichproben-Validierung: Zeilenanzahl je Kerntabelle (`users`, `OutsourcingActivity`,
     `AuditLogEvent`, …) gegen einen zeitnahen Referenzwert aus der Produktivdatenbank
     vergleichen; ein Login mit einem Test-User und ein lesender API-Aufruf (`/health`,
     `/api/activities`) müssen erfolgreich sein.
  4. Tatsächliche Restore-Dauer messen und gegen das RTO-Ziel (Abschnitt 1) protokollieren.
  5. Ergebnis (Datum, Dauer, Prüfergebnis, durchführende Person) dokumentieren — analog zum
     Nachweis-Log, das die Anwendung selbst für Kunden-Monitoring verlangt (`MonitoringRecord`,
     Tz. 9): Wer ausgelagerte Notfallprozesse von Kunden verlangt, muss den eigenen nachweisen
     können.
  6. Testinstanz nach Abschluss vollständig löschen.

## 4. Rollen und Verantwortlichkeiten

- **Owner:** **[Nach Hosting-Entscheidung ergänzen — verantwortliche Person/Rolle für den
  Datenbankbetrieb]**. Diese Person/Rolle ist für Einrichtung, Überwachung und Testdurchführung
  verantwortlich und eskaliert Störungen.
- **Zugriff auf Backups:** beschränkt auf denselben Personenkreis, der Produktions-DB-Zugriff hat
  (kein Zugriff für alle mit `ADMIN`-Rolle *in der Anwendung* — Anwendungsrollen und
  Infrastrukturzugriff sind getrennte Berechtigungsebenen).
- **Runbook:** ein separates, verlinktes Runbook mit den konkreten Wiederherstellungs-Befehlen für
  den gewählten Anbieter ist vor Produktivstart zu erstellen **[Nach Hosting-Entscheidung
  ergänzen]**.

## 5. Monitoring und Eskalation

- Automatisierte Erfolgs-/Fehlbenachrichtigung für jeden Backup-Lauf (z. B. Provider-natives
  Backup-Monitoring oder ein einfacher Cron-Check, analog zum Aufbau von
  `.github/workflows/deadline-reminders.yml` in diesem Repo).
- Ein fehlgeschlagener Backup-Lauf ist ein Vorfall mit Eskalation innerhalb von 24 Stunden, nicht
  erst beim nächsten geplanten Check.

## 6. Regulatorischer Bezug

- **MaRisk AT 9**, Tz. 9 (Notfallkonzept/Business Continuity) — dieser Plan ist das Pendant für
  den eigenen Betrieb zu dem, was RegStack von den ausgelagerten Dienstleistern seiner Kunden
  verlangt.
- **§ 25b KWG** — Nachvollziehbarkeit und Verfügbarkeit ausgelagerter Prozesse/Daten.
- **DORA (Verordnung (EU) 2022/2554), Art. 12** — Backup-Policies und Wiederherstellungsverfahren
  für IKT-Systeme; das DORA-Registermodul selbst ist laut `README.md` bewusst außerhalb des MVP,
  aber diese grundlegende Backup-Hygiene ist unabhängig davon sinnvoll und sollte nicht auf das
  DORA-Modul warten.

## 7. Offene Punkte

- Hosting-Entscheidung (AWS EU vs. Hetzner) treffen und die mit **[Nach Hosting-Entscheidung
  ergänzen]** markierten Abschnitte konkretisieren.
- Konkretes Runbook mit Befehlen/Zugangsdaten-Pfaden (nicht in diesem öffentlich lesbaren
  Dokument, sondern im internen Secret-/Runbook-System) erstellen.
- Ersten Restore-Test terminieren und Ergebnis dokumentieren, bevor das System für echte
  Kundendaten produktiv geht.
