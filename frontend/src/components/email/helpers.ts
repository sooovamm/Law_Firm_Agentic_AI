import type { BadgeProps } from "@/components/ui/badge";
import type { EmailStatus, EmailUrgency } from "@/types";
import { formatDateTime } from "@/lib/date";

export const formatEmailDate = formatDateTime;

type Variant = NonNullable<BadgeProps["variant"]>;

export const emailStatusVariant: Record<EmailStatus, Variant> = {
  received: "info",
  processed: "brand",
  replied: "success",
  failed: "danger",
};

export const emailUrgencyVariant: Record<EmailUrgency, Variant> = {
  low: "default",
  medium: "info",
  high: "warning",
  critical: "danger",
};
