"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Sparkles, Brain, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const STATS = [
  { value: "87%", label: "Higher Interview Rate" },
  { value: "3hrs", label: "Saved Per Application" },
  { value: "25pts", label: "Avg ATS Score Boost" },
  { value: "10k+", label: "Jobs Applied Daily" },
];

const floatingBadges = [
  { icon: "🎯", text: "ATS Score: 94/100", delay: 0 },
  { icon: "✉️", text: "Interview Invitation!", delay: 0.3 },
  { icon: "🤖", text: "AI tailored your resume", delay: 0.6 },
  { icon: "📊", text: "12 new job matches", delay: 0.9 },
];

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-24 pb-16 md:pt-32 md:pb-24">
      {/* Background gradient */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99,102,241,0.15) 0%, transparent 60%)",
        }}
      />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 -z-10 opacity-20"
        style={{
          backgroundImage:
            "linear-gradient(rgba(99,102,241,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="container mx-auto px-4 text-center">
        {/* Announcement badge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex justify-center mb-6"
        >
          <Badge
            variant="outline"
            className="px-4 py-1.5 text-sm border-brand-500/30 bg-brand-500/10 text-brand-400 gap-2"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Powered by GPT-4o, Claude & Gemini
          </Badge>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-[1.1]"
        >
          Your AI Career Agent
          <br />
          <span className="gradient-text">That Never Sleeps</span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          CareerOS finds the right jobs, tailors your resume, auto-applies with
          your approval, and coaches you through interviews — all with AI.
          Land your dream job 3x faster.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
        >
          <Button
            size="lg"
            asChild
            className="gap-2 text-base h-12 px-8 bg-brand-500 hover:bg-brand-600 shadow-[0_0_20px_rgba(99,102,241,0.4)]"
          >
            <Link href="/sign-up">
              Start for Free
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            asChild
            className="gap-2 text-base h-12 px-8 border-border/60"
          >
            <Link href="#demo">
              <Brain className="w-4 h-4" />
              See AI in Action
            </Link>
          </Button>
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto mb-20"
        >
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl font-bold text-foreground mb-1 gradient-text">
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </motion.div>

        {/* Dashboard preview */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="relative max-w-5xl mx-auto"
        >
          {/* Floating notification badges */}
          {floatingBadges.map((badge, i) => (
            <motion.div
              key={badge.text}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1 + badge.delay, duration: 0.4 }}
              className={`absolute z-10 hidden md:flex items-center gap-2 bg-card border border-border/60 rounded-full px-3 py-1.5 text-sm shadow-lg ${
                i === 0
                  ? "-top-3 left-8"
                  : i === 1
                  ? "-top-3 right-8"
                  : i === 2
                  ? "-bottom-3 left-16"
                  : "-bottom-3 right-16"
              }`}
            >
              <span>{badge.icon}</span>
              <span className="text-foreground font-medium">{badge.text}</span>
            </motion.div>
          ))}

          {/* Mock dashboard */}
          <div className="rounded-2xl border border-border/40 overflow-hidden shadow-2xl bg-card">
            {/* Window bar */}
            <div className="flex items-center gap-2 px-4 py-3 bg-muted/30 border-b border-border/40">
              <div className="w-3 h-3 rounded-full bg-destructive/60" />
              <div className="w-3 h-3 rounded-full bg-warning/60" />
              <div className="w-3 h-3 rounded-full bg-success/60" />
              <div className="flex-1 ml-3">
                <div className="h-5 w-48 rounded bg-border/40 mx-auto" />
              </div>
            </div>

            {/* Dashboard content mock */}
            <div className="p-6 grid grid-cols-3 gap-4 bg-surface-DEFAULT">
              {/* Sidebar */}
              <div className="col-span-1 space-y-2">
                {["Dashboard", "Resumes", "Jobs", "Applications", "Interviews"].map(
                  (item, i) => (
                    <div
                      key={item}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
                        i === 0
                          ? "bg-brand-500/20 text-brand-400 font-medium"
                          : "text-muted-foreground"
                      }`}
                    >
                      <div className="w-4 h-4 rounded bg-current opacity-40" />
                      {item}
                    </div>
                  )
                )}
              </div>

              {/* Main content */}
              <div className="col-span-2 space-y-3">
                {/* Stats cards */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Applied", value: "47", color: "text-blue-400" },
                    { label: "Interviews", value: "8", color: "text-green-400" },
                    { label: "ATS Score", value: "89", color: "text-brand-400" },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-card rounded-lg p-3 border border-border/40">
                      <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
                      <div className="text-xs text-muted-foreground">{stat.label}</div>
                    </div>
                  ))}
                </div>
                {/* Job cards */}
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 bg-card rounded-lg border border-border/40"
                  >
                    <div className="w-8 h-8 rounded bg-brand-500/20 flex-shrink-0" />
                    <div className="flex-1 space-y-1">
                      <div className="h-3 w-32 rounded bg-muted" />
                      <div className="h-2 w-24 rounded bg-muted/60" />
                    </div>
                    <div className="text-xs text-green-400 font-medium">
                      {91 - i * 5}% match
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Glow effect */}
          <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-brand-500/20 to-transparent opacity-50 pointer-events-none" />
        </motion.div>
      </div>
    </section>
  );
}
