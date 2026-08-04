"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlarmClock,
  Briefcase,
  CalendarClock,
  ChevronsLeft,
  FileText,
  Gavel,
  LayoutDashboard,
  LogOut,
  Mail,
  MessageSquare,
  Scale,
  User as ProfileIcon,
  Users,
} from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar } from "@/components/ui/avatar";
import type { UserRole } from "@/types";

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles?: UserRole[];
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Intelligence",
    items: [
      { href: "/dashboard/intake", label: "AI Intake", icon: MessageSquare },
      { href: "/dashboard/emails", label: "Email Intelligence", icon: Mail },
    ],
  },
  {
    label: "Casework",
    items: [
      { href: "/dashboard/cases", label: "Cases", icon: Briefcase },
      { href: "/dashboard/documents", label: "Documents", icon: FileText },
      { href: "/dashboard/clients", label: "Clients", icon: Users },
    ],
  },
  {
    label: "Scheduling",
    items: [
      { href: "/dashboard/consultations", label: "Consultations", icon: CalendarClock },
      { href: "/dashboard/deadlines", label: "Court Deadlines", icon: AlarmClock },
    ],
  },
  {
    label: "Team",
    items: [
      { href: "/dashboard/profile", label: "My Profile", icon: ProfileIcon, roles: ["lawyer"] },
      { href: "/dashboard/lawyers", label: "Lawyers", icon: Gavel, roles: ["admin"] },
    ],
  },
];

function isActive(pathname: string, href: string): boolean {
  return href === "/dashboard" ? pathname === href : pathname.startsWith(href);
}

interface SidebarContentProps {
  collapsed: boolean;
  onNavigate?: () => void;
}

function SidebarContent({ collapsed, onNavigate }: SidebarContentProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <>
      <div className={cn("flex items-center gap-2.5 px-5 py-5", collapsed && "justify-center px-0")}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 text-white shadow-glow">
          <Scale className="h-4.5 w-4.5" strokeWidth={2.25} />
        </div>
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden whitespace-nowrap"
            >
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Legal CMS</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">AI Workspace</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-2">
        {navGroups.map((group) => {
          const items = group.items.filter(
            (item) => !item.roles || (user && item.roles.includes(user.role)),
          );
          if (items.length === 0) return null;
          return (
          <div key={group.label}>
            {!collapsed && (
              <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-600">
                {group.label}
              </p>
            )}
            <div className="relative space-y-0.5">
              {items.map(({ href, label, icon: Icon }) => {
                const active = isActive(pathname, href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={onNavigate}
                    title={collapsed ? label : undefined}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                      collapsed && "justify-center px-0 py-2.5",
                      active
                        ? "text-brand-700 dark:text-brand-300"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-100",
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="sidebar-active-pill"
                        className="absolute inset-0 rounded-xl bg-brand-50 dark:bg-brand-500/10"
                        transition={{ type: "spring", stiffness: 500, damping: 38 }}
                      />
                    )}
                    <Icon className="relative z-10 h-4 w-4 shrink-0" strokeWidth={2} />
                    {!collapsed && <span className="relative z-10 truncate">{label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
          );
        })}
      </nav>

      <div className="border-t border-slate-100 px-3 py-3 dark:border-slate-800/80">
        <div className={cn("mb-2 flex items-center gap-2.5 rounded-xl px-2 py-2", collapsed && "justify-center px-0")}>
          <Avatar name={user?.full_name} size="sm" />
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{user?.full_name}</p>
              <p className="truncate text-xs capitalize text-slate-400 dark:text-slate-500">{user?.role}</p>
            </div>
          )}
          {!collapsed && <ThemeToggle />}
        </div>
        <button
          onClick={logout}
          title={collapsed ? "Sign out" : undefined}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-400",
            collapsed && "justify-center px-0",
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && "Sign out"}
        </button>
      </div>
    </>
  );
}

const STORAGE_KEY = "sidebar-collapsed";

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setCollapsed(window.localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }

  return (
    <motion.aside
      animate={{ width: collapsed ? 80 : 264 }}
      initial={false}
      transition={{ type: "spring", stiffness: 400, damping: 40 }}
      className={cn(
        "relative hidden shrink-0 flex-col border-r border-slate-100 bg-white dark:border-slate-800/80 dark:bg-slate-900 lg:flex",
        !mounted && "duration-0",
      )}
    >
      <SidebarContent collapsed={collapsed} />
      <button
        onClick={toggleCollapsed}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="absolute -right-3 top-[68px] z-10 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-soft transition-colors hover:text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:hover:text-slate-200"
      >
        <ChevronsLeft className={cn("h-3.5 w-3.5 transition-transform", collapsed && "rotate-180")} />
      </button>
    </motion.aside>
  );
}

export { SidebarContent };
