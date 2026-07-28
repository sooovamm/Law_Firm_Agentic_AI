import type { BadgeProps } from "@/components/ui/badge";
import type { CaseStatus, CaseUrgency } from "@/types";

type Variant = NonNullable<BadgeProps["variant"]>;

export const statusVariant: Record<CaseStatus, Variant> = {
  open: "success",
  in_progress: "info",
  on_hold: "warning",
  closed: "default",
};

export const urgencyVariant: Record<CaseUrgency, Variant> = {
  low: "default",
  medium: "info",
  high: "warning",
  critical: "danger",
};

export function labelize(value: string): string {
  return value.replace(/_/g, " ");
}
