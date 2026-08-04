"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarClock,
  Download,
  FileText,
  MessageSquare,
  StickyNote,
  User as UserIcon,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ListRow, ListRowTitle } from "@/components/ui/list-row";
import { Timeline } from "@/components/ui/timeline";
import { SkeletonText } from "@/components/ui/skeleton";
import { ChatBubble } from "@/components/intake/chat-bubble";
import { labelize, statusVariant, urgencyVariant } from "@/components/dashboard/badges";
import { api, ApiError } from "@/lib/api";
import { downloadBlob } from "@/lib/download-file";
import type { CaseFullDetail } from "@/types";

export default function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const caseId = Number(id);

  const [data, setData] = useState<CaseFullDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newNote, setNewNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const load = useCallback(async () => {
    try {
      const detail = await api.getCaseDetail(caseId);
      setData(detail);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to load case");
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    load();
  }, [load]);

  async function addNote() {
    if (!newNote.trim()) return;
    setSavingNote(true);
    try {
      await api.addCaseNote(caseId, newNote.trim());
      setNewNote("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to add note");
    } finally {
      setSavingNote(false);
    }
  }

  async function handleDownload(id: number, filename: string) {
    try {
      const blob = await api.getDocumentBlob(id);
      downloadBlob(blob, filename);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Download failed");
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-4 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-8 w-72 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card>
            <CardContent className="py-6">
              <SkeletonText lines={3} />
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardContent className="py-6">
              <SkeletonText lines={4} />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  if (error && !data) {
    return (
      <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/20">
        {error}
      </div>
    );
  }
  if (!data) return null;

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/cases"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to cases
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">{data.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant="brand">{labelize(data.practice_area)}</Badge>
            <Badge variant={statusVariant[data.status]}>{labelize(data.status)}</Badge>
            <Badge variant={urgencyVariant[data.urgency]}>{data.urgency} urgency</Badge>
          </div>
        </div>
        <div className="text-right text-sm text-slate-500 dark:text-slate-400">
          <div className="flex items-center justify-end gap-1.5">
            <UserIcon className="h-4 w-4" />
            {data.assigned_lawyer ? data.assigned_lawyer.full_name : "Unassigned"}
          </div>
          <p className="mt-1 text-xs">Opened {new Date(data.created_at).toLocaleDateString()}</p>
        </div>
      </div>

      {/* Client + AI summary side by side */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Client</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {data.client ? (
              <div className="space-y-1">
                <p className="font-medium text-slate-900 dark:text-slate-100">{data.client.full_name}</p>
                {data.client.email && <p className="text-slate-600 dark:text-slate-400">{data.client.email}</p>}
                {data.client.phone && <p className="text-slate-600 dark:text-slate-400">{data.client.phone}</p>}
                {data.client.company && <p className="text-slate-500 dark:text-slate-400">{data.client.company}</p>}
              </div>
            ) : (
              <p className="text-slate-400 dark:text-slate-500">No client linked.</p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>AI Summary</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {data.ai_summary ? (
              <p className="whitespace-pre-wrap leading-relaxed text-slate-700 dark:text-slate-300">{data.ai_summary}</p>
            ) : (
              <p className="text-slate-400 dark:text-slate-500">
                No AI summary yet. It updates automatically as documents are processed.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabbed detail */}
      <Tabs defaultValue="timeline">
        <TabsList>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="documents">Documents ({data.documents.length})</TabsTrigger>
          <TabsTrigger value="notes">Notes ({data.notes.length})</TabsTrigger>
          <TabsTrigger value="conversation">Conversation</TabsTrigger>
        </TabsList>

        {/* Timeline */}
        <TabsContent value="timeline">
          <Card>
            <CardContent className="py-5">
              <Timeline items={data.timeline} formatTimestamp={(iso) => new Date(iso).toLocaleString()} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents */}
        <TabsContent value="documents">
          <Card className="overflow-hidden">
            {data.documents.length === 0 ? (
              <p className="p-5 text-sm text-slate-400 dark:text-slate-500">No documents attached.</p>
            ) : (
              <div className="divide-y divide-slate-50 dark:divide-slate-800/60">
                {data.documents.map((d) => (
                  <ListRow
                    key={d.id}
                    leading={<FileText className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />}
                    trailing={
                      <button
                        onClick={() => handleDownload(d.id, d.filename)}
                        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-brand-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-brand-400"
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    }
                  >
                    <div className="flex items-center gap-2">
                      <ListRowTitle>{d.filename}</ListRowTitle>
                      {d.document_type && <Badge variant="brand">{labelize(d.document_type)}</Badge>}
                    </div>
                  </ListRow>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Notes */}
        <TabsContent value="notes">
          <Card>
            <CardContent className="space-y-4 py-5">
              <div className="flex items-end gap-2">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  rows={2}
                  placeholder="Add a note..."
                  className="flex-1 resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-soft transition-colors placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
                />
                <Button onClick={addNote} loading={savingNote} disabled={!newNote.trim()}>
                  Add
                </Button>
              </div>

              {data.notes.length === 0 ? (
                <p className="text-sm text-slate-400 dark:text-slate-500">No notes yet.</p>
              ) : (
                <ul className="space-y-3">
                  {data.notes.map((n) => (
                    <li key={n.id} className="rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/50">
                      <div className="flex items-start gap-1.5 text-slate-700 dark:text-slate-300">
                        <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
                        <p className="whitespace-pre-wrap text-sm">{n.content}</p>
                      </div>
                      <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                        {new Date(n.created_at).toLocaleString()}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Conversation */}
        <TabsContent value="conversation">
          <Card>
            <CardContent className="py-5">
              {!data.conversation ? (
                <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-slate-500">
                  <MessageSquare className="h-4 w-4" />
                  No intake conversation linked to this case.
                </div>
              ) : (
                <div className="space-y-1">
                  {data.conversation.messages.map((m) => (
                    <ChatBubble key={m.id} role={m.role} content={m.content} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Upcoming events for this case */}
      {data.events.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center gap-2">
            <CalendarClock className="h-4 w-4 text-brand-600 dark:text-brand-400" />
            <CardTitle>Events</CardTitle>
          </CardHeader>
          <div className="divide-y divide-slate-50 dark:divide-slate-800/60">
            {data.events.map((e) => (
              <ListRow
                key={e.id}
                trailing={
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {new Date(e.scheduled_at).toLocaleString()}
                  </span>
                }
              >
                <span className="font-medium text-slate-900 dark:text-slate-100">{e.title}</span>
                <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">{labelize(e.event_type)}</span>
              </ListRow>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
