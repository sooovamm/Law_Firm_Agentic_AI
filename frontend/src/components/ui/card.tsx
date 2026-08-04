import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
}

export function Card({ className, hoverable, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-white shadow-soft ring-1 ring-slate-900/5 dark:bg-slate-900 dark:ring-white/[0.06]",
        hoverable &&
          "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-elevated hover:ring-slate-900/10 dark:hover:ring-white/[0.1]",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("border-b border-slate-100 px-5 py-4 dark:border-slate-800/80", className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100", className)}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("mt-1 text-sm text-slate-500 dark:text-slate-400", className)} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 py-4", className)} {...props} />;
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-center gap-3 border-t border-slate-100 px-5 py-4 dark:border-slate-800/80", className)}
      {...props}
    />
  );
}
