"use client";

import { Label } from "@/components/ui/input";
import { formatTime } from "@/components/scheduling/helpers";
import type { AvailableSlot } from "@/types";
import { cn } from "@/lib/utils";

/** The available-slot grid shared by the booking and reschedule dialogs. */
export function SlotPicker({
  slots,
  selected,
  onSelect,
  loading,
  emptyHint,
}: {
  slots: AvailableSlot[];
  selected: string | null;
  onSelect: (start: string) => void;
  loading: boolean;
  emptyHint?: string;
}) {
  return (
    <div>
      <Label>Available slots</Label>
      {emptyHint ? (
        <p className="text-sm text-slate-400 dark:text-slate-500">{emptyHint}</p>
      ) : loading ? (
        <p className="text-sm text-slate-400 dark:text-slate-500">Loading slots...</p>
      ) : slots.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-slate-500">No open slots for this day.</p>
      ) : (
        <div className="grid max-h-40 grid-cols-4 gap-2 overflow-y-auto">
          {slots.map((s) => (
            <button
              key={s.start}
              onClick={() => onSelect(s.start)}
              className={cn(
                "rounded-lg border px-2 py-1.5 text-sm transition-colors",
                selected === s.start
                  ? "border-brand-600 bg-brand-600 text-white dark:border-brand-500 dark:bg-brand-500"
                  : "border-slate-200 text-slate-700 hover:border-brand-400 hover:text-brand-700 dark:border-slate-700 dark:text-slate-300 dark:hover:border-brand-500/50 dark:hover:text-brand-400",
              )}
            >
              {formatTime(s.start)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
