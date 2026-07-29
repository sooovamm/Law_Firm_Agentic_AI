"use client";

import { AlertTriangle, CalendarClock, CheckCircle2, Clock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  formatDeadlineDate,
  priorityVariant,
  typeVariant,
} from "@/components/deadlines/helpers";
import type { Deadline } from "@/types";
import { cn } from "@/lib/utils";

export function DeadlineRow({
  deadline,
  onToggleComplete,
}: {
  deadline: Deadline;
  onToggleComplete?: (d: Deadline) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-3">
      <div className="flex min-w-0 items-center gap-3">
        {onToggleComplete && (
          <button
            onClick={() => onToggleComplete(deadline)}
            className={cn(
              "shrink-0 rounded-full border p-0.5 transition-colors",
              deadline.completed
                ? "border-emerald-500 text-emerald-500 dark:text-emerald-400"
                : "border-slate-300 dark:border-slate-600 text-transparent hover:border-brand",
            )}
            title={deadline.completed ? "Mark incomplete" : "Mark complete"}
          >
            <CheckCircle2 className="h-4 w-4" />
          </button>
        )}
        <div className="min-w-0">
          <p
            className={cn(
              "truncate text-sm font-medium",
              deadline.completed ? "text-slate-400 dark:text-slate-500 line-through" : "text-slate-900 dark:text-slate-100",
            )}
          >
            {deadline.title}
          </p>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
            {formatDeadlineDate(deadline.due_date)}
            {deadline.case_title ? ` · ${deadline.case_title}` : ""}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <Badge variant={typeVariant[deadline.deadline_type]}>{deadline.deadline_type}</Badge>
        <Badge variant={priorityVariant[deadline.priority]}>{deadline.priority}</Badge>
      </div>
    </div>
  );
}

function BucketCard({
  title,
  icon: Icon,
  accent,
  deadlines,
  onToggleComplete,
}: {
  title: string;
  icon: typeof Clock;
  accent: string;
  deadlines: Deadline[];
  onToggleComplete: (d: Deadline) => void;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={cn("h-4 w-4", accent)} />
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
        </div>
        <span className="text-sm font-medium text-slate-400 dark:text-slate-500">{deadlines.length}</span>
      </CardHeader>
      <CardContent className="p-0">
        {deadlines.length === 0 ? (
          <p className="px-5 pb-4 text-sm text-slate-400 dark:text-slate-500">Nothing here.</p>
        ) : (
          <ul className="divide-y divide-slate-50 dark:divide-slate-900">
            {deadlines.map((d) => (
              <li key={d.id}>
                <DeadlineRow deadline={d} onToggleComplete={onToggleComplete} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function DeadlineBucketsView({
  overdue,
  today,
  upcoming,
  onToggleComplete,
}: {
  overdue: Deadline[];
  today: Deadline[];
  upcoming: Deadline[];
  onToggleComplete: (d: Deadline) => void;
}) {
  return (
    <div className="space-y-4">
      {overdue.length > 0 && (
        <div className="flex items-center gap-2 rounded-md bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          <AlertTriangle className="h-4 w-4" />
          You have {overdue.length} overdue deadline{overdue.length === 1 ? "" : "s"} needing attention.
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <BucketCard
          title="Overdue"
          icon={AlertTriangle}
          accent="text-red-600 dark:text-red-400"
          deadlines={overdue}
          onToggleComplete={onToggleComplete}
        />
        <BucketCard
          title="Today"
          icon={Clock}
          accent="text-amber-600 dark:text-amber-400"
          deadlines={today}
          onToggleComplete={onToggleComplete}
        />
        <BucketCard
          title="Upcoming"
          icon={CalendarClock}
          accent="text-brand"
          deadlines={upcoming}
          onToggleComplete={onToggleComplete}
        />
      </div>
    </div>
  );
}
