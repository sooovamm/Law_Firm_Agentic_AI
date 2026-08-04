import type { BadgeProps } from "@/components/ui/badge";
import type { DeadlinePriority, DeadlineType } from "@/types";
import { formatWeekdayDateTime, toDateKey, daysUntil } from "@/lib/date";

export { toDateKey, daysUntil };
export const formatDeadlineDate = formatWeekdayDateTime;

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
