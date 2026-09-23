"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { getNachweisUploadUrl, registerNachweis } from "@/app/(app)/compliance/nachweise/actions";
import type { NachweisModule } from "@/lib/regstack/nachweise";

const ACCEPTED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png",
  "image/jpeg",
];

async function sha256Hex(file: File): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Ebenenauswahl passt zur Banner-Copy auf /compliance/nachweise: "an der Kontrolle,
// an der einzelnen Kontrolldurchführung und an der Feststellung" — bleibt hier generisch (jedes
// Modul liefert seine eigenen entityType-Optionen), keine Compliance-spezifische Kopplung.
export function NachweisUploadForm({
  module, entityType, entityTypeOptions, entityId, entityIdEditable, revalidateTargetPath, onDone,
}: {
  module: NachweisModule;
  entityType: string;
  entityTypeOptions?: { value: string; label: string }[];
  entityId?: string;
  entityIdEditable?: boolean;
  revalidateTargetPath: string;
  onDone?: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedEntityType, setSelectedEntityType] = useState(entityType);
  const [selectedEntityId, setSelectedEntityId] = useState(entityId ?? "");
  const [aufbewahrungsfrist, setAufbewahrungsfrist] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
      setError("Nur PDF, Word, Excel oder Bilddateien sind zulässig.");
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        const hash = await sha256Hex(file);
        const { uploadUrl, objectKey } = await getNachweisUploadUrl(module, file.name, file.type, file.size);
        const putRes = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
        if (!putRes.ok) throw new Error("Hochladen zum Objektspeicher fehlgeschlagen.");
        await registerNachweis(
          {
            module,
            entityType: selectedEntityType,
            entityId: selectedEntityId || undefined,
            dateiname: file.name,
            objectKey,
            fileSize: file.size,
            fileMime: file.type,
            hash,
            aufbewahrungsfrist: aufbewahrungsfrist || undefined,
          },
          revalidateTargetPath
        );
        onDone?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload fehlgeschlagen.");
      }
    });
  }

  return (
    <div className="rounded-md border border-border-strong bg-graphite-950 p-3">
      <div className="grid gap-2 sm:grid-cols-3">
        {entityTypeOptions ? (
          <select value={selectedEntityType} disabled={pending} onChange={(e) => setSelectedEntityType(e.target.value)}
            className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50">
            {entityTypeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        ) : null}
        {entityIdEditable ? (
          <input placeholder="Bezugs-ID (optional)" value={selectedEntityId} disabled={pending}
            onChange={(e) => setSelectedEntityId(e.target.value)}
            className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50" />
        ) : null}
        <input placeholder="Aufbewahrungsfrist (optional)" value={aufbewahrungsfrist} disabled={pending}
          onChange={(e) => setAufbewahrungsfrist(e.target.value)}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50" />
      </div>
      <div className="mt-2 flex items-center gap-3">
        <input ref={fileInputRef} type="file" accept={ACCEPTED_MIME_TYPES.join(",")} onChange={handleFileChange} className="hidden" />
        <Button className="px-2.5 py-1 text-xs" disabled={pending} onClick={() => fileInputRef.current?.click()}>
          {pending ? "Lädt hoch…" : "Datei auswählen"}
        </Button>
        <span className="text-xs text-muted-foreground">PDF, Word, Excel oder Bild, max. 25 MB</span>
      </div>
      {error && <p className="mt-2 text-xs text-status-danger">{error}</p>}
    </div>
  );
}
