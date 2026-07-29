import type { DocumentType, ProcessingStatus } from "@/types";

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export const docTypeStyles: Record<DocumentType, string> = {
  employment: "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400",
  medical: "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400",
  contract: "bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400",
  evidence: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400",
  police_report: "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300",
  other: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400",
};

export const statusStyles: Record<ProcessingStatus, string> = {
  pending: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400",
  processing: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400",
  completed: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400",
  failed: "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400",
};

export function labelize(value: string): string {
  return value.replace(/_/g, " ");
}
