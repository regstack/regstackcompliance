// Pure tree-walk helper, kept separate from the route so the descendant-cascade logic behind
// "remove a Weiterverlagerung node" is unit-testable without a database.

export type TreeNode = { id: string; parentId: string | null };

/** Returns nodeId plus every descendant of it (any depth), computed from the activity's own
 * records — never from a client-supplied id list, so a stale/tampered UI tree can't widen or
 * narrow what actually gets soft-deleted. */
export function collectRemovalIds(nodeId: string, nodes: TreeNode[]): string[] {
  const byParent = new Map<string | null, TreeNode[]>();
  for (const n of nodes) {
    const key = n.parentId;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(n);
  }

  const ids: string[] = [nodeId];
  const collect = (parentId: string) => {
    for (const child of byParent.get(parentId) ?? []) {
      ids.push(child.id);
      collect(child.id);
    }
  };
  collect(nodeId);
  return ids;
}
