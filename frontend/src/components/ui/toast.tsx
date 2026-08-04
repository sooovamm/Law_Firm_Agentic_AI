"use client";

import * as React from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastVariant = "success" | "error" | "info";

interface ToastItem {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (opts: { title: string; description?: string; variant?: ToastVariant }) => void;
}

const ToastContext = React.createContext<ToastContextValue | undefined>(undefined);

const variantConfig: Record<ToastVariant, { icon: typeof CheckCircle2; className: string }> = {
  success: { icon: CheckCircle2, className: "text-emerald-500" },
  error: { icon: XCircle, className: "text-rose-500" },
  info: { icon: Info, className: "text-brand-500" },
};

let idCounter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const toast = React.useCallback((opts: { title: string; description?: string; variant?: ToastVariant }) => {
    const id = ++idCounter;
    setToasts((prev) => [...prev, { id, variant: "info", ...opts }]);
  }, []);

  const dismiss = React.useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      <ToastPrimitive.Provider swipeDirection="right" duration={4000}>
        {children}
        {toasts.map(({ id, title, description, variant }) => {
          const { icon: Icon, className } = variantConfig[variant];
          return (
            <ToastPrimitive.Root
              key={id}
              onOpenChange={(open) => !open && dismiss(id)}
              className={cn(
                "group pointer-events-auto flex w-full items-start gap-3 rounded-xl bg-white p-4 shadow-floating ring-1 ring-slate-900/5 data-[state=open]:animate-slide-up dark:bg-slate-900 dark:ring-white/10",
              )}
            >
              <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", className)} />
              <div className="flex-1 space-y-0.5">
                <ToastPrimitive.Title className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {title}
                </ToastPrimitive.Title>
                {description && (
                  <ToastPrimitive.Description className="text-sm text-slate-500 dark:text-slate-400">
                    {description}
                  </ToastPrimitive.Description>
                )}
              </div>
              <ToastPrimitive.Close className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <X className="h-4 w-4" />
              </ToastPrimitive.Close>
            </ToastPrimitive.Root>
          );
        })}
        <ToastPrimitive.Viewport className="fixed bottom-0 right-0 z-[100] m-0 flex w-full max-w-sm list-none flex-col gap-2 p-4 outline-none" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
