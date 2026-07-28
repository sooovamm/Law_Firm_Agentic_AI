"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

import { api, ApiError } from "@/lib/api";
import { downloadBlob } from "@/lib/download-file";
import type { DocumentDetail } from "@/types";
import { docTypeStyles, formatBytes, labelize, statusStyles } from "@/components/documents/helpers";
import { cn } from "@/lib/utils";

function FactList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-slate-400">{title}</p>
      <ul className="mt-1 list-inside list-disc space-y-0.5 text-sm text-slate-700">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export function DocumentDrawer({
  documentId,
  onClose,
}: {
  documentId: number;
  onClose: () => void;
}) {
  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const data = await api.getDocument(documentId);
        if (active) setDoc(data);
      } catch (err) {
        if (active) setError(err instanceof ApiError ? err.detail : "Failed to load");
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [documentId]);

  const isImage = doc?.content_type.startsWith("image/");

  useEffect(() => {
    if (!doc || !isImage) return;
    let active = true;
    let objectUrl: string | null = null;
    api
      .getDocumentBlob(doc.id)
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setPreviewUrl(objectUrl);
      })
      .catch(() => {
        // Preview is best-effort; the download link still works.
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [doc, isImage]);

  async function handleDownload() {
    if (!doc) return;
    try {
      const blob = await api.getDocumentBlob(doc.id);
      downloadBlob(blob, doc.filename);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Download failed");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <div className="flex h-full w-full max-w-lg flex-col bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="truncate text-base font-semibold text-slate-900">
            {doc?.filename ?? "Document"}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {error && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          )}

          {doc && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                {doc.document_type && (
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                      docTypeStyles[doc.document_type],
                    )}
                  >
                    {labelize(doc.document_type)}
                  </span>
                )}
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                    statusStyles[doc.processing_status],
                  )}
                >
                  {doc.processing_status}
                </span>
                <span className="text-xs text-slate-400">{formatBytes(doc.size_bytes)}</span>
              </div>

              {/* Preview */}
              <div className="overflow-hidden rounded-md border border-slate-200 bg-slate-50">
                {isImage ? (
                  previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewUrl}
                      alt={doc.filename}
                      className="max-h-64 w-full object-contain"
                    />
                  ) : (
                    <div className="flex h-32 items-center justify-center text-sm text-slate-400">
                      Loading preview...
                    </div>
                  )
                ) : (
                  <div className="flex h-32 items-center justify-center text-sm text-slate-400">
                    Preview not available. Use download.
                  </div>
                )}
              </div>

              <button
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
              >
                <Download className="h-4 w-4" />
                Download
              </button>

              {doc.processing_status === "failed" && doc.processing_error && (
                <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                  Processing failed: {doc.processing_error}
                </div>
              )}

              {doc.summary && (
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400">Summary</p>
                  <p className="mt-1 text-sm text-slate-700">{doc.summary}</p>
                </div>
              )}

              <FactList title="Key Facts" items={doc.key_facts} />
              <FactList title="Important Dates" items={doc.important_dates} />
              <FactList title="People" items={doc.people} />
              <FactList title="Organizations" items={doc.organizations} />
              <FactList title="Missing Documents" items={doc.missing_documents} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
