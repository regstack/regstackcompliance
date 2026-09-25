"use client";

import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { XIcon } from "@/components/ui/icons";

export type WalkthroughStep = { title: string; body: string };

function noopSubscribe() {
  return () => {};
}

function hasSeenWalkthrough(storageKey: string): boolean {
  try {
    return window.localStorage.getItem(storageKey) != null;
  } catch {
    return true; // storage unavailable (private mode, blocked) — don't force the tour
  }
}

// Client-side only — a first-visit coach mark, not an audited action. State lives in
// localStorage per browser/device; it never touches the backend or AuditLogEvent.
export function Walkthrough({ id, steps }: { id: string; steps: WalkthroughStep[] }) {
  const storageKey = `regstack:walkthrough:${id}`;
  // useSyncExternalStore (not an effect) so the SSR pass renders "seen" and the client
  // re-renders once with the real localStorage value — no setState-in-effect, no hydration mismatch.
  const seenBefore = useSyncExternalStore(
    noopSubscribe,
    () => hasSeenWalkthrough(storageKey),
    () => true,
  );
  const [step, setStep] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  if (seenBefore || dismissed || steps.length === 0) return null;

  function dismiss() {
    setDismissed(true);
    try {
      window.localStorage.setItem(storageKey, "1");
    } catch {
      // nothing to persist to — the tour just reappears next visit
    }
  }

  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 rounded-2xl border border-border-subtle bg-surface-raised p-4 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">{current.title}</p>
        <button
          onClick={dismiss}
          aria-label="Walkthrough schließen"
          className="shrink-0 text-muted-foreground hover:text-foreground"
        >
          <XIcon width={14} height={14} />
        </button>
      </div>
      <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{current.body}</p>
      <div className="mt-4 flex items-center justify-between">
        <div className="flex gap-1">
          {steps.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-1.5 rounded-full ${i === step ? "bg-copper-500" : "bg-border-strong"}`}
            />
          ))}
        </div>
        <div className="flex gap-2">
          {step > 0 && (
            <Button variant="ghost" className="px-2.5 py-1 text-xs" onClick={() => setStep((s) => s - 1)}>
              Zurück
            </Button>
          )}
          <Button
            variant="primary"
            className="px-2.5 py-1 text-xs"
            onClick={() => (isLast ? dismiss() : setStep((s) => s + 1))}
          >
            {isLast ? "Verstanden" : "Weiter"}
          </Button>
        </div>
      </div>
    </div>
  );
}
