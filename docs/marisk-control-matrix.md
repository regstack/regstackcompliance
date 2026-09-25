# RegStack MaRisk-Kontrollmatrix — Nachweis, wie die Software selbst die Anforderungen erfüllt

Dieses Dokument ist die zweite Hälfte der Richtlinien-Ablage im IKS-Modul (`ics_policy_documents`,
scope `SOFTWARE_MARISK_NACHWEIS`): während die eigene Auslagerungsrichtlinie des Instituts regelt,
*was* fachlich zu tun ist, dokumentiert dieses Dokument, *wie* RegStack als Software die technischen
und organisatorischen Voraussetzungen dafür schafft. Es ist an die drei Non-Negotiables aus
`CLAUDE.md` sowie an `docs/vendor-disclosure.md` §5 angelehnt, geht aber tiefer auf konkrete
Codestellen ein, damit es als Nachweis in einer Auslagerungs-Due-Diligence oder einer Prüfung durch
die Interne Revision / einen Wirtschaftsprüfer taugt.

**Stand:** 25. September 2026. Wie bei jedem Nachweisdokument gilt: bei jeder größeren Änderung an
Auth/RBAC/Audit-Trail (siehe CLAUDE.md "Non-negotiables") ist dieses Dokument gegenzuprüfen, nicht
nur einmalig zu erstellen.

## 1. Kontrollmatrix

| Kontrollziel | MaRisk-/DORA-Bezug | Technische Umsetzung | Codestelle | Status |
|---|---|---|---|---|
| Jede schreibende Aktion ist nachvollziehbar und unveränderlich protokolliert | AT 4.4.3 (Nachvollziehbarkeit), DORA Art. 9 | `withAudit()` schreibt die fachliche Änderung und den `AuditLogEvent`-Datensatz in derselben DB-Transaktion — es gibt keinen Codepfad, der eine Änderung ohne zugehörigen Audit-Eintrag persistiert | `src/middleware/auditTrail.ts` | Umgesetzt |
| Berechtigungen werden serverseitig geprüft, nicht nur im Frontend versteckt | AT 4.1 Tz. 5 (Funktionstrennung), BAIT Kap. 6 | `requirePermission(resource, action)` prüft Rolle × Ressource × Aktion bei jedem Request neu, unabhängig davon, was das Frontend anzeigt/versteckt | `src/middleware/rbac.ts` | Umgesetzt |
| Mandantentrennung zwischen Instituten | Mandantenfähigkeit als Grundvoraussetzung für einen SaaS-Anbieter im Sinne AT 9 | Jede Entität hängt an `institutionId`, serverseitig aus der JWT-Session abgeleitet, nie aus Client-Body/Query — zusätzlich Postgres Row-Level-Security auf jeder Tabelle als zweite Verteidigungslinie | `20260919190000_enable_rls_*`-Migrationen, `src/middleware/auth.ts` | Umgesetzt |
| Funktionstrennung zwischen operativer Tätigkeit und deren Prüfung | AT 4.4.3 Tz. 1 (Unabhängigkeit der Revision), Tz. 1 S.2 (Selbstüberprüfung der Revisionsfunktion) | Eigene Rolle `PRUEFER` mit ausschließlich Lesezugriff + Exportfunktionen, keine Schreibrechte in der Rollenmatrix; zusätzlich muss `INTERNE_REVISION` sich Lesezugriff auf Outsourcing-/Compliance-Daten aktiv freigeben lassen (`ModuleAccessGrant`), statt ihn implizit über die Rollenmatrix zu haben | `src/middleware/rbac.ts` (`PRUEFER`, `requireAccessGrant`), `src/modules/accessGrants/` | Umgesetzt |
| Vier-Augen-Prinzip bei Freigaben, die an die Geschäftsleitung gebunden sind | Tz. 13 (Bericht Auslagerungen), diverse `.approve`/`.acknowledge`-Aktionen | Eigene RBAC-Aktionen (`report.approve`, `revisionReport.acknowledge`, `handlungsoption.approve`, …), ausschließlich `GESCHAEFTSLEITUNG`/`ADMIN`; „Kenntnisnahme"-Felder sind getrennt vom Erfassen/Finalisieren des Dokuments und first-write-wins (kein nachträgliches Überschreiben) | `src/middleware/rbac.ts`, z. B. `src/modules/revisions/reports.routes.ts` (`/acknowledge`) | Umgesetzt |
| Finalisierte Dokumente werden nicht überschrieben, sondern versioniert | Nachvollziehbarkeit abgeschlossener Berichte/Jahresabschlüsse | Einmal `final` gesetzte Berichte (Bilanz, GuV, Revisions-/Compliance-Berichte) sind gegen erneutes PATCH gesperrt; Korrekturen laufen über `previousVersionId` als neue Zeile | z. B. `src/modules/revisions/reports.routes.ts` (`finalize`) | Umgesetzt |
| Proportionalität nach Institutsgröße | Tz. 13 S. 4 (Erleichterung sehr kleine Institute), Tz. 10 (Revisionsbeauftragter), Tz. 2 (qualitativer Ansatz) | `InstitutionProfile.sizeClass` treibt: Berichtsformat (Vorstandssitzungsprotokoll statt Bericht bei `SEHR_KLEIN`), serverseitige Ableitung des Prüfungsturnus, serverseitige Sperre von „Revisionsbeauftragter = Geschäftsleiter" außerhalb `SEHR_KLEIN` | `src/modules/reports/reports.routes.ts`, `src/modules/institutions/institutions.routes.ts` | Umgesetzt |
| Zwei getrennte Richtlinien-Ablagen: Kundenrichtlinie vs. Software-Nachweis | Auslagerungs-Due-Diligence des Instituts gegenüber RegStack als Anbieter | `IcsPolicyDocument.scope` (`KUNDENRICHTLINIE` / `SOFTWARE_MARISK_NACHWEIS`) trennt beide Zwecke in derselben Bibliothek | `prisma/schema.prisma` (`PolicyDocumentScope`), `src/modules/ics/policyDocuments.routes.ts` | Umgesetzt |
| Zwei-Faktor-Authentifizierung | BAIT Kap. 5 (Identitäts- und Rechtemanagement) | Optionales TOTP-2FA je Nutzer | `src/modules/users/twoFactor.routes.ts` | Umgesetzt, optional |
| Verschlüsselung der Übertragung | BAIT Kap. 5 | TLS/HTTPS für sämtliche Verbindungen (Vercel/Supabase-Standard) | Infrastruktur, kein App-Code | Umgesetzt |
| Unabhängige Datensicherung | AT 9 Tz. 9 (Notfallkonzept bei Auslagerung), BAIT Kap. 9 | Täglicher `pg_dump`, getrennt von Supabase-eigener Sicherung, automatisierter Struktur-Restore-Check in CI | `docs/backup-disaster-recovery.md`, `src/scripts/backup-database.ts` | Umgesetzt — vollständige anwendungsseitige Restore-Drills bislang manuell, siehe dortiges §7 |

