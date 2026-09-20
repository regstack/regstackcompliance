"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createPolicyDocument, getIcsPolicyUploadUrl } from "@/app/(app)/iks/actions";

const inputCls = "rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-sm text-foreground";
const labelCls = "flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground";

export function PolicyForm({
  businessProcessOptions,
  controlOptions,
  preselectedProcessId,
  preselectedControlId,
}: {
  businessProcessOptions: { id: string; name: string }[];
  controlOptions: { id: string; name: string }[];
  preselectedProcessId?: string;
  preselectedControlId?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [description, setDescription] = useState("");
  const [processIds, setProcessIds] = useState<string[]>(preselectedProcessId ? [preselectedProcessId] : []);
  const [controlIds, setControlIds] = useState<string[]>(preselectedControlId ? [preselectedControlId] : []);
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        + Dokument hinzufügen
      </Button>
    );
  }

  function toggle(list: string[], id: string, setList: (v: string[]) => void) {
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  }

  function save() {
    if (!title.trim()) {
      setError("Titel ist erforderlich.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        let fileFields = {};
        const file = fileInput.current?.files?.[0];
        if (file) {
          setUploading(true);
          const { uploadUrl, objectKey } = await getIcsPolicyUploadUrl(file.name, file.type, file.size);
          const putRes = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
          if (!putRes.ok) throw new Error("Hochladen zum Objektspeicher fehlgeschlagen.");
          fileFields = { fileObjectKey: objectKey, fileName: file.name, fileSize: file.size, fileMime: file.type };
          setUploading(false);
        }
        await createPolicyDocument({
          title,
          description: description || undefined,
          documentType: documentType || undefined,
          businessProcessIds: processIds,
          controlIds,
          ...fileFields,
        });
        setOpen(false);
        router.refresh();
      } catch (e) {
        setUploading(false);
        setError(e instanceof Error ? e.message : "Anlage fehlgeschlagen.");
      }
    });
  }

  return (
    <div className="space-y-3 rounded-lg border border-border-subtle p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={labelCls}>
          Titel
          <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className={labelCls}>
          Dokumenttyp
          <input className={inputCls} placeholder="Richtlinie / Arbeitsanweisung" value={documentType} onChange={(e) => setDocumentType(e.target.value)} />
        </label>
      </div>
      <label className={labelCls}>
        Beschreibung
        <textarea className={inputCls} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>
      <label className={labelCls}>
        Datei
        <input ref={fileInput} type="file" className="text-sm text-muted-foreground" />
      </label>

      {businessProcessOptions.length > 0 && (
        <div>
          <p className={labelCls}>Geschäftsprozesse</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {businessProcessOptions.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => toggle(processIds, p.id, setProcessIds)}
                className={`rounded-full border px-2.5 py-1 text-xs ${
                  processIds.includes(p.id) ? "border-copper-500 bg-copper-700/20 text-copper-300" : "border-border-subtle text-muted-foreground"
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {controlOptions.length > 0 && (
        <div>
          <p className={labelCls}>Kontrollen</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {controlOptions.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => toggle(controlIds, c.id, setControlIds)}
                className={`rounded-full border px-2.5 py-1 text-xs ${
                  controlIds.includes(c.id) ? "border-copper-500 bg-copper-700/20 text-copper-300" : "border-border-subtle text-muted-foreground"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button variant="primary" disabled={pending || uploading} onClick={save}>
          {uploading ? "Lädt hoch…" : "Anlegen"}
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Abbrechen
        </Button>
        {error && <span className="text-xs text-status-danger">{error}</span>}
      </div>
    </div>
  );
}
