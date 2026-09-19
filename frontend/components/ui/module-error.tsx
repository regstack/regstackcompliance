"use client";

import { useEffect } from "react";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangleIcon } from "@/components/ui/icons";

/** Shared body for every module's error.tsx (Next.js requires that file to be a Client Component
 * itself, so this can't just be a server component import). */
export function ModuleError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Card>
      <CardBody className="flex flex-col items-center gap-3 py-12 text-center">
        <AlertTriangleIcon width={28} height={28} className="text-status-danger" />
        <div>
          <p className="text-sm font-semibold text-foreground">Diese Seite konnte nicht geladen werden.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {error.digest ? `Fehlerreferenz: ${error.digest}` : "Bitte versuchen Sie es erneut."}
          </p>
        </div>
        <Button variant="secondary" className="mt-1 px-3.5 py-1.5 text-xs" onClick={reset}>
          Erneut versuchen
        </Button>
      </CardBody>
    </Card>
  );
}
