"use client";

import { useRef, useState } from "react";
import { Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api";
import { formatBytes } from "@/components/documents/helpers";

const ACCEPTED = ".pdf,.docx,.png,.jpg,.jpeg";

export function UploadDialog({
  open,
  onClose,
  onUploaded,
}: {
  open: boolean;
  onClose: () => void;
  onUploaded: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [caseId, setCaseId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleUpload() {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      await api.uploadDocument(file, caseId ? { case_id: Number(caseId) } : undefined);
      setFile(null);
      setCaseId("");
      onUploaded();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">Upload Document</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          {error && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          )}

          <div
            onClick={() => inputRef.current?.click()}
            className="flex cursor-pointer flex-col items-center gap-2 rounded-md border-2 border-dashed border-slate-300 px-4 py-8 text-center hover:border-brand"
          >
            <Upload className="h-6 w-6 text-slate-400" />
            {file ? (
              <div>
                <p className="text-sm font-medium text-slate-900">{file.name}</p>
                <p className="text-xs text-slate-500">{formatBytes(file.size)}</p>
              </div>
            ) : (
              <div>
                <p className="text-sm text-slate-600">Click to choose a file</p>
                <p className="text-xs text-slate-400">PDF, DOCX, PNG, or JPG</p>
              </div>
            )}
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED}
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Case ID (optional)
            </label>
            <input
              value={caseId}
              onChange={(e) => setCaseId(e.target.value.replace(/\D/g, ""))}
              placeholder="Link to a case to auto-update its summary"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
          <Button variant="secondary" onClick={onClose} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={!file || uploading}>
            {uploading ? "Uploading..." : "Upload"}
          </Button>
        </div>
      </div>
    </div>
  );
}
