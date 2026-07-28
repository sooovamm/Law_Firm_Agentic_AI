"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageSquarePlus, Plus } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { api, ApiError } from "@/lib/api";
import type { ConversationSummaryItem } from "@/types";
import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700",
  completed: "bg-slate-100 text-slate-600",
  abandoned: "bg-amber-50 text-amber-700",
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
          <h1 className="text-2xl font-semibold text-slate-900">AI Client Intake</h1>
          <p className="text-sm text-slate-500">
            Start a guided intake or review past conversations.
          </p>
        </div>
        <Link
          href="/dashboard/intake/new"
          className="inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
        >
          <Plus className="h-4 w-4" />
          New Intake
        </Link>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 text-sm text-slate-500">Loading conversations...</div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center gap-3 p-10 text-center">
              <MessageSquarePlus className="h-8 w-8 text-slate-300" />
              <p className="text-sm text-slate-500">No conversations yet.</p>
              <Link
                href="/dashboard/intake/new"
                className="text-sm font-medium text-brand hover:underline"
              >
                Start your first intake
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {conversations.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/dashboard/intake/${c.id}`}
                    className="flex items-center justify-between px-5 py-4 hover:bg-slate-50"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        Conversation #{c.id}
                        {c.practice_area && (
                          <span className="ml-2 capitalize text-slate-500">
                            · {c.practice_area.replace(/_/g, " ")}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-400">
                        Updated {new Date(c.updated_at).toLocaleString()}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                        statusStyles[c.status] ?? "bg-slate-100 text-slate-600",
                      )}
                    >
                      {c.status}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
