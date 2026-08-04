"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, FileText, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchInput } from "@/components/ui/search-input";
import { SkeletonRow } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeadCell, TableRow } from "@/components/ui/table";
import { UploadDialog } from "@/components/documents/upload-dialog";
import { DocumentDrawer } from "@/components/documents/document-drawer";
import { docTypeVariant, formatBytes, labelize, statusVariant } from "@/components/documents/helpers";
import { api, ApiError } from "@/lib/api";
import type { DocumentItem } from "@/types";
import { downloadBlob } from "@/lib/download-file";

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const load = useCallback(async (query?: string) => {
    setLoading(true);
    try {
      const data = await api.listDocuments(query ? { q: query } : undefined);
      setDocuments(data);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Debounced search.
  useEffect(() => {
    const t = setTimeout(() => load(search.trim() || undefined), 300);
    return () => clearTimeout(t);
  }, [search, load]);

  async function handleDelete(id: number) {
    if (!confirm("Delete this document? This cannot be undone.")) return;
    try {
      await api.deleteDocument(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Delete failed");
    }
  }

  async function handleDownload(id: number, filename: string) {
    try {
      const blob = await api.getDocumentBlob(id);
      downloadBlob(blob, filename);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Download failed");
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Document Manager</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Upload, search, and review AI-processed case documents.
          </p>
        </div>
        <Button onClick={() => setUploadOpen(true)}>
          <Plus className="h-4 w-4" />
          Upload
        </Button>
      </div>

      <SearchInput
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by filename, summary, or contents..."
      />

      {error && (
        <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/20">
          {error}
        </div>
      )}

      <Card className="overflow-hidden">
        {loading ? (
          <div className="divide-y divide-slate-50 dark:divide-slate-800/60">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </div>
        ) : documents.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={search ? "No documents match your search" : "No documents yet"}
            description={
              search
                ? "Try a different filename or keyword."
                : "Upload contracts, evidence, or correspondence to have AI extract key facts automatically."
            }
            primaryAction={
              !search && (
                <Button onClick={() => setUploadOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Upload a document
                </Button>
              )
            }
          />
        ) : (
          <Table>
            <TableHead>
              <tr>
                <TableHeadCell>Filename</TableHeadCell>
                <TableHeadCell>Type</TableHeadCell>
                <TableHeadCell>Status</TableHeadCell>
                <TableHeadCell>Size</TableHeadCell>
                <TableHeadCell>Uploaded</TableHeadCell>
                <TableHeadCell />
              </tr>
            </TableHead>
            <TableBody>
              {documents.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>
                    <button
                      onClick={() => setSelectedId(d.id)}
                      className="font-medium text-slate-900 hover:text-brand-600 hover:underline dark:text-slate-100 dark:hover:text-brand-400"
                    >
                      {d.filename}
                    </button>
                  </TableCell>
                  <TableCell>
                    {d.document_type ? (
                      <Badge variant={docTypeVariant[d.document_type]}>{labelize(d.document_type)}</Badge>
                    ) : (
                      <span className="text-xs text-slate-400 dark:text-slate-500">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[d.processing_status]}>{d.processing_status}</Badge>
                  </TableCell>
                  <TableCell className="text-slate-500 dark:text-slate-400">{formatBytes(d.size_bytes)}</TableCell>
                  <TableCell className="text-slate-500 dark:text-slate-400">
                    {new Date(d.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleDownload(d.id, d.filename)}
                        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-brand-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-brand-400"
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(d.id)}
                        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:text-slate-500 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <UploadDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={() => load(search.trim() || undefined)}
      />
      {selectedId !== null && (
        <DocumentDrawer documentId={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}
