"use client";

import { Paperclip } from "lucide-react";

/**
 * Document upload placeholder.
 *
 * Sprint 2 ships the UI affordance only; wiring to a storage backend and the
 * intake agent's document ingestion is planned for a later sprint. The control
 * is intentionally disabled so users understand it is coming soon.
 */
export function DocumentUploadPlaceholder() {
  return (
    <button
      type="button"
      disabled
      title="Document upload coming soon"
      className="flex shrink-0 cursor-not-allowed items-center justify-center rounded-md border border-dashed border-slate-300 px-3 py-2 text-slate-400"
    >
      <Paperclip className="h-4 w-4" />
      <span className="ml-1.5 hidden text-xs sm:inline">Attach</span>
    </button>
  );
}
