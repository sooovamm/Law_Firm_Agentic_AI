"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SkeletonRow } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DeadlineBucketsView } from "@/components/deadlines/bucket-view";
import { DeadlineCalendar } from "@/components/deadlines/calendar";
import { AddDeadlineDialog } from "@/components/deadlines/add-deadline-dialog";
import { api, ApiError } from "@/lib/api";
import type { CaseListItem, Deadline, DeadlineBuckets } from "@/types";

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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Court Deadlines</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            AI-extracted from documents and emails, plus anything you add.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={view} onValueChange={(v) => setView(v as "list" | "calendar")}>
            <TabsList>
              <TabsTrigger value="list">Alerts</TabsTrigger>
              <TabsTrigger value="calendar">Calendar</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/20">
          {error}
        </div>
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
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <CardContent className="p-0">
                  <SkeletonRow />
                  <SkeletonRow />
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => shiftMonth(-1)} aria-label="Previous month">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-[160px] text-center text-sm font-medium text-slate-700 dark:text-slate-300">
                {MONTHS[cursor.month]} {cursor.year}
              </span>
              <Button variant="ghost" size="icon" onClick={() => shiftMonth(1)} aria-label="Next month">
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
          <DeadlineCalendar year={cursor.year} month={cursor.month} deadlines={calendarItems} />
        </div>
      )}

      {adding && <AddDeadlineDialog cases={cases} onClose={() => setAdding(false)} onCreated={refreshAll} />}
    </div>
  );
}
