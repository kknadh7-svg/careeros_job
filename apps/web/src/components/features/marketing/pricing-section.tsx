"use client";

import { motion } from "framer-motion";
import { Check, Zap } from "lucide-react";
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
    features: [
      "1 resume upload",
      "5 job saves",
      "3 ATS analyses per month",
      "3 AI resume rewrites per month",
      "3 cover letters per month",
      "Basic job search",
      "Manual application tracking",
    ],
    missing: [
      "Auto-apply",
      "Voice interviews",
      "Daily AI agent",
      "Unlimited tailoring",
    ],
  },
  {
    name: "Pro",
    price: "$29",
    period: "per month",
    description: "For serious job seekers who want results.",
    cta: "Start Pro — 7 Day Free Trial",
    href: "/sign-up?plan=pro",
    highlighted: true,
    badge: "Most Popular",
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
    missing: [],
  },
  {
    name: "Enterprise",
    price: "$99",
    period: "per month",
    description: "For power users and career coaches.",
    cta: "Start Enterprise",
    href: "/sign-up?plan=enterprise",
    highlighted: false,
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
    missing: [],
  },
];

export function PricingSection() {
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
            {plan.highlighted && plan.badge && (
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

            <Button
              asChild
              variant={plan.highlighted ? "default" : "outline"}
              className={cn(
                "w-full mb-6",
                plan.highlighted && "bg-brand-500 hover:bg-brand-600 shadow-[0_0_20px_rgba(99,102,241,0.3)]"
              )}
            >
              <Link href={plan.href}>
                {plan.highlighted && <Zap className="w-4 h-4 mr-2" />}
                {plan.cta}
              </Link>
            </Button>

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
    </section>
  );
}
