import Link from "next/link";
import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Sparkles } from "lucide-react";
import type { LawyerMatchHistoryItem } from "@/types";

export function LawyerMatchHistory({
  history,
  actions,
}: {
  history: LawyerMatchHistoryItem[];
  actions?: (item: LawyerMatchHistoryItem) => ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Match History</CardTitle>
        <CardDescription>Every AI recommendation involving this lawyer.</CardDescription>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="No AI matches yet"
            description="Recommendations from the intake agent will appear here."
          />
        ) : (
          <ul className="divide-y divide-slate-50 dark:divide-slate-800/60">
            {history.map((item) => (
              <li key={item.id} className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="brand">Score {item.match_score}</Badge>
                    {item.was_overridden && <Badge variant="warning">Overridden</Badge>}
                    {item.case_id != null && (
                      <Link
                        href={`/dashboard/cases/${item.case_id}`}
                        className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
                      >
                        View case
                      </Link>
                    )}
                  </div>
                  {actions?.(item)}
                </div>
                <ul className="list-inside list-disc text-sm text-slate-600 dark:text-slate-400">
                  {item.reasoning.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
