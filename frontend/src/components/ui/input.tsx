import { forwardRef, type InputHTMLAttributes, type LabelHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: ReactNode;
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, icon, error, ...props }, ref) => {
    if (icon) {
      return (
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
            {icon}
          </span>
          <input
            ref={ref}
            className={cn(
              "w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 shadow-soft transition-colors dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100",
              "placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20",
              "disabled:cursor-not-allowed disabled:bg-slate-50 dark:disabled:bg-slate-950",
              error && "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20",
              className,
            )}
            {...props}
          />
        </div>
      );
    }
    return (
      <input
        ref={ref}
        className={cn(
          "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-soft transition-colors dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100",
          "placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20",
          "disabled:cursor-not-allowed disabled:bg-slate-50 dark:disabled:bg-slate-950",
          error && "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300", className)}
      {...props}
    />
  );
}
