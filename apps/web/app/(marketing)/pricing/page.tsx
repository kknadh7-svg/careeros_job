import { Check, Zap, Crown, ArrowRight, ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Pricing — CareerOS" };

const FREE_FEATURES = [
  "1 resume upload",
  "1 AI enhancement (Claude)",
  "ATS score analysis",
  "Basic job board access",
  "Mock interview (text mode)",
];

const PRO_FEATURES = [
  "Unlimited resume uploads",
  "Unlimited AI enhancements",
  "Advanced ATS optimization",
  "Full job board + auto-apply",
  "Voice + text mock interviews",
  "Daily AI job agent",
  "Resume tailoring per job",
  "Priority support",
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Back button */}
      <div className="max-w-4xl mx-auto px-6 pt-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to dashboard
        </Link>
      </div>

      {/* Header */}
      <div className="max-w-4xl mx-auto px-6 pt-10 pb-12 text-center">
        <div className="inline-flex items-center gap-2 bg-brand-500/10 border border-brand-500/20 rounded-full px-4 py-1.5 text-sm text-brand-400 font-medium mb-6">
          <Crown className="w-3.5 h-3.5" />
          Simple, transparent pricing
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
          Invest in your career
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          Start free, upgrade when you need the power of unlimited AI-enhanced resumes and autonomous job applications.
        </p>
      </div>

      {/* Plans */}
      <div className="max-w-4xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* FREE */}
          <div className="bg-card border border-border/60 rounded-2xl p-8 flex flex-col">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-5 h-5 text-muted-foreground" />
                <span className="font-semibold text-lg">Free</span>
              </div>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-4xl font-bold">₹0</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Everything you need to get started with AI-powered job hunting.
              </p>
            </div>

            <ul className="space-y-3 flex-1 mb-8">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center mt-0.5 flex-shrink-0">
                    <Check className="w-3 h-3 text-muted-foreground" />
                  </div>
                  <span className="text-sm text-muted-foreground">{f}</span>
                </li>
              ))}
            </ul>

            <Link
              href="/sign-in"
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-border/60 text-sm font-medium hover:bg-accent/50 transition-colors"
            >
              Get started free
            </Link>
          </div>

          {/* PRO */}
          <div className="relative bg-card border-2 border-brand-500/50 rounded-2xl p-8 flex flex-col shadow-lg shadow-brand-500/10">
            {/* Badge */}
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
              <div className="bg-brand-500 text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-md shadow-brand-500/30">
                Most popular
              </div>
            </div>

            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Crown className="w-5 h-5 text-brand-400" />
                <span className="font-semibold text-lg">Pro</span>
              </div>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-4xl font-bold">₹499</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Unlimited AI power for serious job seekers who want to land faster.
              </p>
            </div>

            <ul className="space-y-3 flex-1 mb-8">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-brand-500/15 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <Check className="w-3 h-3 text-brand-400" />
                  </div>
                  <span className="text-sm">{f}</span>
                </li>
              ))}
            </ul>

            <Link
              href="/pricing/upgrade"
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition-colors shadow-md shadow-brand-500/25"
            >
              Upgrade to Pro
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Trust line */}
        <p className="text-center text-sm text-muted-foreground mt-10">
          No credit card required for free plan · Cancel Pro anytime · Secure payments via Stripe
        </p>
      </div>
    </div>
  );
}
