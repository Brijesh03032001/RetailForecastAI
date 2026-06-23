import { Lightbulb } from "lucide-react";
import type { ReactNode } from "react";

export function Insight({ children }: { children: ReactNode }) {
  return (
    <div className="mt-4 flex items-start gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-neutral-300">
      <Lightbulb className="mt-0.5 size-4 shrink-0 text-amber-300" aria-hidden />
      <span>{children}</span>
    </div>
  );
}
