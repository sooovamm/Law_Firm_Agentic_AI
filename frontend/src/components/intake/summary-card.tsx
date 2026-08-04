"use client";

import Link from "next/link";
import { CheckCircle2, FileText, Sparkles, XCircle } from "lucide-react";
import type { AISummary, CaseUrgency, LawyerMatchRecommendation } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { urgencyVariant } from "@/components/dashboard/badges";
import { cn } from "@/lib/utils";

export function IntakeSummaryCard({
  summary,
  caseId,
  lawyerMatch,
}: {
  summary: AISummary;
  caseId: number | null;
  lawyerMatch?: LawyerMatchRecommendation | null;
}) {
  return (
    <Card className="mx-4 my-3 animate-slide-up ring-brand-100 dark:ring-brand-500/20">
      <CardHeader className="flex flex-row items-center gap-2">
        <FileText className="h-4 w-4 text-brand-600 dark:text-brand-400" />
        <CardTitle className="text-sm">Intake Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div>
          <p className="font-medium text-slate-900 dark:text-slate-100">{summary.title}</p>
          <p className="mt-1 text-slate-600 dark:text-slate-400">{summary.summary}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {summary.practice_area && <Badge variant="brand">{summary.practice_area.replace(/_/g, " ")}</Badge>}
          {summary.urgency && (
            <Badge variant={urgencyVariant[summary.urgency as CaseUrgency] ?? "default"}>
              {summary.urgency} urgency
            </Badge>
          )}
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
              summary.recommended
                ? "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20"
                : "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700",
            )}
          >
            {summary.recommended ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
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

        {lawyerMatch && (
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/40">
            <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
              <Sparkles className="h-3.5 w-3.5 text-brand-500" />
              AI lawyer match
            </p>
            {lawyerMatch.recommended_lawyer_id ? (
              <>
                <p className="mt-1 text-sm text-slate-900 dark:text-slate-100">
                  Recommended lawyer #{lawyerMatch.recommended_lawyer_id} · score{" "}
                  {lawyerMatch.match_score}
                  <Link
                    href={`/dashboard/lawyers/${lawyerMatch.recommended_lawyer_id}`}
                    className="ml-2 text-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
                  >
                    View profile
                  </Link>
                </p>
                {lawyerMatch.reasoning.length > 0 && (
                  <ul className="mt-1 list-inside list-disc text-xs text-slate-600 dark:text-slate-400">
                    {lawyerMatch.reasoning.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                {lawyerMatch.reasoning[0] ?? "No lawyer currently qualifies for this matter."}
              </p>
            )}
          </div>
        )}

        {caseId && (
          <Link
            href={`/dashboard/cases`}
            className="inline-block text-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
          >
            View created case →
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
