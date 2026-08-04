"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { ChatPanel } from "@/components/intake/chat-panel";
import { SkeletonText } from "@/components/ui/skeleton";
import { api, ApiError } from "@/lib/api";
import type { ConversationDetail } from "@/types";

export default function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const conversationId = Number(id);

  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const data = await api.getConversation(conversationId);
        if (active) setDetail(data);
      } catch (err) {
        if (active) setError(err instanceof ApiError ? err.detail : "Failed to load conversation");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [conversationId]);

  return (
    <div className="mx-auto flex h-[calc(100vh-7rem)] max-w-3xl flex-col lg:h-[calc(100vh-4rem)]">
      <div className="mb-3 flex items-center gap-2">
        <Link
          href="/dashboard/intake"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          Conversation #{conversationId}
        </h1>
      </div>

      <div className="flex-1 overflow-hidden rounded-2xl bg-white shadow-soft ring-1 ring-slate-900/5 dark:bg-slate-900 dark:ring-white/[0.06]">
        {loading ? (
          <div className="p-6">
            <SkeletonText lines={4} />
          </div>
        ) : error ? (
          <div className="flex h-full items-center justify-center text-sm text-rose-600 dark:text-rose-400">{error}</div>
        ) : detail ? (
          <ChatPanel
            conversationId={detail.id}
            initialMessages={detail.messages}
            initialStage={detail.stage}
            initialStatus={detail.status}
            initialSummary={detail.summary}
            initialCaseId={detail.case_id}
          />
        ) : null}
      </div>
    </div>
  );
}
