"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { NormForm } from "@/components/compliance/norm-form";

export function NormListAdd() {
  const [adding, setAdding] = useState(false);
  if (!adding) return <Button variant="secondary" className="px-2.5 py-1 text-xs" onClick={() => setAdding(true)}>+ Regelung erfassen</Button>;
  return <div className="mb-4"><NormForm onDone={() => setAdding(false)} onCancel={() => setAdding(false)} /></div>;
}
