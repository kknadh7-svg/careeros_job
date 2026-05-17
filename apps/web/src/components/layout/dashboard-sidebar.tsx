"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import {
  LayoutDashboard,
  FileText,
  Search,
  Briefcase,
  Mic,
  BarChart3,
  Settings,
  Zap,
  ChevronRight,
  Bot,
  Brain,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    href: "/resumes",
    label: "Resumes",
    icon: FileText,
  },
  {
    href: "/jobs",
    label: "Jobs",
    icon: Search,
    badge: "New",
  },
  {
    href: "/applications",
    label: "Applications",
    icon: Briefcase,
  },
  {
    href: "/interviews",
    label: "Interviews",
    icon: Mic,
  },
  {
    href: "/practice",
    label: "Practice",
    icon: Brain,
    badge: "AI",
  },
  {
    href: "/analytics",
    label: "Analytics",
    icon: BarChart3,
  },
];

const BOTTOM_ITEMS = [
  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
  },
];

export function DashboardSidebar() {
  const pathname = usePathname();

  function isActive(href: string, exact = false): boolean {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <aside className="hidden md:flex w-60 flex-col border-r border-border/50 bg-card">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-border/50">
        <div className="w-7 h-7 rounded-lg bg-brand-gradient flex items-center justify-center">
          <Bot className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-base tracking-tight">CareerOS</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              isActive(item.href, item.exact)
                ? "bg-brand-500/15 text-brand-400"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
          >
            <item.icon className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">{item.label}</span>
            {item.badge && (
              <Badge
                variant="secondary"
                className="text-[10px] px-1.5 py-0 h-4 bg-brand-500/20 text-brand-400 border-0"
              >
                {item.badge}
              </Badge>
            )}
            {isActive(item.href, item.exact) && (
              <ChevronRight className="w-3 h-3 opacity-50" />
            )}
          </Link>
        ))}
      </nav>

      {/* AI Agent status pill */}
      <div className="mx-3 mb-3 px-3 py-2.5 rounded-lg bg-brand-500/10 border border-brand-500/20">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-muted-foreground font-medium">
            AI Agent Active
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 opacity-70">
          Scanning 1,247 jobs for you
        </p>
      </div>

      {/* Bottom items */}
      <div className="px-3 pb-4 space-y-0.5 border-t border-border/50 pt-3">
        {BOTTOM_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              isActive(item.href)
                ? "bg-brand-500/15 text-brand-400"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </Link>
        ))}

        {/* User button */}
        <div className="flex items-center gap-3 px-3 py-2 mt-1">
          <UserButton
            appearance={{
              elements: {
                avatarBox: "w-7 h-7",
              },
            }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">My Account</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
