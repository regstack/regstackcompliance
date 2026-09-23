"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NachweisUploadForm } from "@/components/nachweise/nachweis-upload-form";
import { NachweisFileTable } from "@/components/nachweise/nachweis-file-table";
import type { Nachweis, NachweisModule } from "@/lib/regstack/nachweise";

const ENTITY_TYPE_OPTIONS = [
  { value: "kontrolle", label: "Kontrolle (Design-Nachweis)" },
  { value: "kontrolldurchfuehrung", label: "Kontrolldurchführung (Betriebs-Nachweis)" },
  { value: "feststellung", label: "Feststellung (Remediation-Nachweis)" },
];

export function NachweisePagePanel({
  items, module, canWrite, revalidateTargetPath, uploaderNames,
}: {
  items: Nachweis[];
  module: NachweisModule;
  canWrite: boolean;
  revalidateTargetPath: string;
  uploaderNames: Record<string, string>;
}) {
  const [adding, setAdding] = useState(false);

  return (
    <Card className="overflow-hidden p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Alle Nachweise</h3>
        {canWrite && !adding && <Button variant="secondary" className="px-2.5 py-1 text-xs" onClick={() => setAdding(true)}>+ Nachweis hochladen</Button>}
      </div>
      {adding && (
        <div className="mb-3">
          <NachweisUploadForm
            module={module}
            entityType={ENTITY_TYPE_OPTIONS[0].value}
            entityTypeOptions={ENTITY_TYPE_OPTIONS}
            entityIdEditable
            revalidateTargetPath={revalidateTargetPath}
            onDone={() => setAdding(false)}
          />
        </div>
      )}
      <NachweisFileTable items={items} module={module} canWrite={canWrite} revalidateTargetPath={revalidateTargetPath} uploaderNames={uploaderNames} />
    </Card>
  );
}
