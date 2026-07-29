"use client";

import Link from "next/link";
import { CheckCircle2, FileText, XCircle } from "lucide-react";
import type { AISummary } from "@/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const urgencyStyles: Record<string, string> = {
  low: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400",
  medium: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400",
  high: "bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400",
  critical: "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400",
};

export function IntakeSummaryCard({
  summary,
  caseId,
}: {
  summary: AISummary;
  caseId: number | null;
}) {
  return (
    <Card className="mx-4 my-3 border-brand/20">
      <CardHeader className="flex flex-row items-center gap-2">
        <FileText className="h-4 w-4 text-brand" />
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Intake Summary</h3>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div>
          <p className="font-medium text-slate-900 dark:text-slate-100">{summary.title}</p>
          <p className="mt-1 text-slate-600 dark:text-slate-400">{summary.summary}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {summary.practice_area && (
            <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-medium capitalize text-brand">
              {summary.practice_area.replace(/_/g, " ")}
            </span>
          )}
          {summary.urgency && (
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                urgencyStyles[summary.urgency] ?? "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400",
              )}
            >
              {summary.urgency} urgency
            </span>
          )}
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
              summary.recommended
                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400",
            )}
          >
            {summary.recommended ? (
              <CheckCircle2 className="h-3 w-3" />
            ) : (
              <XCircle className="h-3 w-3" />
            )}
            {summary.recommended ? "Consultation recommended" : "Not recommended"}
          </span>
        </div>

        {summary.missing_information.length > 0 && (
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Missing information</p>
            <ul className="mt-1 list-inside list-disc text-xs text-slate-600 dark:text-slate-400">
              {summary.missing_information.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {caseId && (
          <Link
            href={`/dashboard/cases`}
            className="inline-block text-xs font-medium text-brand hover:underline"
          >
            View created case →
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
