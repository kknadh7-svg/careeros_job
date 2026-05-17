"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Zap, Crown, Sparkles, Bell, X, ArrowLeft, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";

const PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Try the AI, see what's possible.",
    cta: "Get Started Free",
    href: "/sign-up",
    highlighted: false,
    comingSoon: false,
    features: [
      "1 resume upload",
      "5 job saves",
      "3 ATS analyses per month",
      "3 AI resume rewrites per month",
      "3 cover letters per month",
      "Basic job search",
      "Manual application tracking",
    ],
  },
  {
    name: "Pro",
    price: "$29",
    period: "per month",
    description: "For serious job seekers who want results.",
    cta: "Start Pro — 7 Day Free Trial",
    highlighted: true,
    badge: "Most Popular",
    comingSoon: true,
    proFeatures: [
      "Unlimited resumes & job saves",
      "50 ATS analyses per month",
      "50 AI-tailored resumes per month",
      "10 auto-apply sessions per month",
      "5 voice interview sessions per month",
      "Daily AI job agent",
      "Priority AI (GPT-4o)",
    ],
    features: [
      "Unlimited resumes",
      "Unlimited job saves",
      "50 ATS analyses per month",
      "50 AI-tailored resumes per month",
      "50 cover letters per month",
      "10 auto-apply sessions per month",
      "5 voice interview sessions per month",
      "Daily AI job agent",
      "Priority AI (GPT-4o)",
      "Application analytics dashboard",
      "Skill gap analysis",
      "Email notifications & digests",
    ],
  },
  {
    name: "Enterprise",
    price: "$99",
    period: "per month",
    description: "For power users and career coaches.",
    cta: "Start Enterprise",
    highlighted: false,
    comingSoon: true,
    proFeatures: [
      "Everything in Pro",
      "Unlimited everything",
      "5 team seats",
      "API access",
      "Priority support (Slack)",
      "White-glove onboarding",
    ],
    features: [
      "Everything in Pro",
      "Unlimited everything",
      "5 team seats",
      "API access",
      "Priority support (Slack)",
      "White-glove onboarding",
      "Custom AI model configurations",
      "Advanced analytics & exports",
    ],
  },
];

