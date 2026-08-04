"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlarmClock, AlertTriangle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ListRow, ListRowTitle } from "@/components/ui/list-row";
import { priorityVariant } from "@/components/deadlines/helpers";
import { formatShortDate } from "@/lib/date";
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
          <AlarmClock className="h-4 w-4 text-brand-600 dark:text-brand-400" />
          <CardTitle>Deadline Alerts</CardTitle>
        </div>
        <Link href="/dashboard/deadlines" className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400">
          View all
        </Link>
      </CardHeader>
      <CardContent className={alerts.length === 0 ? "" : "p-0"}>
        {alerts.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">No overdue or due-today deadlines.</p>
        ) : (
          <div className="divide-y divide-slate-50 dark:divide-slate-800/60">
            {buckets.overdue.length > 0 && (
              <div className="flex items-center gap-2 bg-rose-50 px-5 py-2 text-xs font-medium text-rose-700 dark:bg-rose-500/10 dark:text-rose-400">
                <AlertTriangle className="h-3.5 w-3.5" />
                {buckets.overdue.length} overdue
              </div>
            )}
            {alerts.slice(0, 6).map((d) => (
              <ListRow
                key={d.id}
                trailing={
                  <>
                    <span className="text-xs text-slate-400 dark:text-slate-500">{formatShortDate(d.due_date)}</span>
                    <Badge variant={priorityVariant[d.priority]}>{d.priority}</Badge>
                  </>
                }
              >
                <ListRowTitle className="font-normal text-slate-800 dark:text-slate-200">{d.title}</ListRowTitle>
              </ListRow>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
