import type { BadgeProps } from "@/components/ui/badge";
import type { DocumentType, ProcessingStatus } from "@/types";

export { labelize } from "@/lib/labelize";

type Variant = NonNullable<BadgeProps["variant"]>;

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export const docTypeVariant: Record<DocumentType, Variant> = {
  employment: "info",
  medical: "danger",
  contract: "brand",
  evidence: "warning",
  police_report: "default",
  other: "default",
};

export const statusVariant: Record<ProcessingStatus, Variant> = {
  pending: "default",
  processing: "warning",
  completed: "success",
  failed: "danger",
};
