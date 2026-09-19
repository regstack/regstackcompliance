"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  confirmTwoFactorSetup,
  disableTwoFactor,
  startTwoFactorSetup,
  type TwoFactorSetup,
} from "@/app/(app)/konto/actions";

type Step = { kind: "idle" } | { kind: "enrolling"; setup: TwoFactorSetup } | { kind: "disabling" };

export function TwoFactorSettings({ initiallyEnabled }: { initiallyEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initiallyEnabled);
  const [step, setStep] = useState<Step>({ kind: "idle" });
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function beginSetup() {
    setError(null);
    startTransition(async () => {
      try {
        const setup = await startTwoFactorSetup();
        setStep({ kind: "enrolling", setup });
        setCode("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Einrichtung fehlgeschlagen.");
      }
    });
  }

  function confirmSetup() {
    setError(null);
    startTransition(async () => {
      try {
        await confirmTwoFactorSetup(code);
        setEnabled(true);
        setStep({ kind: "idle" });
        setCode("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Code ungültig.");
      }
    });
  }

  function confirmDisable() {
    setError(null);
    startTransition(async () => {
      try {
        await disableTwoFactor(code);
        setEnabled(false);
        setStep({ kind: "idle" });
        setCode("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Code ungültig.");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Zwei-Faktor-Authentifizierung (TOTP)</CardTitle>
      </CardHeader>
      <CardBody className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Schützt Ihre Anmeldung zusätzlich zum Passwort mit einem zeitbasierten Code aus einer
          Authenticator-App (z. B. Google Authenticator, 1Password, Authy).
        </p>

        {step.kind === "idle" && (
          <div className="flex items-center gap-3">
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                enabled ? "bg-status-success-bg text-status-success" : "bg-graphite-800 text-graphite-300"
              }`}
            >
              {enabled ? "Aktiv" : "Nicht aktiv"}
            </span>
            {enabled ? (
              <Button variant="danger" onClick={() => setStep({ kind: "disabling" })}>
                Deaktivieren
              </Button>
            ) : (
              <Button onClick={beginSetup} disabled={pending}>
                {pending ? "Wird eingerichtet…" : "Einrichten"}
              </Button>
            )}
          </div>
        )}

        {step.kind === "enrolling" && (
          <div className="space-y-4 rounded-[10px] border border-border-subtle bg-surface p-4">
            <p className="text-sm text-foreground">
              QR-Code mit einer Authenticator-App scannen oder den Schlüssel manuell eingeben:
            </p>
            <Image
              src={step.setup.qrCodeDataUrl}
              alt="QR-Code für die Authenticator-App"
              width={176}
              height={176}
              unoptimized
              className="rounded-md bg-white p-2"
            />
            <p className="break-all font-mono text-xs text-muted-foreground">{step.setup.secret}</p>
            <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Code aus der App
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                placeholder="123456"
                className="w-32 rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-sm normal-case tracking-widest text-foreground"
              />
            </label>
            <div className="flex items-center gap-3">
              <Button onClick={confirmSetup} disabled={code.length !== 6 || pending}>
                {pending ? "Bestätigt…" : "Aktivieren"}
              </Button>
              <Button variant="ghost" onClick={() => setStep({ kind: "idle" })} disabled={pending}>
                Abbrechen
              </Button>
            </div>
          </div>
        )}

        {step.kind === "disabling" && (
          <div className="space-y-3 rounded-[10px] border border-status-danger/30 bg-status-danger-bg p-4">
            <p className="text-sm text-foreground">
              Zur Bestätigung bitte einen aktuellen Code aus der Authenticator-App eingeben.
            </p>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              placeholder="123456"
              className="w-32 rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-sm normal-case tracking-widest text-foreground"
            />
            <div className="flex items-center gap-3">
              <Button variant="danger" onClick={confirmDisable} disabled={code.length !== 6 || pending}>
                {pending ? "Deaktiviert…" : "Deaktivieren bestätigen"}
              </Button>
              <Button variant="ghost" onClick={() => setStep({ kind: "idle" })} disabled={pending}>
                Abbrechen
              </Button>
            </div>
          </div>
        )}

        {error && <p className="text-xs text-status-danger">{error}</p>}
      </CardBody>
    </Card>
  );
}
