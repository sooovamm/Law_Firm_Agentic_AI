"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlarmClock, Briefcase, CalendarClock, FileText, LayoutDashboard, LogOut, Mail, MessageSquare, Scale, Users } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/intake", label: "AI Intake", icon: MessageSquare },
  { href: "/dashboard/emails", label: "Inbox", icon: Mail },
  { href: "/dashboard/documents", label: "Documents", icon: FileText },
  { href: "/dashboard/cases", label: "Cases", icon: Briefcase },
  { href: "/dashboard/consultations", label: "Consultations", icon: CalendarClock },
  { href: "/dashboard/deadlines", label: "Deadlines", icon: AlarmClock },
  { href: "/dashboard/clients", label: "Clients", icon: Users },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-5">
        <Scale className="h-6 w-6 text-brand" />
        <span className="text-lg font-semibold text-slate-900">Legal CMS</span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/dashboard" ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-brand/10 text-brand"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-100 px-4 py-4">
        <div className="mb-3">
          <p className="truncate text-sm font-medium text-slate-900">{user?.full_name}</p>
          <p className="truncate text-xs capitalize text-slate-500">{user?.role}</p>
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-red-600"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
