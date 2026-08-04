"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { ChatPanel } from "@/components/intake/chat-panel";

export default function NewIntakePage() {
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
        <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">New Intake</h1>
      </div>

      <div className="flex-1 overflow-hidden rounded-2xl bg-white shadow-soft ring-1 ring-slate-900/5 dark:bg-slate-900 dark:ring-white/[0.06]">
        <ChatPanel />
      </div>
    </div>
  );
}
