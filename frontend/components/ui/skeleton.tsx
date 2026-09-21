export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-graphite-800 ${className}`} />;
}

/** Generic loading placeholder for a page built out of stacked cards (the common shape across
 * Outsourcing/Compliance/Interne Revision list and detail pages). */
export function CardListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Lädt…" className="space-y-3">
      <Skeleton className="h-7 w-64" />
      <Skeleton className="mb-3 h-4 w-96 max-w-full" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-border-subtle bg-surface-raised p-5">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="mt-3 h-3 w-2/3" />
          <Skeleton className="mt-2 h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}
