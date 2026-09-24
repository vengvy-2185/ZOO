// Shown instantly inside the admin shell (sidebar + top bar stay put) while
// the next admin page loads its data.
export default function AdminLoading() {
  return (
    <div className="animate-pulse p-8">
      <div className="mb-6 flex items-center gap-4">
        <div className="h-14 w-14 rounded-2xl bg-primary/15" />
        <div className="space-y-2">
          <div className="h-7 w-56 rounded-lg bg-black/[0.07]" />
          <div className="h-4 w-80 max-w-full rounded-lg bg-black/[0.05]" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-36 rounded-3xl bg-white shadow-soft ring-1 ring-black/[0.04]" />
        ))}
      </div>
    </div>
  );
}
