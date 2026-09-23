# Anbieter-/Unterauftragnehmer-Offenlegung — RegStack

Dieses Dokument ist als direkte Antwort auf eine Lieferanten-Due-Diligence-Anfrage gedacht: die
Angaben, die eine Leasinggesellschaft benötigt, um RegStack in ihr eigenes Auslagerungsregister
(MaRisk AT 9) bzw. IKT-Drittparteienregister (DORA Art. 28-30) einzutragen. Alle Angaben stammen
aus den bereits veröffentlichten, vom Inhaber bestätigten Rechtstexten
(`frontend/app/impressum/page.tsx`, `frontend/app/datenschutz/page.tsx`) — nichts hier ist neu
erfunden. Offene Punkte sind als solche markiert, nicht verschwiegen.

**Stand:** 20. September 2026. Vor Weitergabe an einen konkreten Interessenten: Kontaktdaten und
offene Punkte gegenprüfen, insbesondere Abschnitt 6.

## 1. Anbieteridentität

| Feld | Wert |
|---|---|
| Firmierung | Lumera Technologies (Einzelunternehmen) |
| Inhaber/Geschäftsführung | Sascha Beinert |
| Anschrift | Kurt-Eisner-Straße 48, 81735 München, Deutschland |
| Kontakt | admin@regstack.de |
| Rechtsform | Einzelunternehmen (Gewerbe) — **kein Handelsregistereintrag (kein HRB)** |
| Umsatzsteuer-ID | Keine vorhanden |
| LEI (Legal Entity Identifier) | Nicht vorhanden — für ein Einzelunternehmen typischerweise nicht
  vergeben; falls ein Kunde für sein eigenes DORA-Register zwingend einen Identifikator neben dem
  Namen benötigt, ist das vorab zu klären (DORA-Templates akzeptieren alternative Codes, wenn keine
  LEI vorliegt). |
| Konzernbezug | Kein Mutterunternehmen — eigenständiges Einzelunternehmen. |

**Ehrlich benannt statt verschwiegen:** die Rechtsform (Einzelunternehmen, kein Kapitalgesellschaft)
ist ein Punkt, den eine Auslagerungs-Risikoanalyse nach AT 9 typischerweise bewertet (Haftungsmasse,
Fortführungsrisiko). Das ist keine Formalie, die sich im Verkaufsgespräch wegreden lässt — besser,
selbst proaktiv ansprechen (z. B. geplante Umwandlung, Berufshaftpflicht, falls vorhanden) als vom
Kunden darauf angesprochen zu werden.

## 2. Leistungsbeschreibung

RegStack ist eine SaaS-Anwendung für das Auslagerungs-, Compliance-, Risiko- und
Revisionsmanagement gem. MaRisk AT 4/AT 9, BAIT und DORA. Die Leasinggesellschaft bleibt bei allen
fachlichen Entscheidungen (Wesentlichkeitseinstufung, Freigaben, Berichte) selbst
verantwortlich — RegStack stellt das Werkzeug und die Nachweisführung, trifft keine
aufsichtsrechtlichen Entscheidungen automatisiert.

## 3. Unterauftragnehmer / Sub-Outsourcing-Kette

Gem. Datenschutzerklärung Abschnitt 7 eingesetzte Auftragsverarbeiter:

| Anbieter | Funktion | Region |
|---|---|---|
| Supabase, Inc. | Authentifizierung/Session-Verwaltung, Datenbank (PostgreSQL) | eu-central-1 (Frankfurt am Main) |
| Vercel | Hosting von Backend (Serverless Functions) und Frontend | eu-central-1 (Frankfurt am Main) |
| Objektspeicher-Anbieter für hochgeladene Vertragsdokumente | Dateispeicherung (S3-kompatibel) | **Noch nicht final entschieden** — technisch anbieteroffen implementiert (AWS S3, Hetzner Object Storage, MinIO, …); wird vor Produktivbetrieb mit echten Kundendaten festgelegt. |

Keine weiteren Unterauftragnehmer. Keine Datenverarbeitung außerhalb der EU/des EWR nach
aktuellem Kenntnisstand.

## 4. Datenverarbeitung

- **Kategorien:** Vertrags-, Kunden- und Zahlungsdaten aus den Modulen der Leasinggesellschaft
  (siehe Modulübersicht in `CLAUDE.md`), Benutzerkonten (Name, E-Mail, Rolle), Audit-Trail-Daten.
