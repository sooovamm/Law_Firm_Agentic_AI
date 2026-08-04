"use client";

import {
  Activity,
  AlertTriangle,
  CalendarCheck,
  CalendarClock,
  FileText,
  MapPin,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ListRow, ListRowSubtitle, ListRowTitle } from "@/components/ui/list-row";
import { labelize, statusVariant, urgencyVariant } from "@/components/dashboard/badges";
import { consultationStatusVariant } from "@/components/scheduling/helpers";
import { formatDateTime, formatRelative } from "@/lib/date";
import type {
  ActivityItem,
  ConsultationStatus,
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
        <Icon className="h-4 w-4 text-brand-600 dark:text-brand-400" />
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className={empty ? "" : "p-0"}>
        {empty ? <p className="text-sm text-slate-400 dark:text-slate-500">Nothing to show yet.</p> : children}
      </CardContent>
    </Card>
  );
}

export function RecentActivityPanel({ items }: { items: ActivityItem[] }) {
  return (
    <PanelShell title="Recent Activity" icon={Activity} empty={items.length === 0}>
      <div className="divide-y divide-slate-50 dark:divide-slate-800/60">
        {items.map((a) => (
          <ListRow key={a.id} trailing={<span className="text-xs text-slate-400 dark:text-slate-500">{formatRelative(a.created_at)}</span>}>
            <span className="text-sm text-slate-700 dark:text-slate-300">{a.description}</span>
          </ListRow>
        ))}
      </div>
    </PanelShell>
  );
}

export function UrgentCasesPanel({ items }: { items: UrgentCaseItem[] }) {
  return (
    <PanelShell title="Urgent Cases" icon={AlertTriangle} empty={items.length === 0}>
      <div className="divide-y divide-slate-50 dark:divide-slate-800/60">
        {items.map((c) => (
          <ListRow
            key={c.id}
            href={`/dashboard/cases/${c.id}`}
            trailing={
              <>
                <Badge variant={urgencyVariant[c.urgency]}>{c.urgency}</Badge>
                <Badge variant={statusVariant[c.status]}>{labelize(c.status)}</Badge>
              </>
            }
          >
            <ListRowTitle>{c.title}</ListRowTitle>
            <ListRowSubtitle>
              {c.client_name ?? "No client"} · {labelize(c.practice_area)}
            </ListRowSubtitle>
          </ListRow>
        ))}
      </div>
    </PanelShell>
  );
}

export function UpcomingEventsPanel({ items }: { items: UpcomingEventItem[] }) {
  return (
    <PanelShell title="Upcoming Hearings & Events" icon={CalendarClock} empty={items.length === 0}>
      <div className="divide-y divide-slate-50 dark:divide-slate-800/60">
        {items.map((e) => (
          <ListRow
            key={e.id}
            href={`/dashboard/cases/${e.case_id}`}
            trailing={
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                {formatDateTime(e.scheduled_at)}
              </span>
            }
          >
            <ListRowTitle>{e.title}</ListRowTitle>
            <ListRowSubtitle className="flex items-center gap-1">
              {labelize(e.event_type)} · {e.case_title}
              {e.location && (
                <>
                  <MapPin className="ml-1 h-3 w-3 shrink-0" />
                  {e.location}
                </>
              )}
            </ListRowSubtitle>
          </ListRow>
        ))}
      </div>
    </PanelShell>
  );
}

export function RecentDocumentsPanel({ items }: { items: RecentDocumentItem[] }) {
  return (
    <PanelShell title="Recent Documents" icon={FileText} empty={items.length === 0}>
      <div className="divide-y divide-slate-50 dark:divide-slate-800/60">
        {items.map((d) => (
          <ListRow
            key={d.id}
            trailing={
              d.document_type ? (
                <Badge variant="brand">{labelize(d.document_type)}</Badge>
              ) : (
                <span className="text-xs text-slate-400 dark:text-slate-500">processing…</span>
              )
            }
          >
            <ListRowTitle>{d.filename}</ListRowTitle>
          </ListRow>
        ))}
      </div>
    </PanelShell>
  );
}

export function UpcomingConsultationsPanel({ items }: { items: UpcomingConsultationItem[] }) {
  return (
    <PanelShell title="Upcoming Consultations" icon={CalendarCheck} empty={items.length === 0}>
      <div className="divide-y divide-slate-50 dark:divide-slate-800/60">
        {items.map((c) => (
          <ListRow
            key={c.id}
            trailing={
              <>
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  {formatDateTime(c.scheduled_time)}
                </span>
                <Badge variant={consultationStatusVariant[c.status as ConsultationStatus] ?? "default"}>{c.status}</Badge>
              </>
            }
          >
            <ListRowTitle>{c.client_name ?? "No client"}</ListRowTitle>
            <ListRowSubtitle>
              {c.lawyer_name ?? "Unassigned"} · {c.duration_minutes} min
            </ListRowSubtitle>
          </ListRow>
        ))}
      </div>
    </PanelShell>
  );
}
