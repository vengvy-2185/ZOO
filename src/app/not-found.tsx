import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-6 text-center">
      <p className="text-5xl">🦁</p>
      <h1 className="text-2xl font-bold">Animal not found.</h1>
      <p className="text-ink/60">The page or animal you're looking for doesn't exist or isn't on display.</p>
      <Link href="/" className="mt-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white">
        Back to Home
      </Link>
    </div>
  );
}
