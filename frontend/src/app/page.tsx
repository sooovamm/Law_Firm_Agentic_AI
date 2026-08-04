"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Scale } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    router.replace(user ? "/dashboard" : "/login");
  }, [user, loading, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 dark:bg-slate-950">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 text-white shadow-glow">
        <Scale className="h-6 w-6" strokeWidth={2.25} />
      </div>
      <Loader2 className="h-4 w-4 animate-spin text-slate-400 dark:text-slate-500" />
    </div>
  );
}
