"use client";

import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Scale, User as UserIcon } from "lucide-react";
import type { MessageRole } from "@/types";
import { formatTime } from "@/lib/date";
import { cn } from "@/lib/utils";

interface ChatBubbleProps {
  role: MessageRole;
  content: string;
  timestamp?: string;
}

export function ChatBubble({ role, content, timestamp }: ChatBubbleProps) {
  const isUser = role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={cn("flex gap-3 px-4 py-2.5", isUser && "flex-row-reverse")}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser
            ? "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
            : "bg-gradient-to-br from-brand-500 to-brand-700 text-white",
        )}
      >
        {isUser ? <UserIcon className="h-4 w-4" /> : <Scale className="h-4 w-4" />}
      </div>
      <div className={cn("flex max-w-[75%] flex-col gap-1", isUser && "items-end")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
            isUser
              ? "rounded-tr-sm bg-brand-700 text-white dark:bg-brand-600"
              : "rounded-tl-sm bg-white text-slate-800 shadow-soft ring-1 ring-slate-100 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700/60",
          )}
        >
          <div
            className={cn(
              "prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
              isUser
                ? "prose-invert prose-p:text-white prose-strong:text-white prose-a:text-white"
                : "dark:prose-invert prose-p:text-slate-800 dark:prose-p:text-slate-200",
            )}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        </div>
        {timestamp && (
          <span className="px-1 text-[11px] text-slate-400 dark:text-slate-500">{formatTime(timestamp)}</span>
        )}
      </div>
    </motion.div>
  );
}

export function TypingBubble() {
  return (
    <div className="flex gap-3 px-4 py-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white">
        <Scale className="h-4 w-4" />
      </div>
      <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm bg-white px-4 py-3 shadow-soft ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700/60">
        <span className="h-2 w-2 animate-bounce-dot rounded-full bg-slate-300 dark:bg-slate-500 [animation-delay:-0.3s]" />
        <span className="h-2 w-2 animate-bounce-dot rounded-full bg-slate-300 dark:bg-slate-500 [animation-delay:-0.15s]" />
        <span className="h-2 w-2 animate-bounce-dot rounded-full bg-slate-300 dark:bg-slate-500" />
      </div>
    </div>
  );
}
