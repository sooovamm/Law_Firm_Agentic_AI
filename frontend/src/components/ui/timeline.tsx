import { cn } from "@/lib/utils";

export interface TimelineItem {
  label: string;
  detail?: string | null;
  timestamp: string;
}

export function Timeline({ items, formatTimestamp }: { items: TimelineItem[]; formatTimestamp: (iso: string) => string }) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-400 dark:text-slate-500">No timeline entries.</p>;
  }

  return (
    <ol className="relative space-y-5 border-l border-slate-200 pl-6 dark:border-slate-800">
      {items.map((item, i) => (
        <li key={i} className="relative">
          <span
            className={cn(
              "absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-white bg-brand-600 dark:border-slate-900 dark:bg-brand-500",
            )}
          />
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{item.label}</p>
          {item.detail && <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">{item.detail}</p>}
          <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{formatTimestamp(item.timestamp)}</p>
        </li>
      ))}
    </ol>
  );
}
