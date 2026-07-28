import type { BadgeProps } from "@/components/ui/badge";
import type { EmailStatus, EmailUrgency } from "@/types";

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

export function formatEmailDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
