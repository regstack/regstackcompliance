"use client";

import { useState, useTransition } from "react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import {
  addWeiterverlagerungNode,
  removeWeiterverlagerungNode,
  updateWeiterverlagerungNode,
  type ChainNodeInput,
} from "@/app/(app)/outsourcing/actions";
import type { WeiterverlagerungNode } from "@/lib/regstack/outsourcing";

function buildTree(kette: WeiterverlagerungNode[]) {
  const byParent = new Map<string | null, WeiterverlagerungNode[]>();
  for (const node of kette) {
    const key = node.parentId;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(node);
  }
  return byParent;
}

const emptyForm: ChainNodeInput = { provider: "", country: "", description: "" };

function NodeForm({
  initial,
  disabled,
  onSubmit,
  onCancel,
}: {
  initial: ChainNodeInput;
  disabled: boolean;
  onSubmit: (fields: ChainNodeInput) => void;
  onCancel: () => void;
}) {
  const [fields, setFields] = useState<ChainNodeInput>(initial);

  return (
    <div className="mt-2 space-y-2 rounded-md border border-border-strong bg-graphite-950 p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          value={fields.provider}
          disabled={disabled}
          placeholder="Sub-Anbieter"
          onChange={(e) => setFields({ ...fields, provider: e.target.value })}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50"
        />
        <input
          value={fields.country ?? ""}
          disabled={disabled}
          placeholder="Sitzstaat"
          onChange={(e) => setFields({ ...fields, country: e.target.value })}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50"
        />
        <input
          value={fields.description ?? ""}
          disabled={disabled}
          placeholder="Leistungsbeschreibung (optional)"
          onChange={(e) => setFields({ ...fields, description: e.target.value })}
          className="col-span-full rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50"
        />
      </div>
      <div className="flex gap-2">
        <Button className="px-2.5 py-1 text-xs" disabled={disabled || !fields.provider.trim()} onClick={() => onSubmit(fields)}>
          Speichern
        </Button>
        <Button variant="ghost" className="px-2.5 py-1 text-xs" onClick={onCancel} disabled={disabled}>
          Abbrechen
        </Button>
      </div>
    </div>
  );
}

function TreeNode({
  node,
  byParent,
  depth,
  activityId,
  canWrite,
}: {
  node: WeiterverlagerungNode;
  byParent: Map<string | null, WeiterverlagerungNode[]>;
  depth: number;
  activityId: string;
  canWrite: boolean;
}) {
  const children = byParent.get(node.id) ?? [];
  const [mode, setMode] = useState<"none" | "edit" | "add-child">("none");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleEdit(fields: ChainNodeInput) {
    setError(null);
    startTransition(async () => {
      try {
        await updateWeiterverlagerungNode(node.id, activityId, fields);
        setMode("none");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  function handleAddChild(fields: ChainNodeInput) {
    setError(null);
    startTransition(async () => {
      try {
        await addWeiterverlagerungNode(activityId, node.id, fields);
        setMode("none");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  function handleRemove() {
    setError(null);
    startTransition(async () => {
      try {
        await removeWeiterverlagerungNode(activityId, node.id);
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
              <Button variant="ghost" className="px-2 py-0.5 text-xs" onClick={() => setMode(mode === "edit" ? "none" : "edit")} disabled={pending}>
                Bearbeiten
              </Button>
              <Button variant="ghost" className="px-2 py-0.5 text-xs" onClick={() => setMode(mode === "add-child" ? "none" : "add-child")} disabled={pending}>
                + Sub-Anbieter
              </Button>
              <Button variant="ghost" className="px-2 py-0.5 text-xs text-status-danger" onClick={handleRemove} disabled={pending}>
                Entfernen
              </Button>
            </>
          )}
        </span>
      </div>
      {node.description && <p className="mt-1 pl-3 text-xs text-muted-foreground">{node.description}</p>}
      {error && <p className="mt-1 pl-3 text-xs text-status-danger">{error}</p>}

      {mode === "edit" && (
        <NodeForm
          initial={{ provider: node.provider, country: node.country ?? "", description: node.description ?? "" }}
          disabled={pending}
          onSubmit={handleEdit}
          onCancel={() => setMode("none")}
        />
      )}
      {mode === "add-child" && (
        <NodeForm initial={emptyForm} disabled={pending} onSubmit={handleAddChild} onCancel={() => setMode("none")} />
      )}

      {children.map((child) => (
        <TreeNode key={child.id} node={child} byParent={byParent} depth={depth + 1} activityId={activityId} canWrite={canWrite} />
      ))}
    </div>
  );
}

export function WeiterverlagerungTree({
  activityId,
  kette,
  canWrite,
}: {
  activityId: string;
  kette: WeiterverlagerungNode[];
  canWrite: boolean;
}) {
  const byParent = buildTree(kette.filter((n) => n.status !== "ENTFERNT"));
  const roots = byParent.get(null) ?? [];
  const [addingRoot, setAddingRoot] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleAddRoot(fields: ChainNodeInput) {
    setError(null);
    startTransition(async () => {
      try {
        await addWeiterverlagerungNode(activityId, null, fields);
        setAddingRoot(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weiterverlagerungskette (AT 9 Tz. 8/11)</CardTitle>
        {canWrite && (
          <Button variant="secondary" className="px-2.5 py-1 text-xs" onClick={() => setAddingRoot(!addingRoot)}>
            + Sub-Anbieter
          </Button>
        )}
      </CardHeader>
      <CardBody>
        {addingRoot && (
          <NodeForm initial={emptyForm} disabled={pending} onSubmit={handleAddRoot} onCancel={() => setAddingRoot(false)} />
        )}
        {error && <p className="mt-2 text-xs text-status-danger">{error}</p>}

        {roots.length === 0 && !addingRoot ? (
          <p className="text-sm text-muted-foreground">
            Keine Weiterverlagerung erfasst — diese Auslagerung hat keine Sub-Anbieter.
          </p>
        ) : (
          roots.map((root) => (
            <TreeNode key={root.id} node={root} byParent={byParent} depth={0} activityId={activityId} canWrite={canWrite} />
          ))
        )}
      </CardBody>
    </Card>
  );
}
