"use client";

import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  CalendarCheck,
  CalendarClock,
  FileText,
  MapPin,
} from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { labelize, statusVariant, urgencyVariant } from "@/components/dashboard/badges";
import type {
  ActivityItem,
  RecentDocumentItem,
  UpcomingConsultationItem,
  UpcomingEventItem,
  UrgentCaseItem,
} from "@/types";

function PanelShell({
  title,
  icon: Icon,
  empty,
  children,
}: {
  title: string;
  icon: typeof Activity;
  empty: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <Icon className="h-4 w-4 text-brand" />
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      </CardHeader>
      <CardContent className={empty ? "" : "p-0"}>
        {empty ? <p className="text-sm text-slate-400">Nothing to show yet.</p> : children}
      </CardContent>
    </Card>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function RecentActivityPanel({ items }: { items: ActivityItem[] }) {
  return (
    <PanelShell title="Recent Activity" icon={Activity} empty={items.length === 0}>
      <ul className="divide-y divide-slate-50">
        {items.map((a) => (
          <li key={a.id} className="flex items-center justify-between px-5 py-3 text-sm">
            <span className="text-slate-700">{a.description}</span>
            <span className="shrink-0 pl-3 text-xs text-slate-400">{timeAgo(a.created_at)}</span>
          </li>
        ))}
      </ul>
    </PanelShell>
  );
}

export function UrgentCasesPanel({ items }: { items: UrgentCaseItem[] }) {
  return (
    <PanelShell title="Urgent Cases" icon={AlertTriangle} empty={items.length === 0}>
      <ul className="divide-y divide-slate-50">
        {items.map((c) => (
          <li key={c.id}>
            <Link
              href={`/dashboard/cases/${c.id}`}
              className="flex items-center justify-between px-5 py-3 hover:bg-slate-50"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">{c.title}</p>
                <p className="truncate text-xs text-slate-500">
                  {c.client_name ?? "No client"} · {labelize(c.practice_area)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 pl-3">
                <Badge variant={urgencyVariant[c.urgency]}>{c.urgency}</Badge>
                <Badge variant={statusVariant[c.status]}>{labelize(c.status)}</Badge>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </PanelShell>
  );
}

export function UpcomingEventsPanel({ items }: { items: UpcomingEventItem[] }) {
  return (
    <PanelShell title="Upcoming Hearings & Events" icon={CalendarClock} empty={items.length === 0}>
      <ul className="divide-y divide-slate-50">
        {items.map((e) => (
          <li key={e.id}>
            <Link
              href={`/dashboard/cases/${e.case_id}`}
              className="flex items-center justify-between px-5 py-3 hover:bg-slate-50"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">{e.title}</p>
                <p className="flex items-center gap-1 truncate text-xs text-slate-500">
                  {labelize(e.event_type)} · {e.case_title}
                  {e.location && (
                    <>
                      <MapPin className="ml-1 h-3 w-3" />
                      {e.location}
                    </>
                  )}
                </p>
              </div>
              <span className="shrink-0 pl-3 text-xs font-medium text-slate-600">
                {new Date(e.scheduled_at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </PanelShell>
  );
}

export function RecentDocumentsPanel({ items }: { items: RecentDocumentItem[] }) {
  return (
    <PanelShell title="Recent Documents" icon={FileText} empty={items.length === 0}>
      <ul className="divide-y divide-slate-50">
        {items.map((d) => (
          <li key={d.id} className="flex items-center justify-between px-5 py-3 text-sm">
            <span className="truncate font-medium text-slate-900">{d.filename}</span>
            <span className="shrink-0 pl-3">
              {d.document_type ? (
                <Badge variant="brand">{labelize(d.document_type)}</Badge>
              ) : (
                <span className="text-xs text-slate-400">processing…</span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </PanelShell>
  );
}

const CONSULT_VARIANT: Record<string, "warning" | "success" | "default" | "danger"> = {
  pending: "warning",
  confirmed: "success",
  completed: "default",
  cancelled: "danger",
};

export function UpcomingConsultationsPanel({
  items,
}: {
  items: UpcomingConsultationItem[];
}) {
  return (
    <PanelShell
      title="Upcoming Consultations"
      icon={CalendarCheck}
      empty={items.length === 0}
    >
      <ul className="divide-y divide-slate-50">
        {items.map((c) => (
          <li key={c.id} className="flex items-center justify-between px-5 py-3 text-sm">
            <div className="min-w-0">
              <p className="truncate font-medium text-slate-900">
                {c.client_name ?? "No client"}
              </p>
              <p className="truncate text-xs text-slate-500">
                {c.lawyer_name ?? "Unassigned"} · {c.duration_minutes} min
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2 pl-3">
              <span className="text-xs font-medium text-slate-600">
                {new Date(c.scheduled_time).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
              <Badge variant={CONSULT_VARIANT[c.status] ?? "default"}>{c.status}</Badge>
            </div>
          </li>
        ))}
      </ul>
    </PanelShell>
  );
}
