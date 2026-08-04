"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Sparkles } from "lucide-react";

import { ChatBubble, TypingBubble } from "@/components/intake/chat-bubble";
import { DocumentUploadPlaceholder } from "@/components/intake/document-upload";
import { IntakeProgress } from "@/components/intake/intake-progress";
import { IntakeSummaryCard } from "@/components/intake/summary-card";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import type {
  AISummary,
  ConversationStatus,
  IntakeMessage,
  IntakeStage,
  LawyerMatchRecommendation,
} from "@/types";

interface ChatPanelProps {
  conversationId?: number;
  initialMessages?: IntakeMessage[];
  initialStage?: IntakeStage;
  initialStatus?: ConversationStatus;
  initialSummary?: AISummary | null;
  initialCaseId?: number | null;
}

const SUGGESTED_PROMPTS = [
  "I was injured at work and my employer isn't helping",
  "My landlord won't return my security deposit",
  "I need help reviewing a contract before I sign it",
  "I'm going through a divorce and need guidance",
];

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
  const [lawyerMatch, setLawyerMatch] = useState<LawyerMatchRecommendation | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending, summary]);

  async function send(overrideText?: string) {
    const text = (overrideText ?? input).trim();
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
      if (resp.lawyer_match) setLawyerMatch(resp.lawyer_match);
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

  function autoGrow() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }

  const completed = status === "completed";
  const isEmpty = messages.length === 0 && !sending;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-100 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
        <IntakeProgress stage={stage} />
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto bg-slate-50 py-4 dark:bg-slate-950">
        <div className="mx-auto max-w-2xl">
          {isEmpty ? (
            <div className="flex flex-col items-center gap-6 px-4 py-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-glow">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Tell us what happened
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Our AI intake assistant will ask a few questions and route you to the right lawyer.
                </p>
              </div>
              <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => send(prompt)}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-600 shadow-soft transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:text-slate-900 hover:shadow-elevated dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-brand-500/30 dark:hover:text-slate-100"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => (
              <ChatBubble key={m.id} role={m.role} content={m.content} timestamp={m.created_at} />
            ))
          )}
          {sending && <TypingBubble />}
          {completed && summary && (
            <IntakeSummaryCard summary={summary} caseId={caseId} lawyerMatch={lawyerMatch} />
          )}
        </div>
      </div>

      <div className="border-t border-slate-100 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto max-w-2xl">
          {error && <p className="mb-2 text-xs text-rose-600 dark:text-rose-400">{error}</p>}
          {completed ? (
            <p className="py-2 text-center text-sm text-slate-500 dark:text-slate-400">
              This intake is complete. Thank you.
            </p>
          ) : (
            <div className="flex items-end gap-2">
              <DocumentUploadPlaceholder />
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  autoGrow();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                rows={1}
                placeholder="Describe your situation..."
                className={cn(
                  "max-h-32 flex-1 resize-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-soft transition-colors dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100",
                  "placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:placeholder:text-slate-500",
                )}
              />
              <Button size="icon" onClick={() => send()} disabled={sending || !input.trim()} aria-label="Send message">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
