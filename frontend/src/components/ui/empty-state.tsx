import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-1 rounded-2xl px-6 py-16 text-center",
        className,
      )}
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-50 to-brand-100 text-brand-600 dark:from-brand-500/10 dark:to-brand-500/5 dark:text-brand-400">
        <Icon className="h-6 w-6" strokeWidth={1.75} />
      </div>
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{description}</p>
      )}
      {(primaryAction || secondaryAction) && (
        <div className="mt-5 flex items-center gap-3">
          {primaryAction}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}
