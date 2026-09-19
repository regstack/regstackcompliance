import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = { title: "Datenschutzerklärung – RegStack" };

export default function DatenschutzPage() {
  return (
    <LegalPage title="Datenschutzerklärung">
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          1. Verantwortlicher
        </h2>
        <p className="mt-2">
          Verantwortlicher im Sinne der Datenschutz-Grundverordnung (DSGVO) ist:
          <br />
          RegStack UG (haftungsbeschränkt)
          <br />
          [Straße, Hausnummer]
          <br />
          [PLZ] München
          <br />
          E-Mail:{" "}
          <a href="mailto:admin@regstack.de" className="text-copper-300 hover:text-copper-200">
            admin@regstack.de
          </a>
        </p>
      </section>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          2. Ihre Rechte als betroffene Person
        </h2>
        <p className="mt-2">
          Sie haben jederzeit das Recht auf Auskunft über Ihre bei uns gespeicherten personenbezogenen Daten
          (Art. 15 DSGVO), auf Berichtigung (Art. 16 DSGVO), Löschung (Art. 17 DSGVO), Einschränkung der
          Verarbeitung (Art. 18 DSGVO), Datenübertragbarkeit (Art. 20 DSGVO) sowie Widerspruch gegen die
          Verarbeitung (Art. 21 DSGVO). Zudem haben Sie das Recht, sich bei einer Datenschutz-Aufsichtsbehörde
          über die Verarbeitung Ihrer personenbezogenen Daten durch uns zu beschweren (Art. 77 DSGVO) — zuständig
          ist z. B. das Bayerische Landesamt für Datenschutzaufsicht.
        </p>
      </section>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          3. Welche Daten wir verarbeiten
        </h2>
        <p className="mt-2">RegStack ist eine Business-to-Business-Plattform für regulierte Finanzinstitute. Wir verarbeiten:</p>
        <ul className="mt-2 list-disc space-y-1.5 pl-5">
          <li>
            <span className="text-foreground">Konto- und Anmeldedaten</span> der Nutzerinnen und Nutzer eines
            Instituts: Name, E-Mail-Adresse, Rolle/Berechtigung. Die Authentifizierung erfolgt über unseren
            Auftragsverarbeiter Supabase.
          </li>
          <li>
            <span className="text-foreground">Fachliche Inhalte</span>, die das jeweilige Institut in der
            Anwendung erfasst: Auslagerungs-, Compliance- und Revisionsdaten gemäß §25b KWG/MaRisk AT 9 sowie
            hochgeladene Vertragsdokumente. Verantwortlich für die Rechtmäßigkeit dieser Fachdaten (insb.
            personenbezogene Daten Dritter darin) ist das jeweilige Institut als eigenständiger Verantwortlicher;
            wir verarbeiten sie in dessen Auftrag.
          </li>
          <li>
            <span className="text-foreground">Protokoll-/Audit-Daten:</span> Jede schreibende Aktion in der
            Anwendung wird mit Zeitstempel, handelnder Person und IP-Adresse revisionssicher protokolliert — das
            ist eine Kernfunktion der Plattform (Nachweisbarkeit gegenüber Aufsicht/Wirtschaftsprüfung) und
            technisch nicht abschaltbar.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">4. Cookies</h2>
        <p className="mt-2">
          Wir setzen ausschließlich technisch notwendige Cookies ein — keine Tracking-, Marketing- oder
          Analyse-Cookies:
        </p>
        <ul className="mt-2 list-disc space-y-1.5 pl-5">
          <li>Session-Cookies unseres Authentifizierungs-Dienstleisters Supabase (httpOnly).</li>
          <li>
            Ein httpOnly-Session-Cookie unseres eigenen Backends, gültig für 8 Stunden, zur Anmeldung an der
            Fach-API.
          </li>
        </ul>
        <p className="mt-2">Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Erfüllung des Nutzungsvertrags).</p>
      </section>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          5. Hosting und Auftragsverarbeiter
        </h2>
        <p className="mt-2">Wir setzen folgende Auftragsverarbeiter ein, jeweils auf Grundlage eines Vertrags nach Art. 28 DSGVO:</p>
        <ul className="mt-2 list-disc space-y-1.5 pl-5">
          <li>
            <span className="text-foreground">Vercel Inc.</span> — Hosting der Anwendung und Objektspeicher
            (Vercel Blob) für hochgeladene Dokumente. Vercel ist ein US-amerikanisches Unternehmen; die
            Übermittlung in Drittländer erfolgt auf Grundlage der EU-Standardvertragsklauseln.
          </li>
          <li>
            <span className="text-foreground">Supabase Inc.</span> — Authentifizierung und Teile der
            Datenhaltung.
          </li>
        </ul>
        <p className="mt-2">[Ergänzen: gewählte Serverregion je Dienst, ggf. weitere Auftragsverarbeiter (z. B. Objektspeicher-Anbieter für Vertragsdokumente außerhalb von Vercel Blob), Datenschutzbeauftragte/r falls bestellt.]</p>
      </section>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">6. Speicherdauer</h2>
        <p className="mt-2">
          Fachdaten werden für die Dauer des Vertragsverhältnisses mit dem jeweiligen Institut sowie
          anschließend entsprechend der für das Institut geltenden aufsichtsrechtlichen Aufbewahrungspflichten
          gespeichert. Konto- und Anmeldedaten werden bei Deaktivierung eines Nutzerkontos gelöscht, soweit keine
          gesetzliche Aufbewahrungspflicht entgegensteht.
        </p>
      </section>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">7. Datensicherheit</h2>
        <p className="mt-2">
          Die Übertragung erfolgt ausschließlich verschlüsselt (TLS). Der Zugriff auf Fachdaten ist
          rollenbasiert beschränkt (RBAC) und wird serverseitig bei jeder Anfrage geprüft; jede schreibende
          Aktion erzeugt einen unveränderlichen Prüfpfad-Eintrag.
        </p>
      </section>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          8. Änderungen dieser Datenschutzerklärung
        </h2>
        <p className="mt-2">
          Wir passen diese Datenschutzerklärung an, sobald sich die Datenverarbeitung oder die Rechtslage
          ändert. Es gilt jeweils die auf dieser Seite veröffentlichte Fassung.
        </p>
      </section>
    </LegalPage>
  );
}
