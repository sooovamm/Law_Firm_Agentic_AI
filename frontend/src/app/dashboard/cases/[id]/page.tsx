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

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
    return <div className="p-8 text-sm text-slate-500">Loading case...</div>;
  }
  if (error && !data) {
    return <div className="p-8 text-sm text-red-600">{error}</div>;
  }
  if (!data) return null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        href="/dashboard/cases"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to cases
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{data.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant="brand">{labelize(data.practice_area)}</Badge>
            <Badge variant={statusVariant[data.status]}>{labelize(data.status)}</Badge>
            <Badge variant={urgencyVariant[data.urgency]}>{data.urgency} urgency</Badge>
          </div>
        </div>
        <div className="text-right text-sm text-slate-500">
          <div className="flex items-center gap-1.5">
            <UserIcon className="h-4 w-4" />
            {data.assigned_lawyer ? data.assigned_lawyer.full_name : "Unassigned"}
          </div>
          <p className="mt-1 text-xs">
            Opened {new Date(data.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Client + AI summary side by side */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-slate-900">Client</h2>
          </CardHeader>
          <CardContent className="text-sm">
            {data.client ? (
              <div className="space-y-1">
                <p className="font-medium text-slate-900">{data.client.full_name}</p>
                {data.client.email && <p className="text-slate-600">{data.client.email}</p>}
                {data.client.phone && <p className="text-slate-600">{data.client.phone}</p>}
                {data.client.company && (
                  <p className="text-slate-500">{data.client.company}</p>
                )}
              </div>
            ) : (
              <p className="text-slate-400">No client linked.</p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <h2 className="text-sm font-semibold text-slate-900">AI Summary</h2>
          </CardHeader>
          <CardContent className="text-sm">
            {data.ai_summary ? (
              <p className="whitespace-pre-wrap text-slate-700">{data.ai_summary}</p>
            ) : (
              <p className="text-slate-400">
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
              {data.timeline.length === 0 ? (
                <p className="text-sm text-slate-400">No timeline entries.</p>
              ) : (
                <ol className="relative space-y-4 border-l border-slate-200 pl-6">
                  {data.timeline.map((t, i) => (
                    <li key={i} className="relative">
                      <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-white bg-brand" />
                      <p className="text-sm font-medium text-slate-900">{t.label}</p>
                      {t.detail && <p className="text-sm text-slate-600">{t.detail}</p>}
                      <p className="text-xs text-slate-400">
                        {new Date(t.timestamp).toLocaleString()}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents */}
        <TabsContent value="documents">
          <Card>
            <CardContent className="p-0">
              {data.documents.length === 0 ? (
                <p className="p-5 text-sm text-slate-400">No documents attached.</p>
              ) : (
                <ul className="divide-y divide-slate-50">
                  {data.documents.map((d) => (
                    <li
                      key={d.id}
                      className="flex items-center justify-between px-5 py-3 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-slate-400" />
                        <span className="font-medium text-slate-900">{d.filename}</span>
                        {d.document_type && (
                          <Badge variant="brand">{labelize(d.document_type)}</Badge>
                        )}
                      </div>
                      <button
                        onClick={() => handleDownload(d.id, d.filename)}
                        className="text-slate-400 hover:text-brand"
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
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
                  className="flex-1 resize-none rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
                <Button onClick={addNote} disabled={savingNote || !newNote.trim()}>
                  {savingNote ? "Saving..." : "Add"}
                </Button>
              </div>

              {data.notes.length === 0 ? (
                <p className="text-sm text-slate-400">No notes yet.</p>
              ) : (
                <ul className="space-y-3">
                  {data.notes.map((n) => (
                    <li key={n.id} className="rounded-md bg-slate-50 px-4 py-3">
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <StickyNote className="h-3.5 w-3.5 text-slate-400" />
                        <p className="whitespace-pre-wrap text-sm">{n.content}</p>
                      </div>
                      <p className="mt-1 text-xs text-slate-400">
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
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <MessageSquare className="h-4 w-4" />
                  No intake conversation linked to this case.
                </div>
              ) : (
                <div className="space-y-3">
                  {data.conversation.messages.map((m) => (
                    <div
                      key={m.id}
                      className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
                    >
                      <div
                        className={`max-w-[75%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm ${
                          m.role === "user"
                            ? "bg-brand text-white"
                            : "bg-slate-100 text-slate-800"
                        }`}
                      >
                        {m.content}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Upcoming events for this case */}
      {data.events.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <CalendarClock className="h-4 w-4 text-brand" />
            <h2 className="text-sm font-semibold text-slate-900">Events</h2>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-slate-50">
              {data.events.map((e) => (
                <li key={e.id} className="flex items-center justify-between px-5 py-3 text-sm">
                  <div>
                    <span className="font-medium text-slate-900">{e.title}</span>
                    <span className="ml-2 text-xs text-slate-500">{labelize(e.event_type)}</span>
                  </div>
                  <span className="text-xs text-slate-500">
                    {new Date(e.scheduled_at).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
