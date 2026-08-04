"use client";

import { useEffect, useRef, useState } from "react";
import { FileCheck2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import { api, ApiError } from "@/lib/api";
import { formatBytes } from "@/components/documents/helpers";
import { cn } from "@/lib/utils";

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
  const [progress, setProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Simulated progress: the upload API has no byte-level progress events, so
  // this animates toward (but never reaches) completion while the request is in flight.
  useEffect(() => {
    if (!uploading) {
      setProgress(0);
      return;
    }
    const interval = setInterval(() => {
      setProgress((p) => (p >= 90 ? p : p + (90 - p) * 0.15));
    }, 150);
    return () => clearInterval(interval);
  }, [uploading]);

  function reset() {
    setFile(null);
    setCaseId("");
    setError(null);
  }

  async function handleUpload() {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      await api.uploadDocument(file, caseId ? { case_id: Number(caseId) } : undefined);
      setProgress(100);
      await new Promise((r) => setTimeout(r, 250));
      reset();
      onUploaded();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) setFile(dropped);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        size="md"
        onCloseAutoFocus={() => reset()}
      >
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>PDF, DOCX, PNG, or JPG — AI will extract key facts automatically.</DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {error && (
            <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/20">
              {error}
            </div>
          )}

          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            className={cn(
              "flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors",
              dragActive
                ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10"
                : "border-slate-200 hover:border-brand-300 dark:border-slate-700 dark:hover:border-brand-500/40",
            )}
          >
            {file ? (
              <>
                <FileCheck2 className="h-6 w-6 text-brand-600 dark:text-brand-400" />
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{file.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{formatBytes(file.size)}</p>
                </div>
              </>
            ) : (
              <>
                <Upload className="h-6 w-6 text-slate-400 dark:text-slate-500" />
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Drag & drop, or click to choose a file</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">PDF, DOCX, PNG, or JPG</p>
                </div>
              </>
            )}
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED}
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>

          {uploading && (
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-brand-600 transition-[width] duration-150 ease-out dark:bg-brand-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          <div>
            <Label htmlFor="upload-case-id">Case ID (optional)</Label>
            <Input
              id="upload-case-id"
              value={caseId}
              onChange={(e) => setCaseId(e.target.value.replace(/\D/g, ""))}
              placeholder="Link to a case to auto-update its summary"
            />
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="secondary" onClick={onClose} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={handleUpload} loading={uploading} disabled={!file}>
            Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
