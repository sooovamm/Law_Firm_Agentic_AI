import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
  {
    variants: {
      variant: {
        default: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300",
        brand: "bg-brand/10 text-brand",
        success: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400",
        warning: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400",
        danger: "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400",
        info: "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400",
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
