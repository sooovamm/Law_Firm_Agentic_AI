"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, LayoutList, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DeadlineBucketsView } from "@/components/deadlines/bucket-view";
import { DeadlineCalendar } from "@/components/deadlines/calendar";
import { AddDeadlineDialog } from "@/components/deadlines/add-deadline-dialog";
import { api, ApiError } from "@/lib/api";
import type { CaseListItem, Deadline, DeadlineBuckets } from "@/types";
import { cn } from "@/lib/utils";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function DeadlinesPage() {
  const [view, setView] = useState<"list" | "calendar">("list");
  const [buckets, setBuckets] = useState<DeadlineBuckets | null>(null);
  const [calendarItems, setCalendarItems] = useState<Deadline[]>([]);
  const [cases, setCases] = useState<CaseListItem[]>([]);
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBuckets = useCallback(async () => {
    try {
      setBuckets(await api.deadlineBuckets());
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to load deadlines");
    }
  }, []);

  const loadCalendar = useCallback(async () => {
    const start = new Date(cursor.year, cursor.month, 1);
    const end = new Date(cursor.year, cursor.month + 1, 1);
    try {
      setCalendarItems(await api.deadlineCalendar(start.toISOString(), end.toISOString()));
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to load calendar");
    }
  }, [cursor]);

  useEffect(() => {
    loadBuckets();
  }, [loadBuckets]);

  useEffect(() => {
    if (view === "calendar") loadCalendar();
  }, [view, loadCalendar]);

  useEffect(() => {
    api.listCasesFiltered().then(setCases).catch(() => setCases([]));
  }, []);

  async function toggleComplete(d: Deadline) {
    try {
      await api.updateDeadline(d.id, { completed: !d.completed });
      await loadBuckets();
      if (view === "calendar") await loadCalendar();
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to update deadline");
    }
  }

  function shiftMonth(delta: number) {
    setCursor((c) => {
      const d = new Date(c.year, c.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }

  function refreshAll() {
    loadBuckets();
    if (view === "calendar") loadCalendar();
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Court Deadlines</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            AI-extracted from documents and emails, plus anything you add.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg bg-slate-100 dark:bg-slate-800 p-1">
            <button
              onClick={() => setView("list")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                view === "list" ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm" : "text-slate-600 dark:text-slate-400",
              )}
            >
              <LayoutList className="h-4 w-4" />
              Alerts
            </button>
            <button
              onClick={() => setView("calendar")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                view === "calendar" ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm" : "text-slate-600 dark:text-slate-400",
              )}
            >
              Calendar
            </button>
          </div>
          <Button onClick={() => setAdding(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-400">{error}</div>
      )}

      {view === "list" ? (
        buckets ? (
          <DeadlineBucketsView
            overdue={buckets.overdue}
            today={buckets.today}
            upcoming={buckets.upcoming}
            onToggleComplete={toggleComplete}
          />
        ) : (
          <Card>
            <CardContent className="py-16 text-center text-sm text-slate-500 dark:text-slate-400">
              Loading deadlines...
            </CardContent>
          </Card>
        )
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => shiftMonth(-1)} aria-label="Previous month">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-[160px] text-center text-sm font-medium text-slate-700 dark:text-slate-300">
                {MONTHS[cursor.month]} {cursor.year}
              </span>
              <Button variant="ghost" onClick={() => shiftMonth(1)} aria-label="Next month">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button
              variant="secondary"
              onClick={() => {
                const now = new Date();
                setCursor({ year: now.getFullYear(), month: now.getMonth() });
              }}
            >
              Today
            </Button>
          </div>
          <DeadlineCalendar
            year={cursor.year}
            month={cursor.month}
            deadlines={calendarItems}
          />
        </div>
      )}

      {adding && (
        <AddDeadlineDialog
          cases={cases}
          onClose={() => setAdding(false)}
          onCreated={refreshAll}
        />
      )}
    </div>
  );
}
