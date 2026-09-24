"use client";

import { Printer } from "lucide-react";

export function PrintButton({ label }: { label: string }) {
  return (
    <button onClick={() => window.print()} className="btn-primary hover:translate-y-0">
      <Printer size={16} /> {label}
    </button>
  );
}
