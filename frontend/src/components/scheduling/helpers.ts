import type { BadgeProps } from "@/components/ui/badge";
import type { ConsultationStatus } from "@/types";
import { formatTime, formatWeekdayDate, formatWeekdayDateTime, toDateKey } from "@/lib/date";

export { formatTime };
export const formatDate = formatWeekdayDate;
export const formatDateTime = formatWeekdayDateTime;
/** Local YYYY-MM-DD for a Date, used for date inputs and day grouping. */
export const toDateInput = toDateKey;

type Variant = NonNullable<BadgeProps["variant"]>;

export const consultationStatusVariant: Record<ConsultationStatus, Variant> = {
  pending: "warning",
  confirmed: "success",
  completed: "default",
  cancelled: "danger",
};
