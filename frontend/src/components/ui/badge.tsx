import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset",
  {
    variants: {
      variant: {
        default: "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",
        brand: "bg-brand-50 text-brand-700 ring-brand-100 dark:bg-brand-500/10 dark:text-brand-300 dark:ring-brand-500/20",
        success:
          "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20",
        warning:
          "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20",
        danger: "bg-rose-50 text-rose-700 ring-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/20",
        info: "bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/20",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
