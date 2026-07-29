"use client";

import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";

import { ChatBubble, TypingBubble } from "@/components/intake/chat-bubble";
import { DocumentUploadPlaceholder } from "@/components/intake/document-upload";
import { IntakeProgress } from "@/components/intake/intake-progress";
import { IntakeSummaryCard } from "@/components/intake/summary-card";
import { api, ApiError } from "@/lib/api";
import type {
  AISummary,
  ConversationStatus,
  IntakeMessage,
  IntakeStage,
} from "@/types";

interface ChatPanelProps {
  conversationId?: number;
  initialMessages?: IntakeMessage[];
  initialStage?: IntakeStage;
  initialStatus?: ConversationStatus;
  initialSummary?: AISummary | null;
  initialCaseId?: number | null;
}

let tempId = -1;

export function ChatPanel({
  conversationId: initialConversationId,
  initialMessages = [],
  initialStage = "greeting",
  initialStatus = "active",
  initialSummary = null,
  initialCaseId = null,
}: ChatPanelProps) {
  const [conversationId, setConversationId] = useState<number | null>(
    initialConversationId ?? null,
  );
  const [messages, setMessages] = useState<IntakeMessage[]>(initialMessages);
  const [stage, setStage] = useState<IntakeStage>(initialStage);
  const [status, setStatus] = useState<ConversationStatus>(initialStatus);
  const [summary, setSummary] = useState<AISummary | null>(initialSummary);
  const [caseId, setCaseId] = useState<number | null>(initialCaseId);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending, summary]);

  async function send() {
    const text = input.trim();
    if (!text || sending || status === "completed") return;

    setError(null);
    setInput("");

    // Optimistically render the user's message.
    const optimistic: IntakeMessage = {
      id: tempId--,
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setSending(true);

    try {
      const resp = await api.sendChatMessage({
        conversation_id: conversationId,
        message: text,
      });
      setConversationId(resp.conversation_id);
      setStage(resp.stage);
      setStatus(resp.status);
      setCaseId(resp.case_id);
      if (resp.summary) setSummary(resp.summary);
      if (resp.assistant_message) {
        setMessages((prev) => [
          ...prev,
          {
            id: tempId--,
            role: "assistant",
            content: resp.assistant_message,
            created_at: new Date().toISOString(),
          },
        ]);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to send message");
      // Roll back the optimistic message on failure.
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setInput(text);
    } finally {
      setSending(false);
    }
  }

  const completed = status === "completed";

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3">
        <IntakeProgress stage={stage} />
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 py-4">
        {messages.length === 0 && !sending && (
          <div className="flex h-full items-center justify-center text-sm text-slate-400 dark:text-slate-500">
            Start the conversation below.
          </div>
        )}
        {messages.map((m) => (
          <ChatBubble key={m.id} role={m.role} content={m.content} />
        ))}
        {sending && <TypingBubble />}
        {completed && summary && <IntakeSummaryCard summary={summary} caseId={caseId} />}
      </div>

      <div className="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3">
        {error && <p className="mb-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
        {completed ? (
          <p className="py-2 text-center text-sm text-slate-500 dark:text-slate-400">
            This intake is complete. Thank you.
          </p>
        ) : (
          <div className="flex items-end gap-2">
            <DocumentUploadPlaceholder />
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={1}
              placeholder="Describe your situation..."
              className="max-h-32 flex-1 resize-none rounded-md border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
            <button
              onClick={send}
              disabled={sending || !input.trim()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-brand/50"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
