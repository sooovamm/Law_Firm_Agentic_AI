"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageSquarePlus, Plus } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ListRow, ListRowSubtitle, ListRowTitle } from "@/components/ui/list-row";
import { SkeletonRow } from "@/components/ui/skeleton";
import { api, ApiError } from "@/lib/api";
import type { ConversationStatus, ConversationSummaryItem } from "@/types";

const statusVariant: Record<ConversationStatus, NonNullable<BadgeProps["variant"]>> = {
  active: "success",
  completed: "default",
  abandoned: "warning",
};

export default function IntakePage() {
  const [conversations, setConversations] = useState<ConversationSummaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const data = await api.listConversations();
        if (active) setConversations(data);
      } catch (err) {
        if (active) setError(err instanceof ApiError ? err.detail : "Failed to load history");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">AI Client Intake</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Start a guided intake or review past conversations.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/intake/new" className="inline-flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Intake
          </Link>
        </Button>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/20">
          {error}
        </div>
      )}

      <Card className="overflow-hidden">
        {loading ? (
          <div className="divide-y divide-slate-50 dark:divide-slate-800/60">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <EmptyState
            icon={MessageSquarePlus}
            title="No conversations yet"
            description="Start a guided AI intake to capture a new client's situation and route it to the right lawyer."
            primaryAction={
              <Button asChild>
                <Link href="/dashboard/intake/new">Start your first intake</Link>
              </Button>
            }
          />
        ) : (
          <div className="divide-y divide-slate-50 dark:divide-slate-800/60">
            {conversations.map((c) => (
              <ListRow
                key={c.id}
                href={`/dashboard/intake/${c.id}`}
                trailing={<Badge variant={statusVariant[c.status] ?? "default"}>{c.status}</Badge>}
              >
                <ListRowTitle>
                  Conversation #{c.id}
                  {c.practice_area && <span className="ml-1 font-normal capitalize text-slate-500 dark:text-slate-400">· {c.practice_area.replace(/_/g, " ")}</span>}
                </ListRowTitle>
                <ListRowSubtitle>Updated {new Date(c.updated_at).toLocaleString()}</ListRowSubtitle>
              </ListRow>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
