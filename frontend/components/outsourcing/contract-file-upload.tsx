"use client";

import { useRef, useState, useTransition } from "react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  getContractDownloadUrl,
  getContractUploadUrl,
  registerContractFile,
} from "@/app/(app)/outsourcing/actions";
import type { ContractRecord } from "@/lib/regstack/outsourcing";

const ACCEPTED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ContractFileUpload({
  activityId,
  contract,
  canWrite,
}: {
  activityId: string;
  contract: ContractRecord | null;
  canWrite: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [downloadPending, startDownloadTransition] = useTransition();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
      setError("Nur PDF- oder Word-Dokumente sind zulässig.");
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        const { uploadUrl, objectKey } = await getContractUploadUrl(activityId, file.name, file.type, file.size);

        const putRes = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!putRes.ok) throw new Error("Hochladen zum Objektspeicher fehlgeschlagen.");

        await registerContractFile(activityId, {
          objectKey,
          fileName: file.name,
          fileSize: file.size,
          fileMime: file.type,
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
        const url = await getContractDownloadUrl(activityId);
        window.open(url, "_blank", "noopener,noreferrer");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Download fehlgeschlagen.");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vertragsdokument</CardTitle>
      </CardHeader>
      <CardBody className="space-y-3">
        {contract?.fileName ? (
          <div className="flex items-center justify-between gap-3 rounded-[10px] border border-border-subtle bg-surface px-3.5 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{contract.fileName}</p>
              <p className="text-xs text-muted-foreground">
                {contract.fileSize ? formatFileSize(contract.fileSize) : ""}
                {contract.uploadedAt ? ` · hochgeladen am ${new Date(contract.uploadedAt).toLocaleDateString("de-DE")}` : ""}
              </p>
            </div>
            <Button variant="secondary" onClick={handleDownload} disabled={downloadPending}>
              {downloadPending ? "Öffnet…" : "Herunterladen"}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Kein Vertragsdokument hinterlegt.</p>
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
              {pending ? "Lädt hoch…" : contract?.fileName ? "Ersetzen" : "Dokument hochladen"}
            </Button>
            <span className="text-xs text-muted-foreground">PDF oder Word, max. 25 MB</span>
          </div>
        )}

        {error && <p className="text-xs text-status-danger">{error}</p>}
      </CardBody>
    </Card>
  );
}
