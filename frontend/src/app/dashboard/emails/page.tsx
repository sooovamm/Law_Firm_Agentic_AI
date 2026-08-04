"use client";

import { useCallback, useEffect, useState } from "react";
import { Mail } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchInput } from "@/components/ui/search-input";
import { SkeletonRow } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmailDetailPane } from "@/components/email/email-detail-pane";
import {
  emailStatusVariant,
  emailUrgencyVariant,
  formatEmailDate,
} from "@/components/email/helpers";
import { api, ApiError } from "@/lib/api";
import type { EmailListItem } from "@/types";
import { cn } from "@/lib/utils";

const ALL = "__all__";

export default function EmailsPage() {
  const [emails, setEmails] = useState<EmailListItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const [urgency, setUrgency] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listEmails({
        q: q || undefined,
        urgency: urgency || undefined,
      });
      setEmails(data);
      setError(null);
      // Keep selection if still present; otherwise pick the first.
      setSelectedId((prev) => {
        if (prev && data.some((e) => e.id === prev)) return prev;
        return data.length > 0 ? data[0].id : null;
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to load inbox");
    } finally {
      setLoading(false);
    }
  }, [q, urgency]);

  // Debounced reload on filter change.
  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Inbox</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          AI-triaged emails from Gmail and Outlook, attached to cases automatically.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <SearchInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search emails..." />
        </div>
        <Select value={urgency || ALL} onValueChange={(v) => setUrgency(v === ALL ? "" : v)}>
          <SelectTrigger>
            <SelectValue placeholder="Urgency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All urgencies</SelectItem>
            {["low", "medium", "high", "critical"].map((u) => (
              <SelectItem key={u} value={u} className="capitalize">
                {u}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/20">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* Inbox list */}
        <div className="lg:col-span-2">
          <Card className="overflow-hidden">
            {loading ? (
              <div className="divide-y divide-slate-50 dark:divide-slate-800/60">
                {Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonRow key={i} />
                ))}
              </div>
            ) : emails.length === 0 ? (
              <EmptyState icon={Mail} title="No emails found" description="Try adjusting your search or urgency filter." />
            ) : (
              <div className="max-h-[70vh] divide-y divide-slate-50 overflow-y-auto dark:divide-slate-800/60">
                {emails.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => setSelectedId(e.id)}
                    className={cn(
                      "w-full px-4 py-3 text-left transition-colors",
                      selectedId === e.id
                        ? "bg-brand-50 dark:bg-brand-500/10"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/40",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                        {e.sender}
                      </span>
                      <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">
                        {formatEmailDate(e.received_at ?? e.created_at)}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-sm text-slate-600 dark:text-slate-400">{e.subject}</p>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      {e.urgency && <Badge variant={emailUrgencyVariant[e.urgency]}>{e.urgency}</Badge>}
                      <Badge variant={emailStatusVariant[e.status]}>{e.status}</Badge>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Detail pane */}
        <div className="lg:col-span-3">
          {selectedId ? (
            <EmailDetailPane emailId={selectedId} onReplied={load} />
          ) : (
            <Card>
              <CardContent className="py-16 text-center text-sm text-slate-400 dark:text-slate-500">
                Select an email to view details.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
