"use client";

import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { priorityVariant, toDateKey } from "@/components/deadlines/helpers";
import type { Deadline } from "@/types";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Build the 6-week grid (Mon-start) covering the given month. */
function monthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7; // Monday = 0
  const start = new Date(year, month, 1 - startOffset);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

export function DeadlineCalendar({
  year,
  month,
  deadlines,
  onSelectDay,
}: {
  year: number;
  month: number;
  deadlines: Deadline[];
  onSelectDay?: (key: string) => void;
}) {
  const days = useMemo(() => monthGrid(year, month), [year, month]);
  const todayKey = toDateKey(new Date());

  const byDay = useMemo(() => {
    const map = new Map<string, Deadline[]>();
    for (const d of deadlines) {
      const key = toDateKey(new Date(d.due_date));
      const list = map.get(key) ?? [];
      list.push(d);
      map.set(key, list);
    }
    return map;
  }, [deadlines]);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50">
        {WEEKDAYS.map((w) => (
          <div key={w} className="px-2 py-2 text-center text-xs font-semibold uppercase text-slate-400">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d, i) => {
          const key = toDateKey(d);
          const inMonth = d.getMonth() === month;
          const items = byDay.get(key) ?? [];
          const isToday = key === todayKey;
          return (
            <button
              key={i}
              onClick={() => onSelectDay?.(key)}
              className={cn(
                "min-h-[92px] border-b border-r border-slate-100 p-1.5 text-left align-top transition-colors hover:bg-slate-50",
                !inMonth && "bg-slate-50/50",
              )}
            >
              <span
                className={cn(
                  "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs",
                  isToday ? "bg-brand font-semibold text-white" : "text-slate-500",
                  !inMonth && "text-slate-300",
                )}
              >
                {d.getDate()}
              </span>
              <div className="mt-1 space-y-1">
                {items.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      "truncate rounded px-1 py-0.5 text-[10px] font-medium",
                      item.completed ? "bg-slate-100 text-slate-400 line-through" : "bg-brand/10 text-brand",
                    )}
                    title={item.title}
                  >
                    {item.title}
                  </div>
                ))}
                {items.length > 3 && (
                  <p className="px-1 text-[10px] text-slate-400">+{items.length - 3} more</p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
