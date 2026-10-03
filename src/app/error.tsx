"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="card mx-auto max-w-xl space-y-3 text-center">
      <div className="eyebrow">Something went wrong</div>
      <h1 className="display text-3xl">This page could not load</h1>
      <p className="break-words text-sm text-ink-400">
        {error.message && !error.message.startsWith("An error occurred in the Server Components render")
          ? error.message
          : "The server hit an error while loading this page. Check that the database and environment variables are set up."}
      </p>
      <button className="btn-primary" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
