"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, WifiOff, Home } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";

// Shown when a page couldn't load its data (usually the internet dropped
// while talking to the database). One tap retries.
export default function PageError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();
  const { locale } = useI18n();
  const km = locale === "km";

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="card max-w-md p-8 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-50 text-amber-600">
          <WifiOff size={30} />
        </span>
        <h1 className="mt-4 font-display text-2xl font-extrabold text-forest">{km ? "ការតភ្ជាប់យឺត ឬដាច់" : "Connection problem"}</h1>
        <p className="mt-2 text-sm text-ink/60">
          {km ? "មិនអាចទាញយកទិន្នន័យបានទេ។ សូមពិនិត្យអ៊ីនធឺណិត ហើយចុច «សាកម្តងទៀត»។" : "We couldn't load this page's data. Check the internet connection and try again."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              reset();
              router.refresh();
            }}
            className="btn-primary hover:translate-y-0"
          >
            <RefreshCw size={16} /> {km ? "សាកម្តងទៀត" : "Try again"}
          </button>
          <a href="/" className="btn-outline bg-white">
            <Home size={16} /> {km ? "ទំព័រដើម" : "Home"}
          </a>
        </div>
      </div>
    </div>
  );
}
