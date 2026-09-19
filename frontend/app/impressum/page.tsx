import type { Metadata } from "next";
import { LegalPage, LegalSection, Placeholder } from "@/components/marketing/legal-page";

export const metadata: Metadata = {
  title: "Impressum — RegStack",
};

// Angaben gemäß § 5 TMG / § 18 Abs. 2 MStV. Die mit [Platzhalter] markierten Felder enthalten
// echte Pflichtangaben und dürfen NICHT mit erfundenen Daten befüllt werden — sie müssen vor
// Live-Schaltung durch die tatsächlichen Unternehmensangaben ersetzt werden.
export default function ImpressumPage() {
  return (
    <LegalPage title="Impressum" updated="18. September 2026">
      <LegalSection heading="Angaben gemäß § 5 TMG">
        <p>
          <Placeholder>Firmenname und Rechtsform, z. B. „RegStack GmbH“</Placeholder>
          <br />
          <Placeholder>Straße und Hausnummer</Placeholder>
          <br />
          <Placeholder>Postleitzahl und Ort</Placeholder>
          <br />
          <Placeholder>Land</Placeholder>
        </p>
      </LegalSection>

      <LegalSection heading="Vertreten durch">
        <p>
          <Placeholder>
            Name(n) der/des vertretungsberechtigten Geschäftsführer(s) bzw. Vorstands
          </Placeholder>
        </p>
      </LegalSection>

      <LegalSection heading="Kontakt">
        <p>
          Telefon: <Placeholder>Telefonnummer</Placeholder>
          <br />
          E-Mail:{" "}
          <a href="mailto:admin@regstack.de">admin@regstack.de</a>
        </p>
      </LegalSection>

      <LegalSection heading="Registereintrag">
        <p>
          Eintragung im Handelsregister.
          <br />
          Registergericht: <Placeholder>zuständiges Amtsgericht</Placeholder>
          <br />
          Registernummer: <Placeholder>HRB-Nummer</Placeholder>
        </p>
      </LegalSection>

      <LegalSection heading="Umsatzsteuer-ID">
        <p>
          Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:
          <br />
          <Placeholder>USt-IdNr., falls vorhanden</Placeholder>
        </p>
      </LegalSection>

      <LegalSection heading="Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV">
        <p>
          <Placeholder>
            Name und ladungsfähige Anschrift der inhaltlich verantwortlichen Person
          </Placeholder>
        </p>
      </LegalSection>

      <LegalSection heading="Streitschlichtung">
        <p>
          Die Europäische Kommission stellt eine Plattform zur
          Online-Streitbeilegung (OS) bereit:{" "}
          <a
            href="https://ec.europa.eu/consumers/odr/"
            target="_blank"
            rel="noreferrer"
          >
            https://ec.europa.eu/consumers/odr/
          </a>
          . Unsere E-Mail-Adresse finden Sie oben im Impressum.
        </p>
        <p>
          Wir sind nicht bereit oder verpflichtet, an
          Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle
          teilzunehmen.
        </p>
      </LegalSection>

      <LegalSection heading="Haftung für Inhalte">
        <p>
          Als Diensteanbieter sind wir gemäß § 7 Abs. 1 TMG für eigene
          Inhalte auf diesen Seiten nach den allgemeinen Gesetzen
          verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter
          jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde
          Informationen zu überwachen oder nach Umständen zu forschen, die
          auf eine rechtswidrige Tätigkeit hinweisen.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
