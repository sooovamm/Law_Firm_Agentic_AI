"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, FileText, Plus, Search, Trash2 } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { UploadDialog } from "@/components/documents/upload-dialog";
import { DocumentDrawer } from "@/components/documents/document-drawer";
import {
  docTypeStyles,
  formatBytes,
  labelize,
  statusStyles,
} from "@/components/documents/helpers";
import { api, ApiError } from "@/lib/api";
import type { DocumentItem } from "@/types";
import { cn } from "@/lib/utils";
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
          <h1 className="text-2xl font-semibold text-slate-900">Document Manager</h1>
          <p className="text-sm text-slate-500">
            Upload, search, and review AI-processed case documents.
          </p>
        </div>
        <button
          onClick={() => setUploadOpen(true)}
          className="inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
        >
          <Plus className="h-4 w-4" />
          Upload
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by filename, summary, or contents..."
          className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
      </div>

      {error && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 text-sm text-slate-500">Loading documents...</div>
          ) : documents.length === 0 ? (
            <div className="flex flex-col items-center gap-3 p-10 text-center">
              <FileText className="h-8 w-8 text-slate-300" />
              <p className="text-sm text-slate-500">
                {search ? "No documents match your search." : "No documents yet."}
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 text-left text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-medium">Filename</th>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Size</th>
                  <th className="px-5 py-3 font-medium">Uploaded</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {documents.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <button
                        onClick={() => setSelectedId(d.id)}
                        className="font-medium text-slate-900 hover:text-brand hover:underline"
                      >
                        {d.filename}
                      </button>
                    </td>
                    <td className="px-5 py-3">
                      {d.document_type ? (
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                            docTypeStyles[d.document_type],
                          )}
                        >
                          {labelize(d.document_type)}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                          statusStyles[d.processing_status],
                        )}
                      >
                        {d.processing_status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-500">{formatBytes(d.size_bytes)}</td>
                    <td className="px-5 py-3 text-slate-500">
                      {new Date(d.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleDownload(d.id, d.filename)}
                          className="text-slate-400 hover:text-brand"
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(d.id)}
                          className="text-slate-400 hover:text-red-600"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
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
