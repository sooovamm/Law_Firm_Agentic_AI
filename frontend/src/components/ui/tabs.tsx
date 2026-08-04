"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

export const Tabs = TabsPrimitive.Root;

export const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800/60",
      className,
    )}
    {...props}
  />
));
TabsList.displayName = "TabsList";

export const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "relative inline-flex items-center justify-center whitespace-nowrap rounded-lg px-3.5 py-1.5 text-sm font-medium text-slate-600 outline-none transition-all duration-200 dark:text-slate-400",
      "data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-soft dark:data-[state=active]:bg-slate-900 dark:data-[state=active]:text-slate-100",
      "focus-visible:ring-2 focus-visible:ring-brand-500/40",
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = "TabsTrigger";

export const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn("mt-4 animate-fade-in focus:outline-none", className)}
    {...props}
  />
));
TabsContent.displayName = "TabsContent";
