"use client";

import { useCallback, useEffect, useState } from "react";
import { Mail, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Inbox</h1>
        <p className="text-sm text-slate-500">
          AI-triaged emails from Gmail and Outlook, attached to cases automatically.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="relative sm:col-span-2">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search emails..."
            className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
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
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* Inbox list */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6 text-sm text-slate-500">Loading...</div>
              ) : emails.length === 0 ? (
                <div className="flex flex-col items-center gap-2 p-10 text-center text-sm text-slate-500">
                  <Mail className="h-8 w-8 text-slate-300" />
                  No emails found.
                </div>
              ) : (
                <ul className="divide-y divide-slate-50">
                  {emails.map((e) => (
                    <li key={e.id}>
                      <button
                        onClick={() => setSelectedId(e.id)}
                        className={cn(
                          "w-full px-4 py-3 text-left transition-colors",
                          selectedId === e.id ? "bg-brand/5" : "hover:bg-slate-50",
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-medium text-slate-900">
                            {e.sender}
                          </span>
                          <span className="shrink-0 text-xs text-slate-400">
                            {formatEmailDate(e.received_at ?? e.created_at)}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-sm text-slate-600">{e.subject}</p>
                        <div className="mt-1.5 flex items-center gap-1.5">
                          {e.urgency && (
                            <Badge variant={emailUrgencyVariant[e.urgency]}>{e.urgency}</Badge>
                          )}
                          <Badge variant={emailStatusVariant[e.status]}>{e.status}</Badge>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Detail pane */}
        <div className="lg:col-span-3">
          {selectedId ? (
            <EmailDetailPane emailId={selectedId} onReplied={load} />
          ) : (
            <Card>
              <CardContent className="py-16 text-center text-sm text-slate-400">
                Select an email to view details.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
