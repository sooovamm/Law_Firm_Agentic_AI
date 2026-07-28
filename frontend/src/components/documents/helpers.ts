import type { DocumentType, ProcessingStatus } from "@/types";

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export const docTypeStyles: Record<DocumentType, string> = {
  employment: "bg-blue-50 text-blue-700",
  medical: "bg-rose-50 text-rose-700",
  contract: "bg-violet-50 text-violet-700",
  evidence: "bg-amber-50 text-amber-700",
  police_report: "bg-slate-200 text-slate-700",
  other: "bg-slate-100 text-slate-600",
};

export const statusStyles: Record<ProcessingStatus, string> = {
  pending: "bg-slate-100 text-slate-600",
  processing: "bg-amber-50 text-amber-700",
  completed: "bg-emerald-50 text-emerald-700",
  failed: "bg-red-50 text-red-700",
};

export function labelize(value: string): string {
  return value.replace(/_/g, " ");
}
