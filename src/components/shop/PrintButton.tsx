"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 font-bold text-white">
      <Printer size={18} /> Print / បោះពុម្ព
    </button>
  );
}
