import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = { title: "Impressum – RegStack" };

export default function ImpressumPage() {
  return (
    <LegalPage title="Impressum">
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Angaben gemäß § 5 TMG
        </h2>
        <p className="mt-2">
          RegStack UG (haftungsbeschränkt)
          <br />
          [Straße, Hausnummer]
          <br />
          [PLZ] München
          <br />
          Deutschland
        </p>
      </section>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Vertreten durch</h2>
        <p className="mt-2">Geschäftsführung: [Name der Geschäftsführerin/des Geschäftsführers]</p>
      </section>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Kontakt</h2>
        <p className="mt-2">
          Telefon: [Telefonnummer]
          <br />
          E-Mail:{" "}
          <a href="mailto:admin@regstack.de" className="text-copper-300 hover:text-copper-200">
            admin@regstack.de
          </a>
        </p>
      </section>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Registereintrag</h2>
        <p className="mt-2">
          Eintragung im Handelsregister.
          <br />
          Registergericht: [Registergericht, z. B. Amtsgericht München]
          <br />
          Registernummer: [HRB-Nummer]
        </p>
      </section>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Umsatzsteuer-ID</h2>
        <p className="mt-2">
          Umsatzsteuer-Identifikationsnummer gemäß § 27a Umsatzsteuergesetz: [USt-IdNr., falls vorhanden]
        </p>
      </section>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV
        </h2>
        <p className="mt-2">
          [Name der Geschäftsführerin/des Geschäftsführers]
          <br />
          (Anschrift wie oben)
        </p>
      </section>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">EU-Streitschlichtung</h2>
        <p className="mt-2">
          Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{" "}
          <a
            href="https://ec.europa.eu/consumers/odr/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-copper-300 hover:text-copper-200"
          >
            https://ec.europa.eu/consumers/odr/
          </a>
          . Unsere E-Mail-Adresse finden Sie oben unter Kontakt. Wir sind nicht bereit oder verpflichtet, an
          Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
        </p>
      </section>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Haftung für Inhalte</h2>
        <p className="mt-2">
          Als Diensteanbieter sind wir gemäß § 7 Abs. 1 TMG für eigene Inhalte auf diesen Seiten nach den
          allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht
          verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu
          forschen, die auf eine rechtswidrige Tätigkeit hinweisen.
        </p>
      </section>
    </LegalPage>
  );
}
