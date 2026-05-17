"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Crown, Sparkles, ArrowLeft, Bell, Check,
  Zap, Shield, Infinity, Bot,
} from "lucide-react";
import Link from "next/link";

const UPCOMING_FEATURES = [
  { icon: Infinity, label: "Unlimited AI Enhancements", desc: "Enhance as many resumes as you want with Claude AI" },
  { icon: Bot, label: "Daily Job Agent", desc: "Autonomous AI that finds and applies to jobs while you sleep" },
  { icon: Zap, label: "Auto-Apply Engine", desc: "One-click applications with AI-filled forms across 50+ job boards" },
  { icon: Shield, label: "ATS Score Boost", desc: "Advanced keyword optimization to pass every ATS filter" },
];

export default function UpgradePage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleNotify = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center px-6 py-20 relative overflow-hidden">

      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-brand-500/8 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-purple-500/6 blur-3xl" />
      </div>

      {/* Back link */}
      <div className="absolute top-8 left-8">
        <Link
          href="/pricing"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to pricing
        </Link>
      </div>

      <div className="w-full max-w-lg relative z-10">

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex justify-center mb-8"
        >
          <div className="inline-flex items-center gap-2 bg-brand-500/10 border border-brand-500/25 rounded-full px-4 py-2 text-sm text-brand-400 font-medium">
            <Crown className="w-3.5 h-3.5" />
            CareerOS Pro
          </div>
        </motion.div>

        {/* Icon */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex justify-center mb-6"
        >
          <div className="relative">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-brand-500/20 to-purple-500/20 border border-brand-500/30 flex items-center justify-center shadow-xl shadow-brand-500/10">
              <Crown className="w-10 h-10 text-brand-400" />
            </div>
            {/* Orbiting sparkle */}
            <motion.div
              className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-yellow-400/15 border border-yellow-400/30 flex items-center justify-center"
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
              style={{ transformOrigin: "calc(50% + 40px) calc(50% + 40px)" }}
            >
              <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
            </motion.div>
          </div>
        </motion.div>

        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
            Pro is coming soon
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            We&apos;re putting the finishing touches on CareerOS Pro.{" "}
            <span className="text-foreground font-medium">Drop your email</span> and
            you&apos;ll be the first to get early access — at a founder&apos;s discount.
          </p>
        </motion.div>

        {/* Notify form */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mb-10"
        >
          {submitted ? (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/25">
              <div className="w-9 h-9 rounded-xl bg-green-500/15 flex items-center justify-center flex-shrink-0">
                <Check className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <p className="font-semibold text-green-400 text-sm">You&apos;re on the list!</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  We&apos;ll notify {email} the moment Pro launches.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleNotify} className="flex gap-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="flex-1 px-4 py-3 rounded-xl bg-card border border-border/60 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/15 transition-all"
              />
              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition-colors shadow-md shadow-brand-500/25 flex-shrink-0"
              >
                <Bell className="w-4 h-4" />
                Notify me
              </button>
            </form>
          )}
        </motion.div>

        {/* Divider */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex items-center gap-3 mb-8"
        >
          <div className="flex-1 h-px bg-border/50" />
          <span className="text-xs text-muted-foreground">What&apos;s coming in Pro</span>
          <div className="flex-1 h-px bg-border/50" />
        </motion.div>

        {/* Feature list */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-3"
        >
          {UPCOMING_FEATURES.map((f, i) => (
            <motion.div
              key={f.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.55 + i * 0.07 }}
              className="flex items-start gap-3 p-3.5 rounded-xl bg-card border border-border/40 hover:border-brand-500/25 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <f.icon className="w-4 h-4 text-brand-400" />
              </div>
              <div>
                <p className="text-sm font-medium">{f.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Footer note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.9 }}
          className="text-center text-xs text-muted-foreground mt-10"
        >
          No credit card required · Early access users get 40% off launch price
        </motion.p>
      </div>
    </div>
  );
}
