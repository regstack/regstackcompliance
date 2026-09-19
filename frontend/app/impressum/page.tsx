import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/marketing/legal-page";

export const metadata: Metadata = {
  title: "Impressum — RegStack",
};

// Angaben gemäß § 5 TMG / § 18 Abs. 2 MStV. Lumera Technologies ist ein Einzelunternehmen
// (Gewerbe), kein Handelsregister-Eintrag (kein HRB) — deshalb bewusst kein
// "Registereintrag"-Abschnitt. Keine USt-IdNr. vorhanden (bestätigt vom Inhaber). PLZ 81735 für
// Kurt-Eisner-Straße 48 München mehrfach online recherchiert (stadtgeschichte-muenchen.de,
// plzplz.de), nicht amtlich/durch den Inhaber selbst bestätigt.
export default function ImpressumPage() {
  return (
    <LegalPage title="Impressum" updated="19. September 2026">
      <LegalSection heading="Angaben gemäß § 5 TMG">
        <p>
          Lumera Technologies (Einzelunternehmen)
          <br />
          Inh. Sascha Beinert
          <br />
          Kurt-Eisner-Straße 48
          <br />
          81735 München
          <br />
          Deutschland
        </p>
      </LegalSection>

      <LegalSection heading="Vertreten durch">
        <p>Sascha Beinert, Geschäftsführer dieses Gewerbes</p>
      </LegalSection>

      <LegalSection heading="Kontakt">
        <p>
          E-Mail:{" "}
          <a href="mailto:admin@regstack.de">admin@regstack.de</a>
        </p>
      </LegalSection>

      <LegalSection heading="Umsatzsteuer-ID">
        <p>Es liegt derzeit keine Umsatzsteuer-Identifikationsnummer vor.</p>
      </LegalSection>

      <LegalSection heading="Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV">
        <p>
          Sascha Beinert
          <br />
          Kurt-Eisner-Straße 48, 81735 München
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
