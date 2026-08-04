"use client";

import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const avatarVariants = cva(
  "inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-brand-500 to-brand-700 font-medium text-white",
  {
    variants: {
      size: {
        sm: "h-7 w-7 text-xs",
        md: "h-9 w-9 text-sm",
        lg: "h-11 w-11 text-base",
      },
    },
    defaultVariants: { size: "md" },
  },
);

interface AvatarProps extends VariantProps<typeof avatarVariants> {
  name?: string | null;
  src?: string | null;
  className?: string;
}

function initials(name?: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (first + last).toUpperCase() || "?";
}

export function Avatar({ name, src, size, className }: AvatarProps) {
  return (
    <AvatarPrimitive.Root className={cn(avatarVariants({ size }), className)}>
      {src && <AvatarPrimitive.Image src={src} alt={name ?? "Avatar"} className="h-full w-full object-cover" />}
      <AvatarPrimitive.Fallback delayMs={src ? 400 : 0}>{initials(name)}</AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}
