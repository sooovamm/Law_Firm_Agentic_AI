"use client";

import { Scale, User as UserIcon } from "lucide-react";
import type { MessageRole } from "@/types";
import { cn } from "@/lib/utils";

interface ChatBubbleProps {
  role: MessageRole;
  content: string;
}

export function ChatBubble({ role, content }: ChatBubbleProps) {
  const isUser = role === "user";

  return (
    <div className={cn("flex gap-3 px-4 py-3", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-slate-200 text-slate-600" : "bg-brand text-white",
        )}
      >
        {isUser ? <UserIcon className="h-4 w-4" /> : <Scale className="h-4 w-4" />}
      </div>
      <div
        className={cn(
          "max-w-[75%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
          isUser
            ? "rounded-tr-sm bg-brand text-white"
            : "rounded-tl-sm bg-white text-slate-800 shadow-sm ring-1 ring-slate-100",
        )}
      >
        {content}
      </div>
    </div>
  );
}

export function TypingBubble() {
  return (
    <div className="flex gap-3 px-4 py-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-white">
        <Scale className="h-4 w-4" />
      </div>
      <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-white px-4 py-3 shadow-sm ring-1 ring-slate-100">
        <span className="h-2 w-2 animate-bounce rounded-full bg-slate-300 [animation-delay:-0.3s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-slate-300 [animation-delay:-0.15s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-slate-300" />
      </div>
    </div>
  );
}
