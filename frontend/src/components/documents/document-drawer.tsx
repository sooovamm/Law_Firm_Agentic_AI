"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

import { api, ApiError } from "@/lib/api";
import { downloadBlob } from "@/lib/download-file";
import type { DocumentDetail } from "@/types";
import { docTypeVariant, formatBytes, labelize, statusVariant } from "@/components/documents/helpers";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetBody } from "@/components/ui/sheet";
import { SkeletonText } from "@/components/ui/skeleton";

function FactList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">{title}</p>
      <ul className="mt-1 list-inside list-disc space-y-0.5 text-sm text-slate-700 dark:text-slate-300">
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
    <Sheet open onOpenChange={(next) => !next && onClose()}>
      <SheetContent size="lg">
        <SheetHeader>
          <SheetTitle className="truncate pr-8">{doc?.filename ?? "Document"}</SheetTitle>
        </SheetHeader>

        <SheetBody className="space-y-5">
          {error && (
            <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/20">
              {error}
            </div>
          )}

          {!doc && !error ? (
            <SkeletonText lines={5} />
          ) : doc ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                {doc.document_type && (
                  <Badge variant={docTypeVariant[doc.document_type]}>{labelize(doc.document_type)}</Badge>
                )}
                <Badge variant={statusVariant[doc.processing_status]}>{doc.processing_status}</Badge>
                <span className="text-xs text-slate-400 dark:text-slate-500">{formatBytes(doc.size_bytes)}</span>
              </div>

              {/* Preview */}
              <div className="overflow-hidden rounded-xl bg-slate-50 ring-1 ring-slate-100 dark:bg-slate-800/50 dark:ring-slate-800">
                {isImage ? (
                  previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={previewUrl} alt={doc.filename} className="max-h-64 w-full object-contain" />
                  ) : (
                    <div className="flex h-32 items-center justify-center text-sm text-slate-400 dark:text-slate-500">
                      Loading preview...
                    </div>
                  )
                ) : (
                  <div className="flex h-32 items-center justify-center text-sm text-slate-400 dark:text-slate-500">
                    Preview not available. Use download.
                  </div>
                )}
              </div>

              <button
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
              >
                <Download className="h-4 w-4" />
                Download
              </button>

              {doc.processing_status === "failed" && doc.processing_error && (
                <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/20">
                  Processing failed: {doc.processing_error}
                </div>
              )}

              {doc.summary && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Summary</p>
                  <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{doc.summary}</p>
                </div>
              )}

              <FactList title="Key Facts" items={doc.key_facts} />
              <FactList title="Important Dates" items={doc.important_dates} />
              <FactList title="People" items={doc.people} />
              <FactList title="Organizations" items={doc.organizations} />
              <FactList title="Missing Documents" items={doc.missing_documents} />
            </>
          ) : null}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
