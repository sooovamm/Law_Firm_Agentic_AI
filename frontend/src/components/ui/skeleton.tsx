import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("skeleton-shimmer animate-shimmer rounded-md bg-slate-200/60 dark:bg-slate-800/60", className)}
      {...props}
    />
  );
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn("h-3.5", i === lines - 1 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-3.5">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <Skeleton className="h-3.5 w-1/3" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      </div>
      <Skeleton className="h-5 w-16 shrink-0 rounded-full" />
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-soft ring-1 ring-slate-900/5 dark:bg-slate-900 dark:ring-white/[0.06]">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-16" />
        </div>
        <Skeleton className="h-11 w-11 rounded-full" />
      </div>
    </div>
  );
}
