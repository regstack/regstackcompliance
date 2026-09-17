import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getNorm, getNormZuweisungHandshake, listFeststellungenForNorm, listAllPersons,
} from "@/lib/regstack/compliance";
import { getSessionContext, canWriteCompliance, isGeschaeftsleitung } from "@/lib/regstack/session";
import { Card, CardBody } from "@/components/ui/card";
import { Kv } from "@/components/ui/kv";
import { StatusPill } from "@/components/ui/status-pill";
import { NormWorkflow } from "@/components/compliance/norm-workflow";
import { NormEditToggle } from "@/components/compliance/norm-edit-toggle";

function classify(n: { relevanz: string | null; wesentlichkeit: string | null }) {
  if (n.relevanz === "nicht_relevant") return { label: "geprüft — nicht relevant", tone: "nicht_relevant" };
  if (n.wesentlichkeit === "wesentlich") return { label: "wesentlich", tone: "wesentlich" };
  if (n.wesentlichkeit === "nicht_wesentlich") return { label: "relevant, nicht wesentlich", tone: "relevant" };
  return { label: "Einstufung offen", tone: "offen" };
}

export default async function NormDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getSessionContext();
  const norm = await getNorm(id);
  if (!norm) notFound();

  const [handshake, feststellungen, personen] = await Promise.all([
    getNormZuweisungHandshake(id),
    listFeststellungenForNorm(id),
    listAllPersons(),
  ]);

  const canWrite = ctx ? canWriteCompliance(ctx) : false;
  const isGL = ctx ? isGeschaeftsleitung(ctx) : false;
  const cls = classify(norm);

  return (
    <div className="space-y-6">
      <Link href="/compliance/normen" className="text-xs text-muted-foreground hover:text-copper-300">← Rechtsnormenkataster</Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{norm.bezeichnung}</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            <StatusPill status={cls.tone} label={cls.label} />
            {norm.risiko && <StatusPill status={norm.risiko} />}
            {norm.personalunion && <StatusPill status="mittel" label="Personalunion" />}
            {norm.relevanz_uebersteuert && <StatusPill status="mittel" label="automatischer Vorschlag übersteuert" />}
          </div>
        </div>
        {canWrite && (
          <NormEditToggle
            id={norm.id}
            initial={{
              bezeichnung: norm.bezeichnung, quelle: norm.quelle ?? "manuell", sachgebiet: norm.sachgebiet ?? "",
              relevanz: (norm.relevanz as "relevant" | "nicht_relevant") ?? "relevant",
              relevanz_begruendung: norm.relevanz_begruendung ?? "", wesentlichkeit: norm.wesentlichkeit ?? "",
              wesentlichkeit_begruendung: norm.wesentlichkeit_begruendung ?? "", risiko: norm.risiko ?? "",
            }}
          />
        )}
      </div>

      <Card>
        <CardBody className="grid gap-x-6 sm:grid-cols-2">
          <Kv k="Sachgebiet">{norm.sachgebiet ?? "—"}</Kv>
          <Kv k="Stand der Norm">{norm.stand ?? "—"}</Kv>
          <Kv k="Begründung Stufe 1 (Relevanz)">{norm.relevanz_begruendung ?? "—"}</Kv>
          <Kv k="Begründung Stufe 2 (Wesentlichkeit)">{norm.wesentlichkeit_begruendung ?? "—"}</Kv>
          <Kv k="Quelle">{norm.quelle ?? "manuell"}</Kv>
        </CardBody>
      </Card>

      <NormWorkflow
        normId={id}
        handshake={handshake}
        feststellungen={feststellungen}
        personen={personen}
        canWrite={canWrite}
        isGL={isGL}
        currentPersonId={ctx?.personId ?? ""}
      />
    </div>
  );
}
