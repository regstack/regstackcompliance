"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { NormForm } from "@/components/compliance/norm-form";
import type { NormInput } from "@/app/(app)/compliance/actions";

export function NormEditToggle({ id, initial }: { id: string; initial: NormInput }) {
  const [editing, setEditing] = useState(false);
  if (!editing) return <Button variant="secondary" className="px-2.5 py-1 text-xs" onClick={() => setEditing(true)}>Bearbeiten</Button>;
  return <div className="mt-3"><NormForm id={id} initial={initial} onDone={() => setEditing(false)} onCancel={() => setEditing(false)} /></div>;
}
