import type { BadgeProps } from "@/components/ui/badge";
import type { ConsultationStatus } from "@/types";

type Variant = NonNullable<BadgeProps["variant"]>;

export const consultationStatusVariant: Record<ConsultationStatus, Variant> = {
  pending: "warning",
  confirmed: "success",
  completed: "default",
  cancelled: "danger",
};

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(iso: string): string {
  return `${formatDate(iso)}, ${formatTime(iso)}`;
}

/** Local YYYY-MM-DD for a Date, used for date inputs and day grouping. */
export function toDateInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
