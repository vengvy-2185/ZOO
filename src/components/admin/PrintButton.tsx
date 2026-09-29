"use client";

import { Printer } from "lucide-react";

/** Opens the browser's print window (choose "Save as PDF" for a PDF). */
export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-full bg-[#176B3A] px-5 py-2.5 text-sm font-bold text-white">
      <Printer size={16} /> បោះពុម្ព / រក្សាទុកជា PDF
    </button>
  );
}
