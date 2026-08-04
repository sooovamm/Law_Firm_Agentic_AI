"use client";

import { Badge } from "@/components/ui/badge";
import { consultationStatusVariant, formatTime, toDateInput } from "@/components/scheduling/helpers";
import type { Consultation } from "@/types";
import { cn } from "@/lib/utils";

/** Return the Monday of the week containing `d`. */
function startOfWeek(d: Date): Date {
  const copy = new Date(d);
  const day = (copy.getDay() + 6) % 7; // Monday = 0
  copy.setDate(copy.getDate() - day);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function WeekCalendar({
  weekStart,
  consultations,
  onSelect,
}: {
  weekStart: Date;
  consultations: Consultation[];
  onSelect: (c: Consultation) => void;
}) {
  const monday = startOfWeek(weekStart);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });

  // Group consultations by local date key.
  const byDay = new Map<string, Consultation[]>();
  for (const c of consultations) {
    const key = toDateInput(new Date(c.scheduled_time));
    const list = byDay.get(key) ?? [];
    list.push(c);
    byDay.set(key, list);
  }

  const todayKey = toDateInput(new Date());

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-7">
      {days.map((d) => {
        const key = toDateInput(d);
        const items = (byDay.get(key) ?? []).sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time));
        const isToday = key === todayKey;
        return (
          <div
            key={key}
            className={cn(
              "min-h-[140px] rounded-2xl bg-white p-2 shadow-soft ring-1",
              isToday ? "ring-2 ring-brand-500" : "ring-slate-900/5 dark:ring-white/[0.06]",
              "dark:bg-slate-900",
            )}
          >
            <div className="mb-2 flex items-center justify-between">
              <span
                className={cn(
                  "text-xs font-semibold uppercase tracking-wide",
                  isToday ? "text-brand-600 dark:text-brand-400" : "text-slate-400 dark:text-slate-500",
                )}
              >
                {d.toLocaleDateString(undefined, { weekday: "short" })}
              </span>
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-sm font-medium",
                  isToday ? "bg-brand-600 text-white dark:bg-brand-500" : "text-slate-600 dark:text-slate-400",
                )}
              >
                {d.getDate()}
              </span>
            </div>
            <div className="space-y-1.5">
              {items.length === 0 ? (
                <p className="text-[11px] text-slate-300 dark:text-slate-600">—</p>
              ) : (
                items.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => onSelect(c)}
                    className="w-full rounded-lg bg-slate-50 px-2 py-1.5 text-left transition-colors hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800"
                  >
                    <p className="text-xs font-medium text-slate-900 dark:text-slate-100">{formatTime(c.scheduled_time)}</p>
                    <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">{c.client_name ?? "No client"}</p>
                    <Badge variant={consultationStatusVariant[c.status]} className="mt-1">
                      {c.status}
                    </Badge>
                  </button>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
