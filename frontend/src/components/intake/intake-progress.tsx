"use client";

import { Check } from "lucide-react";
import type { IntakeStage } from "@/types";
import { cn } from "@/lib/utils";

const STEPS: { key: IntakeStage; label: string }[] = [
  { key: "greeting", label: "Greeting" },
  { key: "practice_area_detection", label: "Practice Area" },
  { key: "information_collection", label: "Details" },
  { key: "lead_qualification", label: "Qualification" },
  { key: "generate_summary", label: "Summary" },
  { key: "finished", label: "Done" },
];

// Map every backend stage onto a visible step index.
const STAGE_INDEX: Record<IntakeStage, number> = {
  greeting: 0,
  practice_area_detection: 1,
  information_collection: 2,
  lead_qualification: 3,
  generate_summary: 4,
  create_case: 4,
  finished: 5,
};

export function IntakeProgress({ stage }: { stage: IntakeStage }) {
  const current = STAGE_INDEX[stage] ?? 0;

  return (
    <div className="flex items-center gap-1">
      {STEPS.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={step.key} className="flex items-center gap-1">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full border text-xs font-medium transition-colors",
                  done && "border-brand bg-brand text-white",
                  active && "border-brand bg-brand/10 text-brand",
                  !done && !active && "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500",
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span
                className={cn(
                  "hidden text-[10px] font-medium sm:block",
                  active ? "text-brand" : "text-slate-400 dark:text-slate-500",
                )}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "mb-4 h-0.5 w-4 sm:w-8",
                  i < current ? "bg-brand" : "bg-slate-200 dark:bg-slate-700",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
