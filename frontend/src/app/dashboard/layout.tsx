import type { ReactNode } from "react";

import { AuthGuard } from "@/components/auth-guard";
import { Sidebar } from "@/components/sidebar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-slate-50 p-8">{children}</main>
      </div>
    </AuthGuard>
  );
}
