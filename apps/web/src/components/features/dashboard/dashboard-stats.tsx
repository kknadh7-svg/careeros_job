"use client";

import { motion } from "framer-motion";
import {
  Briefcase,
  Calendar,
  TrendingUp,
  Star,
  FileText,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardStatsProps {
  stats: {
    totalApplications: number;
    interviews: number;
    offers: number;
    responseRate: number;
    savedJobs: number;
    resumeCount: number;
    atsScore: number | null;
  };
}

export function DashboardStats({ stats }: DashboardStatsProps) {
  const statCards = [
    {
      label: "Applications",
      value: stats.totalApplications,
      icon: Briefcase,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      suffix: "",
    },
    {
      label: "Interviews",
      value: stats.interviews,
      icon: Calendar,
      color: "text-green-400",
      bg: "bg-green-500/10",
      suffix: "",
    },
    {
      label: "Response Rate",
      value: stats.responseRate,
      icon: TrendingUp,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
      suffix: "%",
    },
    {
      label: "Offers",
      value: stats.offers,
      icon: Star,
      color: "text-yellow-400",
      bg: "bg-yellow-500/10",
      suffix: "",
    },
    {
      label: "Saved Jobs",
      value: stats.savedJobs,
      icon: Target,
      color: "text-cyan-400",
      bg: "bg-cyan-500/10",
      suffix: "",
    },
    {
      label: "ATS Score",
      value: stats.atsScore ?? "—",
      icon: FileText,
      color: stats.atsScore
        ? stats.atsScore >= 80
          ? "text-green-400"
          : stats.atsScore >= 60
          ? "text-yellow-400"
          : "text-red-400"
        : "text-muted-foreground",
      bg: "bg-brand-500/10",
      suffix: stats.atsScore ? "/100" : "",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {statCards.map((card, i) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="bg-card rounded-xl border border-border/50 p-4"
        >
          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-3", card.bg)}>
            <card.icon className={cn("w-4 h-4", card.color)} />
          </div>
          <div className={cn("text-2xl font-bold mb-0.5", card.color)}>
            {card.value}{card.suffix}
          </div>
          <div className="text-xs text-muted-foreground">{card.label}</div>
        </motion.div>
      ))}
    </div>
  );
}
