"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { TEST_STATUS_LABELS, TEST_RESULT_LABELS, type ControlTest } from "@/lib/regstack/ics-utils";
import { updateControlTest, addControlTestEvidence } from "@/app/(app)/iks/actions";
import { uploadIcsFile } from "@/lib/regstack/storage";

const inputCls = "rounded-md border border-border-strong bg-surface px-2 py-1 text-sm text-foreground";

export function TestResultCard({ test, canWrite }: { test: ControlTest; canWrite: boolean }) {
  const router = useRouter();
  const [status, setStatus] = useState(test.status);
  const [result, setResult] = useState(test.result ?? "");
  const [resultNotes, setResultNotes] = useState(test.resultNotes ?? "");
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  function save() {
    setError(null);
    startTransition(async () => {
      try {
        await updateControlTest(test.id, {
          status,
          result: result ? (result as ControlTest["result"]) : null,
          resultNotes: resultNotes || undefined,
        });
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const uploaded = await uploadIcsFile(file, "ics-evidence");
      await addControlTestEvidence(test.id, uploaded);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload fehlgeschlagen.");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  return (
    <Card>
      <CardBody className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-foreground">{test.plannedPeriod ?? "—"}</p>
            <p className="text-xs text-muted-foreground">
              {test.plannedDate ? new Date(test.plannedDate).toLocaleDateString("de-DE") : "kein Termin"}
            </p>
          </div>
          <StatusPill status={test.status.toLowerCase()} label={TEST_STATUS_LABELS[test.status]} />
        </div>

        {canWrite ? (
          <div className="flex flex-wrap items-end gap-2">
            <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value as ControlTest["status"])}>
              {Object.entries(TEST_STATUS_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            <select className={inputCls} value={result} onChange={(e) => setResult(e.target.value)}>
              <option value="">— Ergebnis —</option>
              {Object.entries(TEST_RESULT_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            <input
              className={`${inputCls} min-w-[220px] flex-1`}
              placeholder="Anmerkungen zum Ergebnis"
              value={resultNotes}
              onChange={(e) => setResultNotes(e.target.value)}
            />
            <Button variant="secondary" disabled={pending} onClick={save}>
              Speichern
            </Button>
          </div>
        ) : (
          test.resultNotes && <p className="text-sm text-muted-foreground">{test.resultNotes}</p>
        )}

        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Nachweise</p>
          {test.evidence.length === 0 && <p className="text-xs text-muted-foreground">Keine Nachweise hinterlegt.</p>}
          {test.evidence.map((ev) => (
            <div key={ev.id} className="text-xs text-foreground">
              📎 {ev.fileName}
            </div>
          ))}
          {canWrite && (
            <div>
              <input ref={fileInput} type="file" onChange={onFileChange} disabled={uploading} className="text-xs text-muted-foreground" />
              {uploading && <span className="ml-2 text-xs text-muted-foreground">Wird hochgeladen…</span>}
            </div>
          )}
        </div>
        {error && <p className="text-xs text-status-danger">{error}</p>}
      </CardBody>
    </Card>
  );
}
