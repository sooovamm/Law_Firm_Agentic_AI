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
  accent = "text-brand",
  loading,
}: OverviewCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between py-6">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          {loading ? (
            <div className="mt-2 h-8 w-14 animate-pulse rounded bg-slate-200" />
          ) : (
            <p className="mt-1 text-3xl font-semibold text-slate-900">{value}</p>
          )}
        </div>
        <div className={cn("rounded-full bg-slate-50 p-3", accent)}>
          <Icon className="h-6 w-6" />
        </div>
      </CardContent>
    </Card>
  );
}
