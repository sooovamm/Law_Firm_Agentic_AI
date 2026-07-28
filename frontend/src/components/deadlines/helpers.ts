import type { BadgeProps } from "@/components/ui/badge";
import type { DeadlinePriority, DeadlineType } from "@/types";

type Variant = NonNullable<BadgeProps["variant"]>;

export const priorityVariant: Record<DeadlinePriority, Variant> = {
  low: "default",
  medium: "info",
  high: "warning",
  critical: "danger",
};

export const typeVariant: Record<DeadlineType, Variant> = {
  hearing: "brand",
  filing: "info",
  appeal: "warning",
  evidence: "success",
  other: "default",
};

export function formatDeadlineDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function daysUntil(iso: string): number {
  const due = new Date(iso).getTime();
  const now = Date.now();
  return Math.ceil((due - now) / 86400000);
}
