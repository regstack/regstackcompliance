"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import {
  addIctSubcontractingNode,
  removeIctSubcontractingNode,
  type SubcontractingNodeInput,
} from "@/app/(app)/outsourcing/ict-register/actions";
import type { IctSubcontracting } from "@/lib/regstack/ict-register";

function buildTree(chain: IctSubcontracting[]) {
  const byParent = new Map<string | null, IctSubcontracting[]>();
  for (const node of chain) {
    const key = node.parentId;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(node);
  }
  return byParent;
}

const emptyForm: SubcontractingNodeInput = { provider: "", country: "", description: "" };

function NodeForm({
  disabled, onSubmit, onCancel,
}: {
  disabled: boolean;
  onSubmit: (fields: SubcontractingNodeInput) => void;
  onCancel: () => void;
}) {
  const [fields, setFields] = useState<SubcontractingNodeInput>(emptyForm);

  return (
    <div className="mt-2 space-y-2 rounded-md border border-border-strong bg-graphite-950 p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <input value={fields.provider} disabled={disabled} placeholder="Sub-Anbieter"
          onChange={(e) => setFields({ ...fields, provider: e.target.value })}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50" />
        <input value={fields.country ?? ""} disabled={disabled} placeholder="Sitzstaat"
          onChange={(e) => setFields({ ...fields, country: e.target.value })}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50" />
        <input value={fields.description ?? ""} disabled={disabled} placeholder="Leistungsbeschreibung (optional)"
          onChange={(e) => setFields({ ...fields, description: e.target.value })}
          className="col-span-full rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50" />
      </div>
      <div className="flex gap-2">
        <Button className="px-2.5 py-1 text-xs" disabled={disabled || !fields.provider.trim()} onClick={() => onSubmit(fields)}>Speichern</Button>
        <Button variant="ghost" className="px-2.5 py-1 text-xs" onClick={onCancel} disabled={disabled}>Abbrechen</Button>
      </div>
    </div>
  );
}

function TreeNode({
  node, byParent, depth, arrangementId, canWrite,
}: {
  node: IctSubcontracting;
  byParent: Map<string | null, IctSubcontracting[]>;
  depth: number;
  arrangementId: string;
  canWrite: boolean;
}) {
  const children = byParent.get(node.id) ?? [];
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleAddChild(fields: SubcontractingNodeInput) {
    setError(null);
    startTransition(async () => {
      try {
        await addIctSubcontractingNode(arrangementId, node.id, fields);
        setAdding(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  function handleRemove() {
    setError(null);
    startTransition(async () => {
      try {
        await removeIctSubcontractingNode(arrangementId, node.id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Entfernen fehlgeschlagen.");
      }
    });
  }

  return (
    <div style={{ marginLeft: depth * 20 }} className="mt-2 first:mt-0">
      <div className="flex items-center gap-2 rounded-md border border-border-subtle bg-graphite-900/60 px-3 py-2">
        <span className="rounded bg-graphite-800 px-1.5 py-0.5 font-mono text-xs text-copper-300">Ebene {node.level}</span>
        <span className="text-sm text-foreground">{node.provider}</span>
        {node.country && <span className="text-xs text-muted-foreground">({node.country})</span>}
        <span className="ml-auto flex items-center gap-2">
          <StatusPill status={node.status.toLowerCase()} />
          {canWrite && node.status !== "ENTFERNT" && (
            <>
              <Button variant="ghost" className="px-2 py-0.5 text-xs" onClick={() => setAdding(!adding)} disabled={pending}>+ Sub-Anbieter</Button>
              <Button variant="ghost" className="px-2 py-0.5 text-xs text-status-danger" onClick={handleRemove} disabled={pending}>Entfernen</Button>
            </>
          )}
        </span>
      </div>
      {node.description && <p className="mt-1 pl-3 text-xs text-muted-foreground">{node.description}</p>}
      {error && <p className="mt-1 pl-3 text-xs text-status-danger">{error}</p>}

      {adding && <NodeForm disabled={pending} onSubmit={handleAddChild} onCancel={() => setAdding(false)} />}

      {children.map((child) => (
        <TreeNode key={child.id} node={child} byParent={byParent} depth={depth + 1} arrangementId={arrangementId} canWrite={canWrite} />
      ))}
    </div>
  );
}

// ITS-Ebene 6 (Durchführungsverordnung (EU) 2024/2956) — Weiterverlagerungskette eines einzelnen
// IKT-Vertragsverhältnisses. Gleiche Baumstruktur/UX wie WeiterverlagerungTree (AT 9), hier an ein
// IctArrangement statt eine OutsourcingActivity gehängt.
export function IctSubcontractingTree({
  arrangementId, chain, canWrite,
}: {
  arrangementId: string;
  chain: IctSubcontracting[];
  canWrite: boolean;
}) {
  const byParent = buildTree(chain.filter((n) => n.status !== "ENTFERNT"));
  const roots = byParent.get(null) ?? [];
  const [addingRoot, setAddingRoot] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleAddRoot(fields: SubcontractingNodeInput) {
    setError(null);
    startTransition(async () => {
      try {
        await addIctSubcontractingNode(arrangementId, null, fields);
        setAddingRoot(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-graphite-500">Weiterverlagerungskette</h4>
        {canWrite && (
          <Button variant="ghost" className="px-2 py-0.5 text-xs" onClick={() => setAddingRoot(!addingRoot)}>+ Sub-Anbieter</Button>
        )}
      </div>
      {addingRoot && <NodeForm disabled={pending} onSubmit={handleAddRoot} onCancel={() => setAddingRoot(false)} />}
      {error && <p className="mt-2 text-xs text-status-danger">{error}</p>}

      {roots.length === 0 && !addingRoot ? (
        <p className="mt-2 text-xs text-muted-foreground">Keine Weiterverlagerung erfasst.</p>
      ) : (
        roots.map((root) => (
          <TreeNode key={root.id} node={root} byParent={byParent} depth={0} arrangementId={arrangementId} canWrite={canWrite} />
        ))
      )}
    </div>
  );
}
