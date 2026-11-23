/** Shown inside the account shell while a page reads the customer session and its data, so moving between account pages is instant. */
export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      <div className="h-4 w-24 animate-pulse rounded bg-paper" />
      <div className="h-9 w-64 animate-pulse rounded bg-paper" />
      <div className="h-48 animate-pulse rounded bg-paper" />
      <div className="h-32 animate-pulse rounded bg-paper" />
    </div>
  );
}
