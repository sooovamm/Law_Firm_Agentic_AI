"use client";

import { useEffect, useState } from "react";
import { Briefcase, CheckCircle2, CalendarCheck, UserPlus } from "lucide-react";

import { OverviewCard } from "@/components/dashboard/overview-card";
import { PracticeAreaChart, StatusChart } from "@/components/dashboard/charts";
import {
  RecentActivityPanel,
  RecentDocumentsPanel,
  UpcomingConsultationsPanel,
  UpcomingEventsPanel,
  UrgentCasesPanel,
} from "@/components/dashboard/panels";
import { DeadlineAlertPanel } from "@/components/dashboard/deadline-alert-panel";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import type { DashboardOverview } from "@/types";

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const overview = await api.dashboardOverview();
        if (active) setData(overview);
      } catch (err) {
        if (active) setError(err instanceof ApiError ? err.detail : "Failed to load dashboard");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  const cards = data?.cards;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Welcome back, {user?.full_name.split(" ")[0]}
        </h1>
        <p className="text-sm text-slate-500">Your firm at a glance.</p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <OverviewCard
          label="Open Cases"
          value={cards?.open_cases ?? 0}
          icon={Briefcase}
          accent="text-brand"
          loading={loading}
        />
        <OverviewCard
          label="Closed Cases"
          value={cards?.closed_cases ?? 0}
          icon={CheckCircle2}
          accent="text-slate-500"
          loading={loading}
        />
        <OverviewCard
          label="New Clients"
          value={cards?.new_clients ?? 0}
          icon={UserPlus}
          accent="text-emerald-600"
          loading={loading}
        />
        <OverviewCard
          label="Today's Consultations"
          value={cards?.todays_consultations ?? 0}
          icon={CalendarCheck}
          accent="text-amber-600"
          loading={loading}
        />
      </div>

      {data && (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <PracticeAreaChart data={data.charts.cases_by_practice_area} />
            <StatusChart data={data.charts.cases_by_status} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <UrgentCasesPanel items={data.urgent_cases} />
            <DeadlineAlertPanel />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <UpcomingConsultationsPanel items={data.upcoming_consultations} />
            <UpcomingEventsPanel items={data.upcoming_events} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <RecentActivityPanel items={data.recent_activity} />
            <RecentDocumentsPanel items={data.recent_documents} />
          </div>
        </>
      )}
    </div>
  );
}
