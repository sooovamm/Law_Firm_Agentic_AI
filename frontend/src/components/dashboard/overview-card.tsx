import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface OverviewCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  accent?: string;
  loading?: boolean;
}

export function OverviewCard({
  label,
  value,
  icon: Icon,
  accent = "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400",
  loading,
}: OverviewCardProps) {
  return (
    <Card hoverable className="animate-slide-up">
      <CardContent className="flex items-center justify-between py-5">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
          {loading ? (
            <div className="mt-2 h-8 w-14 animate-pulse rounded-md bg-slate-200 dark:bg-slate-800" />
          ) : (
            <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">{value}</p>
          )}
        </div>
        <div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl", accent)}>
          <Icon className="h-5 w-5" strokeWidth={2} />
        </div>
      </CardContent>
    </Card>
  );
}
