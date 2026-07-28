"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { ChatPanel } from "@/components/intake/chat-panel";
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
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-3xl flex-col">
      <div className="mb-3 flex items-center gap-2">
        <Link
          href="/dashboard/intake"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <h1 className="text-lg font-semibold text-slate-900">
          Conversation #{conversationId}
        </h1>
      </div>

      <div className="flex-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            Loading conversation...
          </div>
        ) : error ? (
          <div className="flex h-full items-center justify-center text-sm text-red-600">
            {error}
          </div>
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
