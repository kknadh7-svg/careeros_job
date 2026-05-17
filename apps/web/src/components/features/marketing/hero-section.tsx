"use client";

import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Brain } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SignUpButton } from "@clerk/nextjs";

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
    <section className="relative overflow-hidden pt-20 pb-12 md:pt-32 md:pb-24">
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99,102,241,0.15) 0%, transparent 60%)",
        }}
      />
      <div
        className="absolute inset-0 -z-10 opacity-20"
        style={{
          backgroundImage:
            "linear-gradient(rgba(99,102,241,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="container mx-auto px-4 text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex justify-center mb-5"
        >
          <Badge variant="outline" className="px-3 py-1 text-xs sm:text-sm border-brand-500/30 bg-brand-500/10 text-brand-400 gap-2">
            <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            Powered by GPT-4o, Claude & Gemini
          </Badge>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-3xl sm:text-5xl md:text-7xl font-bold tracking-tight mb-4 md:mb-6 leading-[1.1]"
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
          className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 md:mb-10 leading-relaxed"
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
          className="flex flex-col sm:flex-row gap-3 justify-center mb-12 md:mb-16"
        >
          <SignUpButton mode="modal">
            <button className="inline-flex items-center justify-center gap-2 text-sm sm:text-base h-11 sm:h-12 px-6 sm:px-8 rounded-md bg-brand-500 hover:bg-brand-600 text-white font-medium shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-colors w-full sm:w-auto">
              Start for Free
              <ArrowRight className="w-4 h-4" />
            </button>
          </SignUpButton>
          <a
            href="#features"
            className="inline-flex items-center justify-center gap-2 text-sm sm:text-base h-11 sm:h-12 px-6 sm:px-8 rounded-md border border-border/60 text-foreground hover:bg-accent font-medium transition-colors w-full sm:w-auto"
          >
            <Brain className="w-4 h-4" />
            See Features
          </a>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-w-3xl mx-auto mb-16 md:mb-20"
        >
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-foreground mb-1 gradient-text">
                {stat.value}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </motion.div>

        {/* Dashboard preview — hidden on small mobile, shown sm+ */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="relative max-w-5xl mx-auto hidden sm:block"
        >
          {floatingBadges.map((badge, i) => (
            <motion.div
              key={badge.text}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1 + badge.delay, duration: 0.4 }}
              className={`absolute z-10 hidden md:flex items-center gap-2 bg-card border border-border/60 rounded-full px-3 py-1.5 text-sm shadow-lg ${
                i === 0 ? "-top-3 left-8" : i === 1 ? "-top-3 right-8" : i === 2 ? "-bottom-3 left-16" : "-bottom-3 right-16"
              }`}
            >
              <span>{badge.icon}</span>
              <span className="text-foreground font-medium">{badge.text}</span>
            </motion.div>
          ))}

          <div className="rounded-2xl border border-border/40 overflow-hidden shadow-2xl bg-card">
            <div className="flex items-center gap-2 px-4 py-3 bg-muted/30 border-b border-border/40">
              <div className="w-3 h-3 rounded-full bg-destructive/60" />
              <div className="w-3 h-3 rounded-full bg-warning/60" />
              <div className="w-3 h-3 rounded-full bg-success/60" />
              <div className="flex-1 ml-3">
                <div className="h-5 w-48 rounded bg-border/40 mx-auto" />
              </div>
            </div>

            <div className="p-4 sm:p-6 grid grid-cols-3 gap-3 sm:gap-4 bg-surface-DEFAULT">
              <div className="col-span-1 space-y-2">
                {["Dashboard", "Resumes", "Jobs", "Applications", "Interviews"].map((item, i) => (
                  <div
                    key={item}
                    className={`flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 rounded-lg text-xs sm:text-sm ${
                      i === 0 ? "bg-brand-500/20 text-brand-400 font-medium" : "text-muted-foreground"
                    }`}
                  >
                    <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-current opacity-40 flex-shrink-0" />
                    <span className="truncate">{item}</span>
                  </div>
                ))}
              </div>

              <div className="col-span-2 space-y-3">
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {[
                    { label: "Applied", value: "47", color: "text-blue-400" },
                    { label: "Interviews", value: "8", color: "text-green-400" },
                    { label: "ATS Score", value: "89", color: "text-brand-400" },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-card rounded-lg p-2 sm:p-3 border border-border/40">
                      <div className={`text-base sm:text-xl font-bold ${stat.color}`}>{stat.value}</div>
                      <div className="text-[10px] sm:text-xs text-muted-foreground">{stat.label}</div>
                    </div>
                  ))}
                </div>
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-card rounded-lg border border-border/40">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded bg-brand-500/20 flex-shrink-0" />
                    <div className="flex-1 space-y-1 min-w-0">
                      <div className="h-2.5 w-24 sm:w-32 rounded bg-muted" />
                      <div className="h-2 w-16 sm:w-24 rounded bg-muted/60" />
                    </div>
                    <div className="text-[10px] sm:text-xs text-green-400 font-medium flex-shrink-0">
                      {91 - i * 5}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-brand-500/20 to-transparent opacity-50 pointer-events-none" />
        </motion.div>
      </div>
    </section>
  );
}
