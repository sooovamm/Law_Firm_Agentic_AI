"use client";

import { useEffect, useState } from "react";
import {
  Briefcase,
  CalendarClock,
  CheckCircle2,
  ListChecks,
  Send,
  Sparkles,
  User as UserIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SkeletonText } from "@/components/ui/skeleton";
import {
  emailStatusVariant,
  emailUrgencyVariant,
  formatEmailDate,
} from "@/components/email/helpers";
import { api, ApiError } from "@/lib/api";
import type { EmailDetail } from "@/types";

export function EmailDetailPane({
  emailId,
  onReplied,
}: {
  emailId: number;
  onReplied: () => void;
}) {
  const [email, setEmail] = useState<EmailDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [sentNote, setSentNote] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setSentNote(null);
    api
      .getEmail(emailId)
      .then((e) => {
        if (!active) return;
        setEmail(e);
        // Pre-fill the reply box with the AI draft for review/approval.
        setReply(e.draft_reply ?? "");
        setError(null);
      })
      .catch((err) =>
        active && setError(err instanceof ApiError ? err.detail : "Failed to load email"),
      )
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [emailId]);

  async function approveAndSend() {
    if (!reply.trim() || !email) return;
    setSending(true);
    setError(null);
    try {
      const resp = await api.replyEmail(email.id, reply.trim());
      setSentNote(
        resp.sent
          ? `Reply sent via ${resp.channel}.`
          : "Reply approved and recorded (no mailbox connected, so nothing was sent).",
      );
      onReplied();
      const refreshed = await api.getEmail(email.id);
      setEmail(refreshed);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to send reply");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6">
          <SkeletonText lines={5} />
        </CardContent>
      </Card>
    );
  }
  if (error && !email) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-rose-600 dark:text-rose-400">{error}</CardContent>
      </Card>
    );
  }
  if (!email) return null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-lg">{email.subject}</CardTitle>
            <div className="flex shrink-0 items-center gap-1.5">
              {email.urgency && <Badge variant={emailUrgencyVariant[email.urgency]}>{email.urgency}</Badge>}
              <Badge variant={emailStatusVariant[email.status]}>{email.status}</Badge>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <UserIcon className="h-3.5 w-3.5" />
              {email.sender}
            </span>
            <span>{formatEmailDate(email.received_at ?? email.created_at)}</span>
            <span className="text-xs uppercase tracking-wide">{email.provider}</span>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {email.client_name && (
              <Badge variant="info">
                <UserIcon className="mr-1 h-3 w-3" />
                {email.client_name}
              </Badge>
            )}
            {email.case_title && (
              <Badge variant="brand">
                <Briefcase className="mr-1 h-3 w-3" />
                {email.case_title}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {email.summary && (
            <div className="rounded-xl bg-brand-50 px-4 py-3 dark:bg-brand-500/10">
              <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-400">
                <Sparkles className="h-3.5 w-3.5" />
                AI Summary
              </p>
              <p className="text-slate-700 dark:text-slate-300">{email.summary}</p>
            </div>
          )}

          {(email.tasks.length > 0 || email.deadlines.length > 0) && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {email.tasks.length > 0 && (
                <div>
                  <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    <ListChecks className="h-3.5 w-3.5" />
                    Tasks
                  </p>
                  <ul className="space-y-1">
                    {email.tasks.map((t, i) => (
                      <li key={i} className="rounded-lg bg-slate-50 px-2.5 py-1.5 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                        {t.description}
                        {t.owner && <span className="text-slate-400 dark:text-slate-500"> · {t.owner}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {email.deadlines.length > 0 && (
                <div>
                  <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    <CalendarClock className="h-3.5 w-3.5" />
                    Deadlines
                  </p>
                  <ul className="space-y-1">
                    {email.deadlines.map((d, i) => (
                      <li key={i} className="rounded-lg bg-slate-50 px-2.5 py-1.5 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                        {d.description}
                        {d.due_date && (
                          <span className="font-medium text-amber-700 dark:text-amber-400"> · {d.due_date}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Message</p>
            <p className="whitespace-pre-wrap text-slate-700 dark:text-slate-300">{email.body}</p>
          </div>
        </CardContent>
      </Card>

      {/* Draft reply + approve */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5 text-sm">
            <Sparkles className="h-4 w-4 text-brand-600 dark:text-brand-400" />
            Draft Reply
          </CardTitle>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            AI-generated draft. Review and edit before approving.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && (
            <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/20">
              {error}
            </div>
          )}
          {sentNote && (
            <div className="flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20">
              <CheckCircle2 className="h-4 w-4" />
              {sentNote}
            </div>
          )}
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            rows={7}
            placeholder="Write or edit your reply..."
            className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-soft transition-colors placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
          <div className="flex justify-end">
            <Button onClick={approveAndSend} loading={sending} disabled={!reply.trim()}>
              <Send className="h-4 w-4" />
              Approve & Send
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
