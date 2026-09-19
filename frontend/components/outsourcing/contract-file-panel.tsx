"use client";

import { useRef, useState, useTransition } from "react";
import { upload } from "@vercel/blob/client";
import { registerContractFile } from "@/app/(app)/outsourcing/actions";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ContractRecord } from "@/lib/regstack/outsourcing";

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ContractFilePanel({
  activityId,
  contract,
  canWrite,
}: {
  activityId: string;
  contract: ContractRecord | null;
  canWrite: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleFileSelected(file: File) {
    setError(null);
    setProgress(0);
    startTransition(async () => {
      try {
        const blob = await upload(`contracts/${activityId}/${file.name}`, file, {
          access: "private",
          handleUploadUrl: "/api/contracts/upload-url",
          clientPayload: JSON.stringify({ activityId }),
          onUploadProgress: (e) => setProgress(e.percentage),
        });

        await registerContractFile(activityId, {
          fileObjectKey: blob.pathname,
          fileName: file.name,
          fileSize: file.size,
          fileMime: file.type || "application/octet-stream",
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Hochladen fehlgeschlagen.");
      } finally {
        setProgress(null);
        if (inputRef.current) inputRef.current.value = "";
      }
    });
  }

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>Vertragsdokument</CardTitle>
      </CardHeader>
      <CardBody>
        {contract?.fileObjectKey ? (
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-foreground">{contract.fileName}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {contract.fileSize != null && formatSize(contract.fileSize)}
                {contract.uploadedAt && ` · hochgeladen am ${new Date(contract.uploadedAt).toLocaleDateString("de-DE")}`}
              </p>
            </div>
            <a
              href={`/api/contracts/download?activityId=${activityId}`}
              className="shrink-0 text-xs font-medium text-copper-300 hover:text-copper-200"
            >
              Herunterladen
            </a>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Noch kein Vertragsdokument hinterlegt.</p>
        )}

        {canWrite && (
          <div className="mt-3 flex items-center gap-3">
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,.doc,.docx,image/png,image/jpeg"
              aria-label="Vertragsdokument auswählen"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelected(file);
              }}
            />
            <Button
              type="button"
              variant="secondary"
              className="px-2.5 py-1 text-xs"
              disabled={pending}
              onClick={() => inputRef.current?.click()}
            >
              {pending ? (progress != null ? `Lädt hoch… ${progress}%` : "Lädt hoch…") : contract?.fileObjectKey ? "Ersetzen" : "Hochladen"}
            </Button>
            {error && <p className="text-xs text-status-danger">{error}</p>}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
