"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  getNachweisDownloadUrl,
  getNachweisUploadUrl,
  registerNeueVersion,
} from "@/app/(app)/compliance/nachweise/actions";
import type { Nachweis, NachweisModule } from "@/lib/regstack/nachweise";

const ACCEPTED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png",
  "image/jpeg",
];

export function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// SHA-256 über die Rohbytes, clientseitig vor dem Upload berechnet — löst das Versprechen aus der
// Banner-Copy dieser Seite ein ("Je Datei wird ein Hash-Wert geführt, um die Integrität
// nachzuweisen"), das bislang nirgends eingelöst war.
async function sha256Hex(file: File): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function DownloadButton({ nachweisId }: { nachweisId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <Button
        variant="ghost"
        className="px-2 py-1 text-xs"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            try {
              const url = await getNachweisDownloadUrl(nachweisId);
              window.open(url, "_blank", "noopener,noreferrer");
            } catch (e) {
              setError(e instanceof Error ? e.message : "Download fehlgeschlagen.");
            }
          });
        }}
      >
        {pending ? "Öffnet…" : "Herunterladen"}
      </Button>
      {error && <p className="text-[11px] text-status-danger">{error}</p>}
    </div>
  );
}

function NeueVersionButton({ module, nachweisId, revalidateTargetPath }: { module: NachweisModule; nachweisId: string; revalidateTargetPath: string }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
      setError("Dateityp nicht zulässig.");
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        const hash = await sha256Hex(file);
        const { uploadUrl, objectKey } = await getNachweisUploadUrl(module, file.name, file.type, file.size);
        const putRes = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
        if (!putRes.ok) throw new Error("Hochladen zum Objektspeicher fehlgeschlagen.");
        await registerNeueVersion(
          nachweisId,
          { dateiname: file.name, objectKey, fileSize: file.size, fileMime: file.type, hash },
          revalidateTargetPath
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload fehlgeschlagen.");
      }
    });
  }

  return (
    <div>
      <input ref={fileInputRef} type="file" accept={ACCEPTED_MIME_TYPES.join(",")} onChange={handleFileChange} className="hidden" />
      <Button variant="ghost" className="px-2 py-1 text-xs" disabled={pending} onClick={() => fileInputRef.current?.click()}>
        {pending ? "Lädt hoch…" : "Neue Version"}
      </Button>
      {error && <p className="text-[11px] text-status-danger">{error}</p>}
    </div>
  );
}

export function NachweisFileTable({
  items, module, canWrite, revalidateTargetPath, uploaderNames, compact,
}: {
  items: Nachweis[];
  module: NachweisModule;
  canWrite: boolean;
  revalidateTargetPath: string;
  uploaderNames?: Record<string, string>;
  compact?: boolean;
}) {
  if (items.length === 0) {
    return <p className={compact ? "text-xs text-muted-foreground" : "text-sm text-muted-foreground"}>Keine Datei hinterlegt.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className={compact ? "w-full text-xs" : "w-full text-sm"}>
        <thead>
          <tr className="border-b border-border-subtle text-left uppercase tracking-wide text-muted-foreground">
            <th className="py-1.5 pr-3 font-medium">Datei</th>
            <th className="py-1.5 pr-3 font-medium">Fassung</th>
            <th className="py-1.5 pr-3 font-medium">Hochgeladen</th>
            {!compact && <th className="py-1.5 pr-3 font-medium">Größe</th>}
            <th className="py-1.5 pr-3 font-medium">Prüfsumme</th>
            <th className="py-1.5" />
          </tr>
        </thead>
        <tbody>
          {items.map((n) => (
            <tr key={n.id} className="border-b border-border-subtle last:border-0 align-top">
              <td className="py-1.5 pr-3 text-foreground">{n.dateiname}</td>
              <td className="py-1.5 pr-3 font-mono text-muted-foreground">{n.previousVersionId ? "Folgeversion" : "v1"}</td>
              <td className="py-1.5 pr-3 font-mono text-muted-foreground">
                {n.uploadedAt.slice(0, 10)}
                {uploaderNames && n.uploadedByUserId && <div>{uploaderNames[n.uploadedByUserId] ?? "—"}</div>}
              </td>
              {!compact && <td className="py-1.5 pr-3 text-muted-foreground">{n.fileSize != null ? formatFileSize(n.fileSize) : "—"}</td>}
              <td className="py-1.5 pr-3 font-mono text-[11px] text-muted-foreground">{n.hash ? `${n.hash.slice(0, 12)}…` : "—"}</td>
              <td className="py-1.5">
                <div className="flex items-center justify-end gap-1">
                  {n.fileRef && <DownloadButton nachweisId={n.id} />}
                  {canWrite && <NeueVersionButton module={module} nachweisId={n.id} revalidateTargetPath={revalidateTargetPath} />}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
