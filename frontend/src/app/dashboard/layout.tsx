"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Menu, Scale } from "lucide-react";

import { AuthGuard } from "@/components/auth-guard";
import { Sidebar, SidebarContent } from "@/components/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";

/** Redirects lawyers who haven't completed onboarding to the wizard. Kept local
 * to this layout (not in useAuth) so no other AuthContext consumer is affected. */
function useOnboardingGate() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user || user.role !== "lawyer") return;
    let active = true;
    api
      .getLawyerStatus()
      .then((status) => {
        if (active && !status.onboarding_completed) router.replace("/onboarding");
      })
      .catch(() => {
        // Best-effort: if the check fails, let the lawyer continue to the dashboard.
      });
    return () => {
      active = false;
    };
  }, [user, router]);
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  useOnboardingGate();

  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
        <Sidebar />

        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetContent size="sm" className="flex p-0" hideClose>
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <SidebarContent collapsed={false} onNavigate={() => setMobileNavOpen(false)} />
          </SheetContent>
        </Sheet>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-slate-100 bg-white px-4 py-3 dark:border-slate-800/80 dark:bg-slate-900 lg:hidden">
            <button
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open navigation"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-brand-700 dark:text-brand-400" />
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">Legal CMS</span>
            </div>
            <ThemeToggle />
          </header>

          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div className="mx-auto w-full max-w-6xl">{children}</div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
