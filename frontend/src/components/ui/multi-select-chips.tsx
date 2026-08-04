"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Option {
  value: string;
  label: string;
}

interface MultiSelectChipsProps {
  options: Option[];
  value: string[];
  onChange: (next: string[]) => void;
  className?: string;
}

export function MultiSelectChips({ options, value, onChange, className }: MultiSelectChipsProps) {
  function toggle(optionValue: string) {
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue));
    } else {
      onChange([...value, optionValue]);
    }
  }

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {options.map((option) => {
        const active = value.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => toggle(option.value)}
            aria-pressed={active}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium capitalize ring-1 ring-inset transition-colors",
              active
                ? "bg-brand-50 text-brand-700 ring-brand-200 dark:bg-brand-500/10 dark:text-brand-300 dark:ring-brand-500/30"
                : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-400 dark:ring-slate-700 dark:hover:bg-slate-800",
            )}
          >
            {active && <Check className="h-3 w-3" />}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
