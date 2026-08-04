import { Briefcase, Gauge, Percent, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { LawyerProfile } from "@/types";

function Tile({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  icon: typeof Briefcase;
  accent: string;
}) {
  return (
    <Card hoverable>
      <CardContent className="flex items-center justify-between py-5">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            {value}
          </p>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${accent}`}>
          <Icon className="h-5 w-5" strokeWidth={2} />
        </div>
      </CardContent>
    </Card>
  );
}

export function LawyerStatGrid({ profile }: { profile: LawyerProfile }) {
  const decided = profile.total_cases_won + profile.total_cases_lost;
  const successRate = decided > 0 ? Math.round((profile.total_cases_won / decided) * 100) : null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Tile
        label="Current Workload"
        value={`${profile.current_workload} / ${profile.weekly_capacity}`}
        icon={Briefcase}
        accent="bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"
      />
      <Tile
        label="Success Rate"
        value={successRate == null ? "—" : `${successRate}%`}
        icon={Percent}
        accent="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
      />
      <Tile
        label="Total Cases"
        value={String(profile.total_cases_handled)}
        icon={Gauge}
        accent="bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
      />
      <Tile
        label="AI Expertise Score"
        value={profile.expertise_score == null ? "—" : profile.expertise_score.toFixed(0)}
        icon={Sparkles}
        accent="bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
      />
    </div>
  );
}
