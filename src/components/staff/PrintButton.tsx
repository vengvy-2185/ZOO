"use client";

import { Printer } from "lucide-react";

export function PrintButton({ label }: { label: string }) {
  return (
    <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-full bg-[#1D4ED8] px-5 py-2.5 text-sm font-bold text-white shadow-soft print:hidden">
      <Printer size={16} /> {label}
    </button>
  );
}