## 2. Bewusst offene Punkte (nicht beschönigt)

Wie in `docs/vendor-disclosure.md` §6 gilt: eine Liste offener Punkte ist ein Werkzeug, kein
Warnschild.

- **DORA-Register-Feldabgleich** gegen die offiziellen EBA/ESA-ITS-Templates ist noch nicht
  vollständig verifiziert — siehe `docs/dora-roi-field-gap-analysis.md` (als "PRELIMINARY"
  markiert).
- **Kein formalisiertes Prüfungsrecht-Klausel-Template** für den Vertrag mit Kunden — AT 9 verlangt
  i. d. R. ein vertraglich vereinbartes Prüfungsrecht für Institut, Wirtschaftsprüfer und Aufsicht;
  dieser Klauseltext existiert noch nicht als wiederverwendbare Vorlage (siehe
  `docs/vendor-disclosure.md` §6).
- **Kein PDF-Export der Managementberichte** vor 25.09.2026 vorhanden — nur ein strukturierter
  Datensatz in der App; wird mit dieser Änderung nachgezogen (`GET /reports/:id/pdf`,
  `GET /revisions/reports/:id/pdf`).
- **`ModuleAccessGrant` ist neu (25.09.2026)** und deckt bislang nur Interne Revision → Outsourcing/
  Compliance ab, nicht jede denkbare modulübergreifende Leseanfrage im Produkt.
- **Kein eigener ISB-Login** im BAIT-MVP (siehe `Risikomanagement_BAIT_MVP_Spezifikation.md`,
  offene Frage 3) — bewusste Scope-Entscheidung, kein Versehen.

## 3. Wo dieses Dokument selbst geprüft wird

Dieses Dokument ist ein `IcsPolicyDocument` mit `scope = SOFTWARE_MARISK_NACHWEIS` (siehe Seed-Daten
in `prisma/seed.ts`) und über die Richtlinien-Bibliothek des IKS-Moduls einsehbar
(`frontend/app/(app)/iks/richtlinien`), damit es denselben Governance-Pfad durchläuft wie jede
andere Richtlinie — nicht nur eine Markdown-Datei im Repository, die niemand im Produkt findet.