- **Verarbeitung als Auftragsverarbeiter:** Für Kundendaten agiert RegStack als Auftragsverarbeiter
  nach Art. 28 DSGVO; die Leasinggesellschaft bleibt Verantwortlicher. Ein AVV wird pro Kunde
  abgeschlossen.
- **Aufbewahrung:** Orientiert an MaRisk-, handels- und steuerrechtlichen Fristen der
  Leasinggesellschaft, nicht an einer pauschalen RegStack-eigenen Löschfrist.

## 5. Sicherheitsmaßnahmen (Stand heute, technisch verifiziert)

- **Serverseitige RBAC** bei jedem Request neu geprüft, unabhängig von der Frontend-Darstellung.
- **Unveränderlicher Audit-Trail** — jeder schreibende Zugriff wird in derselben Transaktion wie
  die fachliche Änderung protokolliert.
- **Mandantentrennung** — jede Entität ist an ein `institutionId` gebunden, serverseitig aus der
  Session abgeleitet, nie aus Client-Eingaben; zusätzlich Postgres Row-Level-Security auf jeder
  Tabelle als zweite Verteidigungslinie (seit 19.09.2026 vollständig aktiv, siehe
  `docs/backup-disaster-recovery.md`-Historie).
- **Verschlüsselung:** TLS/HTTPS für sämtliche Übertragung; Verschlüsselung at-rest durch den
  jeweiligen Infrastrukturanbieter (Supabase/Vercel-Standard).
- **2FA:** optionale TOTP-Zwei-Faktor-Authentifizierung verfügbar.
- **Unabhängige Datensicherung:** täglicher Backup-Lauf getrennt von der Supabase-eigenen
  Sicherung, mit automatisiertem täglichem Struktur-Restore-Check. Ein erster vollständiger
  anwendungsseitiger Restore-Test (Login + echter API-Aufruf gegen eine wiederhergestellte
  Instanz) wurde am 19.09.2026 erfolgreich durchgeführt — siehe
  `docs/backup-disaster-recovery.md`, Abschnitt 3, für den vollständigen Nachweis.

## 6. Offene Punkte — bewusst nicht beschönigt

Vor einer verbindlichen Zusage an einen Interessenten sollten diese Punkte geklärt bzw. im
Vertrag/AVV adressiert sein:

- **Objektspeicher-Anbieter** für Vertragsdokumente noch nicht final gewählt (Abschnitt 3).
- **Kein vertraglich zugesichertes RTO/RPO gegenüber Kunden** — die Zielwerte in
  `docs/backup-disaster-recovery.md` (RPO ≤ 15 Min. via Supabase-PITR sobald aktiviert, RTO ≤ 4 Std.)
  sind interne Betriebsziele, keine SLA. Falls ein Kunde ein vertragliches SLA verlangt, ist das
  eine eigenständige Entscheidung, keine technische Formalie.
- **Supabase-eigenes PITR/Backup-Tier** ist laut Doku noch nicht aktiviert.
- **Kein formalisiertes Prüfungs-/Auditrecht-Klausel-Template** für den Vertrag mit Kunden vorhanden
  — AT 9 verlangt i. d. R. ein vertraglich vereinbartes Prüfungsrecht für Institut, Wirtschaftsprüfer
  und Aufsicht; dieser Klauseltext existiert noch nicht als wiederverwendbare Vorlage.
- **DORA-Register-Feldabgleich** (`src/modules/ictRegister/`) gegen die offiziellen EBA/ESA-ITS-
  Templates noch nicht vollständig verifiziert — siehe `docs/dora-roi-field-gap-analysis.md`.
- **Exit-/Portabilitätsklausel** (Datenrückgabe/-löschung bei Vertragsende) noch nicht als
  Vertragstext ausformuliert, auch wenn die technische Voraussetzung (strukturierter Export je
  Modul, z. B. `RegistryEntry`-CSV-Export) bereits vorhanden ist.

Diese Liste ist ein Werkzeug, kein Warnschild — jeder Punkt ist klärbar, meist innerhalb von Tagen,
nicht Wochen. Besser, mit dieser Liste in der Hand ins Gespräch zu gehen, als überrascht zu werden.
