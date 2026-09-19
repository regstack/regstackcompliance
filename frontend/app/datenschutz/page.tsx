import type { Metadata } from "next";
import { LegalPage, LegalSection, Placeholder } from "@/components/marketing/legal-page";

export const metadata: Metadata = {
  title: "Datenschutzerklärung — RegStack",
};

// DSGVO-Datenschutzerklärung. Beschreibt die tatsächliche Datenverarbeitung dieser Codebase
// (Supabase Auth für Login/Session, Backend-JWT + Audit-Trail für Anwendungsdaten, kein
// Analytics/Tracking im Repo gefunden). Hosting-Region (eu-central-1/Frankfurt) und
// DPO-Bestellung sind vom Inhaber bestätigt. Einziger verbleibender [Platzhalter]: der konkrete
// Objektspeicher-Anbieter für hochgeladene Vertragsdokumente — noch nicht entschieden, nicht
// erfunden.
export default function DatenschutzPage() {
  return (
    <LegalPage title="Datenschutzerklärung" updated="19. September 2026">
      <LegalSection heading="1. Verantwortlicher">
        <p>
          Verantwortlicher im Sinne der Datenschutz-Grundverordnung (DSGVO)
          ist:
        </p>
        <p>
          Lumera Technologies (Einzelunternehmen), Inh. Sascha Beinert
          <br />
          Kurt-Eisner-Straße 48, 81735 München
          <br />
          E-Mail: <a href="mailto:admin@regstack.de">admin@regstack.de</a>
        </p>
        <p>
          Für Institute, die RegStack als Kunden nutzen, ist das jeweilige
          Institut Verantwortlicher für die personenbezogenen Daten seiner
          Mitarbeitenden innerhalb der Anwendung; RegStack verarbeitet diese
          Daten insoweit als Auftragsverarbeiter auf Grundlage eines
          Auftragsverarbeitungsvertrags (AVV) nach Art. 28 DSGVO.
        </p>
      </LegalSection>

      <LegalSection heading="2. Datenschutzbeauftragter">
        <p>
          Als Einzelunternehmen unterhalb der Schwellenwerte aus Art. 37
          DSGVO/§ 38 BDSG ist Lumera Technologies gesetzlich nicht zur
          Bestellung eines Datenschutzbeauftragten verpflichtet. Ansprechpartner
          für Datenschutzanfragen ist der Verantwortliche selbst, Sascha
          Beinert, erreichbar unter{" "}
          <a href="mailto:admin@regstack.de">admin@regstack.de</a>.
        </p>
      </LegalSection>

      <LegalSection heading="3. Hosting und Serverstandort">
        <p>
          Die Anwendung und die zugehörige Datenbank werden in einem
          Rechenzentrum in Frankfurt am Main betrieben (Supabase-Projektregion
          eu-central-1; das Backend ist in derselben Region gehostet).
          Personenbezogene Daten werden nach unserem Kenntnisstand nicht in
          Drittländer außerhalb der EU/des EWR übertragen. Beim Aufruf der
          Website verarbeitet der Hosting-Provider technisch bedingt
          Server-Logfiles (u. a. IP-Adresse, Datum/Uhrzeit des Zugriffs,
          aufgerufene Seite, User-Agent) zur Sicherstellung eines
          störungsfreien Betriebs (Art. 6 Abs. 1 lit. f DSGVO, berechtigtes
          Interesse an Betriebssicherheit).
        </p>
      </LegalSection>

      <LegalSection heading="4. Registrierung und Anmeldung (Supabase Auth)">
        <p>
          Die Anmeldung erfolgt über Supabase Auth. Dabei werden
          E-Mail-Adresse und ein gehashtes Passwort bei Supabase
          gespeichert; nach erfolgreicher Anmeldung setzt die Anwendung ein
          Sitzungs-Cookie, das den Login-Zustand hält und nach Ablauf
          automatisch erneuert wird (kein Tracking, ausschließlich technisch
          notwendig, Art. 6 Abs. 1 lit. b, f DSGVO). Zusätzlich legt unser
          Backend einen Nutzerdatensatz an (Name, E-Mail, Rolle,
          zugeordnetes Institut), der die Grundlage der
          Berechtigungsprüfung (RBAC) ist.
        </p>
        <p>
          Supabase, Inc. wird dabei als Auftragsverarbeiter eingesetzt.
          Region des Supabase-Projekts: eu-central-1 (Frankfurt am Main).
        </p>
      </LegalSection>

      <LegalSection heading="5. Verarbeitung von Anwendungs- und Audit-Daten">
        <p>
          RegStack protokolliert als Compliance-Werkzeug für MaRisk AT 9
          jeden schreibenden Zugriff auf regulatorisch relevante Datensätze
          in einem Audit-Trail (Zeitpunkt, handelnde Person, Änderung). Diese
          Protokollierung ist für die revisionssichere Nachweisführung
          gegenüber Aufsicht und Wirtschaftsprüfung erforderlich (Art. 6
          Abs. 1 lit. c, f DSGVO i. V. m. § 25b KWG, AT 9 MaRisk) und wird
          nicht zu Zwecken der Leistungs- oder Verhaltenskontrolle einzelner
          Mitarbeitender ausgewertet.
        </p>
      </LegalSection>

      <LegalSection heading="6. Cookies und Tracking">
        <p>
          Wir setzen ausschließlich technisch notwendige Cookies zur
          Aufrechterhaltung der Anmeldesitzung (gesetzt durch Supabase
          Auth) ein. Es werden keine Analyse-, Marketing- oder
          Tracking-Cookies und keine Drittanbieter-Analysedienste (z. B.
          Google Analytics) eingesetzt.
        </p>
      </LegalSection>

      <LegalSection heading="7. Empfänger und Auftragsverarbeiter">
        <p>Im Rahmen des Betriebs setzen wir folgende Auftragsverarbeiter ein:</p>
        <ul className="ml-4 list-disc space-y-1">
          <li>Supabase, Inc. — Authentifizierung/Session-Verwaltung (Region eu-central-1, Frankfurt am Main)</li>
          <li>Hosting-/Infrastrukturanbieter für Anwendung und Datenbank — Region eu-central-1, Frankfurt am Main</li>
          <li>
            <Placeholder>
              Objektspeicher-Anbieter für hochgeladene Vertragsdokumente,
              z. B. Hetzner
            </Placeholder>
          </li>
        </ul>
        <p>
          Mit allen Auftragsverarbeitern bestehen Verträge zur
          Auftragsverarbeitung nach Art. 28 DSGVO.
        </p>
      </LegalSection>

      <LegalSection heading="8. Speicherdauer">
        <p>
          Nutzerkonten und Audit-Trail-Einträge werden für die Dauer der
          Geschäftsbeziehung sowie darüber hinaus entsprechend gesetzlicher
          und regulatorischer Aufbewahrungspflichten (u. a. MaRisk-,
          handels- und steuerrechtliche Fristen) gespeichert. Danach werden
          die Daten gelöscht oder anonymisiert, sofern keine weitergehende
          Aufbewahrungspflicht besteht.
        </p>
      </LegalSection>

      <LegalSection heading="9. Ihre Rechte">
        <p>
          Sie haben nach der DSGVO das Recht auf Auskunft (Art. 15), auf
          Berichtigung (Art. 16), auf Löschung (Art. 17), auf Einschränkung
          der Verarbeitung (Art. 18), auf Datenübertragbarkeit (Art. 20) und
          Widerspruch (Art. 21) gegen die Verarbeitung Ihrer
          personenbezogenen Daten. Wenden Sie sich hierzu an{" "}
          <a href="mailto:admin@regstack.de">admin@regstack.de</a>. Ihnen
          steht außerdem ein Beschwerderecht bei der zuständigen
          Datenschutzaufsichtsbehörde zu.
        </p>
      </LegalSection>

      <LegalSection heading="10. Datensicherheit">
        <p>
          Die Übertragung erfolgt ausschließlich verschlüsselt (TLS/HTTPS).
          Zugriffe auf personenbezogene und regulatorische Daten werden
          serverseitig rollenbasiert geprüft (RBAC) und protokolliert.
        </p>
      </LegalSection>

      <LegalSection heading="11. Änderung dieser Datenschutzerklärung">
        <p>
          Wir passen diese Datenschutzerklärung an, sobald sich die
          Datenverarbeitung oder die Rechtslage ändert. Es gilt jeweils die
          zum Zeitpunkt Ihres Besuchs aktuelle Fassung.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
