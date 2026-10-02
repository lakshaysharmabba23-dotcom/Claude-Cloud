export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg py-20 text-center">
      <h1 className="display text-4xl">Page not found</h1>
      <p className="mt-2 text-sm text-ink-400">
        The page you&apos;re looking for doesn&apos;t exist. Try the{" "}
        <a href="/dashboard" className="text-accent-400 hover:underline">
          dashboard
        </a>
        .
      </p>
    </div>
  );
}
