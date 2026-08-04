import Link from "next/link";
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ListRowProps extends HTMLAttributes<HTMLDivElement> {
  href?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
}

/** The "flex items-center justify-between px-5 py-3" idiom used across panels, buckets, and lists. */
export function ListRow({ href, leading, trailing, children, className, ...props }: ListRowProps) {
  const content = (
    <div
      className={cn(
        "flex items-center justify-between gap-3 px-5 py-3 text-sm transition-colors",
        href && "hover:bg-slate-50 dark:hover:bg-slate-800/40",
        className,
      )}
      {...props}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {leading}
        <div className="min-w-0 flex-1">{children}</div>
      </div>
      {trailing && <div className="flex shrink-0 items-center gap-2 pl-2">{trailing}</div>}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }
  return content;
}

export function ListRowTitle({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("truncate text-sm font-medium text-slate-900 dark:text-slate-100", className)} {...props} />;
}

export function ListRowSubtitle({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("truncate text-xs text-slate-500 dark:text-slate-400", className)} {...props} />;
}
