"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlarmClock, AlertTriangle } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { priorityVariant } from "@/components/deadlines/helpers";
import { api } from "@/lib/api";
import type { DeadlineBuckets } from "@/types";

/** Compact deadline alerts for the main dashboard (overdue + today). */
export function DeadlineAlertPanel() {
  const [buckets, setBuckets] = useState<DeadlineBuckets | null>(null);

  useEffect(() => {
    let active = true;
    api
      .deadlineBuckets()
      .then((b) => active && setBuckets(b))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  if (!buckets) return null;
  const alerts = [...buckets.overdue, ...buckets.today];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <AlarmClock className="h-4 w-4 text-brand" />
          <h2 className="text-base font-semibold text-slate-900">Deadline Alerts</h2>
        </div>
        <Link href="/dashboard/deadlines" className="text-xs font-medium text-brand hover:underline">
          View all
        </Link>
      </CardHeader>
      <CardContent className={alerts.length === 0 ? "" : "p-0"}>
        {alerts.length === 0 ? (
          <p className="text-sm text-slate-400">No overdue or due-today deadlines.</p>
        ) : (
          <ul className="divide-y divide-slate-50">
            {buckets.overdue.length > 0 && (
              <li className="flex items-center gap-2 bg-red-50 px-5 py-2 text-xs font-medium text-red-700">
                <AlertTriangle className="h-3.5 w-3.5" />
                {buckets.overdue.length} overdue
              </li>
            )}
            {alerts.slice(0, 6).map((d) => (
              <li key={d.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <span className="truncate text-slate-800">{d.title}</span>
                <div className="flex shrink-0 items-center gap-1.5 pl-3">
                  <span className="text-xs text-slate-400">
                    {new Date(d.due_date).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <Badge variant={priorityVariant[d.priority]}>{d.priority}</Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
