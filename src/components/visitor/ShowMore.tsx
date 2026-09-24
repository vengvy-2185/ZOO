"use client";

import { Children, useState } from "react";
import { ChevronDown } from "lucide-react";

/** Shows the first `step` items, then more each time the button is pressed. `label` may contain {n} (items left). */
export function ShowMore({ children, step = 24, label, className }: { children: React.ReactNode; step?: number; label: string; className?: string }) {
  const items = Children.toArray(children);
  const [shown, setShown] = useState(step);
  const left = items.length - shown;
  return (
    <>
      <div className={className}>{items.slice(0, shown)}</div>
      {left > 0 && (
        <div className="mt-6 flex justify-center">
          <button onClick={() => setShown((n) => n + step)} className="btn-outline bg-white px-6 py-3 text-base shadow-soft">
            <ChevronDown size={18} /> {label.replace("{n}", String(left))}
          </button>
        </div>
      )}
    </>
  );
}
