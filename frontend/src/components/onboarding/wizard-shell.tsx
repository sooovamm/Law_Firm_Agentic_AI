"use client";

import { type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import { ProgressBar } from "@/components/ui/progress-bar";
import { cn } from "@/lib/utils";

export const STEP_LABELS = [
  "Basic Information",
  "Professional Information",
  "Experience",
  "Work Preferences",
  "Review",
];

interface WizardShellProps {
  step: number;
  saving?: boolean;
  children: ReactNode;
}

export function WizardShell({ step, saving, children }: WizardShellProps) {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Lawyer Onboarding
          </h1>
          <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
            {saving ? "Saving draft..." : "Draft saved"}
          </span>
        </div>
        <ProgressBar value={step + 1} max={STEP_LABELS.length} />
        <div className="hidden items-center justify-between sm:flex">
          {STEP_LABELS.map((label, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <div key={label} className="flex flex-1 items-center gap-2 last:flex-none">
                <div
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium",
                    done && "border-brand-600 bg-brand-600 text-white dark:border-brand-500 dark:bg-brand-500",
                    active &&
                      "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300",
                    !done &&
                      !active &&
                      "border-slate-200 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-500",
                  )}
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </div>
                <span
                  className={cn(
                    "truncate text-xs font-medium",
                    active ? "text-brand-600 dark:text-brand-400" : "text-slate-400 dark:text-slate-500",
                  )}
                >
                  {label}
                </span>
                {i < STEP_LABELS.length - 1 && (
                  <div className="mx-1 h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.2 }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
