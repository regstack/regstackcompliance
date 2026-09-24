"use client";

import { useRef, useState, useTransition } from "react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  getAccountingUploadUrl,
  registerAccountingFile,
  getAccountingDownloadUrl,
} from "@/app/(app)/buchhaltung/actions";
import type { AccountingDocumentFile } from "@/lib/regstack/accounting";

const ACCEPTED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Generic upload/download panel for the source document behind a Bilanz/GuV/Anhang/Lagebericht
// entry (the signed PDF, or the working spreadsheet) — mirrors ContractFileUpload
// (components/outsourcing/contract-file-upload.tsx), parameterized by `basePath` instead of
// being hardcoded to one accounting document type.
export function DocumentFileUpload({
  basePath,
  file,
  canWrite,
  title = "Quelldokument",
}: {
  basePath: string;
  file: AccountingDocumentFile | null;
  canWrite: boolean;
  title?: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [downloadPending, startDownloadTransition] = useTransition();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    e.target.value = "";
    if (!selected) return;

    if (!ACCEPTED_MIME_TYPES.includes(selected.type)) {
      setError("Nur PDF-, Word- oder Excel-Dokumente sind zulässig.");
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        const { uploadUrl, objectKey } = await getAccountingUploadUrl(basePath, selected.name, selected.type, selected.size);

        const putRes = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": selected.type },
          body: selected,
        });
        if (!putRes.ok) throw new Error("Hochladen zum Objektspeicher fehlgeschlagen.");

        await registerAccountingFile(basePath, {
          objectKey,
          fileName: selected.name,
          fileSize: selected.size,
          fileMime: selected.type,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload fehlgeschlagen.");
      }
    });
  }

  function handleDownload() {
    setError(null);
    startDownloadTransition(async () => {
      try {
        const url = await getAccountingDownloadUrl(basePath);
        window.open(url, "_blank", "noopener,noreferrer");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Download fehlgeschlagen.");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardBody className="space-y-3">
        {file ? (
          <div className="flex items-center justify-between gap-3 rounded-[10px] border border-border-subtle bg-surface px-3.5 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{file.fileName}</p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(file.fileSize)} · hochgeladen am {new Date(file.uploadedAt).toLocaleDateString("de-DE")}
              </p>
            </div>
            <Button variant="secondary" onClick={handleDownload} disabled={downloadPending}>
              {downloadPending ? "Öffnet…" : "Herunterladen"}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Kein Dokument hinterlegt.</p>
        )}

        {canWrite && (
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_MIME_TYPES.join(",")}
              onChange={handleFileChange}
              className="hidden"
            />
            <Button variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={pending}>
              {pending ? "Lädt hoch…" : file ? "Ersetzen" : "Dokument hochladen"}
            </Button>
            <span className="text-xs text-muted-foreground">PDF, Word oder Excel, max. 25 MB</span>
          </div>
        )}

        {error && <p className="text-xs text-status-danger">{error}</p>}
      </CardBody>
    </Card>
  );
}
