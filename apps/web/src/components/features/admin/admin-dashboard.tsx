"use client";

import { motion } from "framer-motion";
import {
  Users,
  Briefcase,
  FileText,
  Mic,
  Cpu,
  DollarSign,
  TrendingUp,
  Globe,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface AdminStats {
  totalUsers: number;
  newUsersThisMonth: number;
  planBreakdown: Record<string, number>;
  totalApplications: number;
  totalResumes: number;
  totalInterviews: number;
  aiUsage: {
    totalTokens: number;
    totalCostUsd: number;
    callCount: number;
  };
  activeBrowserSessions: number;
  recentUsers: Array<{
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    plan: string;
    createdAt: Date;
    _count: { applications: number; resumes: number };
  }>;
}

interface AdminDashboardProps {
  stats: AdminStats;
}

export function AdminDashboard({ stats }: AdminDashboardProps) {
  const topLevelStats = [
    {
      title: "Total Users",
      value: stats.totalUsers.toLocaleString(),
      sub: `+${stats.newUsersThisMonth} this month`,
      icon: Users,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      title: "Applications",
      value: stats.totalApplications.toLocaleString(),
      icon: Briefcase,
      color: "text-green-400",
      bg: "bg-green-500/10",
    },
    {
      title: "Resumes",
      value: stats.totalResumes.toLocaleString(),
      icon: FileText,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
    },
    {
      title: "Interviews",
      value: stats.totalInterviews.toLocaleString(),
      icon: Mic,
      color: "text-orange-400",
      bg: "bg-orange-500/10",
    },
    {
      title: "AI Calls (30d)",
      value: stats.aiUsage.callCount.toLocaleString(),
      sub: `${(stats.aiUsage.totalTokens / 1_000_000).toFixed(2)}M tokens`,
      icon: Cpu,
      color: "text-cyan-400",
      bg: "bg-cyan-500/10",
    },
    {
      title: "AI Cost (30d)",
      value: `$${stats.aiUsage.totalCostUsd.toFixed(2)}`,
      sub: `$${(stats.aiUsage.totalCostUsd / Math.max(stats.totalUsers, 1)).toFixed(3)}/user`,
      icon: DollarSign,
      color: "text-yellow-400",
      bg: "bg-yellow-500/10",
    },
    {
      title: "Active Sessions",
      value: stats.activeBrowserSessions.toString(),
      sub: "Browser automation",
      icon: Globe,
      color: "text-pink-400",
      bg: "bg-pink-500/10",
    },
    {
      title: "Pro Conversion",
      value:
        stats.totalUsers > 0
          ? `${Math.round(((stats.planBreakdown.PRO ?? 0) / stats.totalUsers) * 100)}%`
          : "0%",
      sub: `${stats.planBreakdown.PRO ?? 0} Pro · ${stats.planBreakdown.ENTERPRISE ?? 0} Enterprise`,
      icon: TrendingUp,
      color: "text-brand-400",
      bg: "bg-brand-500/10",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {topLevelStats.map((stat, i) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
          >
            <Card>
              <CardContent className="pt-5 pb-4">
                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center mb-3", stat.bg)}>
                  <stat.icon className={cn("w-4.5 h-4.5", stat.color)} />
                </div>
                <div className={cn("text-2xl font-bold mb-0.5", stat.color)}>
                  {stat.value}
                </div>
                <div className="text-xs text-muted-foreground">{stat.title}</div>
                {stat.sub && (
                  <div className="text-[11px] text-muted-foreground/70 mt-0.5">
                    {stat.sub}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Plan breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Plan Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-6">
            {(["FREE", "PRO", "ENTERPRISE"] as const).map((plan) => {
              const count = stats.planBreakdown[plan] ?? 0;
              const pct = stats.totalUsers > 0
                ? Math.round((count / stats.totalUsers) * 100)
                : 0;
              return (
                <div key={plan} className="text-center">
                  <div className="text-2xl font-bold">{count}</div>
                  <div className="text-sm text-muted-foreground">{plan}</div>
                  <div className="text-xs text-muted-foreground">{pct}%</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent users table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Users</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Resumes</TableHead>
                <TableHead>Applications</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.recentUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium text-sm">
                        {[user.firstName, user.lastName].filter(Boolean).join(" ") || "—"}
                      </div>
                      <div className="text-xs text-muted-foreground">{user.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-xs",
                        user.plan === "PRO"
                          ? "bg-brand-500/15 text-brand-400"
                          : user.plan === "ENTERPRISE"
                          ? "bg-yellow-500/15 text-yellow-400"
                          : ""
                      )}
                    >
                      {user.plan}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{user._count.resumes}</TableCell>
                  <TableCell className="text-sm">{user._count.applications}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