function ComingSoonModal({
  plan,
  onClose,
}: {
  plan: (typeof PLANS)[number];
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleNotify = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) setSubmitted(true);
  };

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          key="modal"
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className="relative w-full max-w-md bg-[#0d0d14] border border-white/10 rounded-3xl p-8 shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Background glow */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
            <div className="absolute -top-20 -left-20 w-64 h-64 rounded-full bg-brand-500/15 blur-3xl" />
            <div className="absolute -bottom-20 -right-20 w-64 h-64 rounded-full bg-purple-600/10 blur-3xl" />
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/8 hover:bg-white/15 flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="relative z-10">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-500/25 to-purple-600/25 border border-brand-500/30 flex items-center justify-center shadow-xl">
                  {plan.name === "Enterprise" ? (
                    <Rocket className="w-9 h-9 text-brand-400" />
                  ) : (
                    <Crown className="w-9 h-9 text-brand-400" />
                  )}
                </div>
                <motion.div
                  className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-yellow-400/15 border border-yellow-400/30 flex items-center justify-center"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                  style={{ transformOrigin: "calc(50% + 36px) calc(50% + 36px)" }}
                >
                  <Sparkles className="w-3 h-3 text-yellow-400" />
                </motion.div>
              </div>
            </div>

            {/* Badge */}
            <div className="flex justify-center mb-5">
              <div className="inline-flex items-center gap-1.5 bg-brand-500/10 border border-brand-500/25 rounded-full px-3.5 py-1.5 text-xs text-brand-400 font-semibold tracking-wide">
                <Crown className="w-3 h-3" />
                CareerOS {plan.name}
              </div>
            </div>

            {/* Heading */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold tracking-tight mb-2">
                {plan.name} is launching soon
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We&apos;re putting the finishing touches on {plan.name}.{" "}
                <span className="text-foreground font-medium">Be first in line</span> — early access members get an exclusive founder&apos;s discount.
              </p>
            </div>

            {/* Email form */}
            <div className="mb-6">
              {submitted ? (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/25"
                >
                  <div className="w-8 h-8 rounded-lg bg-green-500/15 flex items-center justify-center flex-shrink-0">
                    <Check className="w-4 h-4 text-green-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-green-400 text-sm">You&apos;re on the list!</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      We&apos;ll notify <span className="text-foreground">{email}</span> the moment {plan.name} launches.
                    </p>
                  </div>
                </motion.div>
              ) : (
                <form onSubmit={handleNotify} className="flex gap-2">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/15 transition-all"
                  />
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition-colors shadow-md shadow-brand-500/25 flex-shrink-0"
                  >
                    <Bell className="w-3.5 h-3.5" />
                    Notify me
                  </button>
                </form>
              )}
            </div>

            {/* Feature preview */}
            {"proFeatures" in plan && Array.isArray(plan.proFeatures) && (
              <div className="space-y-2 mb-6">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-3">
                  What&apos;s included
                </p>
                {plan.proFeatures.map((f) => (
                  <div key={f} className="flex items-center gap-2.5">
                    <div className="w-4 h-4 rounded-full bg-brand-500/15 flex items-center justify-center flex-shrink-0">
                      <Check className="w-2.5 h-2.5 text-brand-400" />
                    </div>
                    <span className="text-sm text-muted-foreground">{f}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Back + note */}
            <div className="flex items-center justify-between pt-4 border-t border-white/8">
              <button
                onClick={onClose}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to plans
              </button>
              <p className="text-xs text-muted-foreground">No credit card needed</p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export function PricingSection() {
  const [activePlan, setActivePlan] = useState<(typeof PLANS)[number] | null>(null);

  return (
    <section className="py-24 container mx-auto px-4" id="pricing">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-16"
      >
        <p className="text-brand-400 font-medium text-sm uppercase tracking-wider mb-3">
          Pricing
        </p>
        <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
          Simple,{" "}
          <span className="gradient-text">Transparent Pricing</span>
        </h2>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto">
          Start free. Upgrade when you need the AI to do the heavy lifting.
          Cancel anytime.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {PLANS.map((plan, i) => (
          <motion.div
            key={plan.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className={cn(
              "relative rounded-2xl border p-7 flex flex-col",
              plan.highlighted
                ? "border-brand-500/50 bg-gradient-to-b from-brand-500/10 to-card shadow-[0_0_40px_rgba(99,102,241,0.15)]"
                : "border-border/50 bg-card"
            )}
          >
            {plan.highlighted && "badge" in plan && plan.badge && (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="bg-brand-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                  {plan.badge}
                </span>
              </div>
            )}

            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-1">{plan.name}</h3>
              <p className="text-muted-foreground text-sm mb-4">{plan.description}</p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">{plan.price}</span>
                <span className="text-muted-foreground text-sm">/{plan.period}</span>
              </div>
            </div>

            {plan.comingSoon ? (
              <Button
                variant={plan.highlighted ? "default" : "outline"}
                className={cn(
                  "w-full mb-6",
                  plan.highlighted && "bg-brand-500 hover:bg-brand-600 shadow-[0_0_20px_rgba(99,102,241,0.3)]"
                )}
                onClick={() => setActivePlan(plan)}
              >
                {plan.highlighted && <Zap className="w-4 h-4 mr-2" />}
                {plan.cta}
              </Button>
            ) : (
              <Button
                asChild
                variant="outline"
                className="w-full mb-6"
              >
                <Link href={"href" in plan ? (plan.href as string) : "/sign-up"}>
                  {plan.cta}
                </Link>
              </Button>
            )}

            <div className="space-y-3 flex-1">
              {plan.features.map((feature) => (
                <div key={feature} className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-foreground">{feature}</span>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      <p className="text-center text-muted-foreground text-sm mt-8">
        All plans include 30-day money-back guarantee. No hidden fees.
      </p>

      {/* Coming Soon Modal */}
      {activePlan && (
        <ComingSoonModal plan={activePlan} onClose={() => setActivePlan(null)} />
      )}
    </section>
  );
}
