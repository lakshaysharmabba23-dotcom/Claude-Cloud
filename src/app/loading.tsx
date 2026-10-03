export default function Loading() {
  return (
    <div className="space-y-4" role="status" aria-live="polite">
      <div className="h-4 w-32 animate-pulse rounded bg-ink-800" />
      <div className="h-10 w-72 animate-pulse rounded bg-ink-800" />
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="h-28 animate-pulse rounded-xl bg-ink-800" />
        <div className="h-28 animate-pulse rounded-xl bg-ink-800" />
        <div className="h-28 animate-pulse rounded-xl bg-ink-800" />
      </div>
      <span className="sr-only">Loading...</span>
    </div>
  );
}
