import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Table({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto">
      <table className={cn("w-full border-collapse text-sm", className)} {...props} />
    </div>
  );
}

export function TableHead({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn(
        "sticky top-0 z-10 bg-white/95 backdrop-blur dark:bg-slate-900/95",
        className,
      )}
      {...props}
    />
  );
}

export function TableHeadCell({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "border-b border-slate-100 px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400 dark:border-slate-800 dark:text-slate-500",
        className,
      )}
      {...props}
    />
  );
}

export function TableBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn("divide-y divide-slate-50 dark:divide-slate-800/60", className)} {...props} />;
}

interface TableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  clickable?: boolean;
}

export function TableRow({ className, clickable, ...props }: TableRowProps) {
  return (
    <tr
      className={cn(
        "transition-colors",
        clickable && "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40",
        className,
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-5 py-3.5 align-middle text-slate-700 dark:text-slate-300", className)} {...props} />;
}
