"use client";

import { motion } from "framer-motion";
import {
  FileText,
  Search,
  Zap,
  Mic,
  BarChart3,
  Bot,
  Target,
  Mail,
  BrainCircuit,
} from "lucide-react";

const FEATURES = [
  {
    icon: FileText,
    title: "AI Resume Engine",
    description:
      "Upload any resume. Get ATS score, keyword gaps, and AI-rewritten bullets optimized for GPT-powered ATS systems.",
    tag: "GPT-4o",
    color: "from-indigo-500/20 to-indigo-500/5",
    iconColor: "text-indigo-400",
  },
  {
    icon: Target,
    title: "Job-Tailored Resumes",
    description:
      "One click generates a perfectly tailored resume for each job. Keyword injected, ATS-optimized, human-readable.",
    tag: "Instant",
    color: "from-purple-500/20 to-purple-500/5",
    iconColor: "text-purple-400",
  },
  {
    icon: Mail,
    title: "AI Cover Letters",
    description:
      "Personalized cover letters that reference the job description, mirror its language, and open with a hook — not a template.",
    tag: "Personalized",
    color: "from-blue-500/20 to-blue-500/5",
    iconColor: "text-blue-400",
  },
  {
    icon: Search,
    title: "Job Aggregation",
    description:
      "Jobs from LinkedIn, Indeed, Greenhouse, Lever, Adzuna unified in one feed with AI-powered relevance scoring.",
    tag: "10k+ Jobs",
    color: "from-cyan-500/20 to-cyan-500/5",
    iconColor: "text-cyan-400",
  },
  {
    icon: Zap,
    title: "Auto-Apply Agent",
    description:
      "AI navigates job portals, fills every form field, uploads your resume — then shows you a preview before submitting.",
    tag: "With Approval",
    color: "from-yellow-500/20 to-yellow-500/5",
    iconColor: "text-yellow-400",
  },
  {
    icon: Mic,
    title: "Voice AI Interviews",
    description:
      "Practice with a real-time AI interviewer that asks follow-ups, scores your answers, and gives brutally honest feedback.",
    tag: "Real-time",
    color: "from-green-500/20 to-green-500/5",
    iconColor: "text-green-400",
  },
  {
    icon: BrainCircuit,
    title: "Skill Gap Analyzer",
    description:
      "Compare your resume to target roles. Get a precise learning roadmap: courses, certs, and projects to bridge the gap.",
    tag: "Roadmap",
    color: "from-orange-500/20 to-orange-500/5",
    iconColor: "text-orange-400",
  },
  {
    icon: Bot,
    title: "Daily AI Agent",
    description:
      "Every morning your AI agent scans for new jobs, scores them, tailors your resume, and queues applications — while you sleep.",
    tag: "Autonomous",
    color: "from-pink-500/20 to-pink-500/5",
    iconColor: "text-pink-400",
  },
  {
    icon: BarChart3,
    title: "Career Analytics",
    description:
      "Track every metric: response rates, ATS performance, interview funnels, and AI usage — in a beautiful dashboard.",
    tag: "Dashboard",
    color: "from-teal-500/20 to-teal-500/5",
    iconColor: "text-teal-400",
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.07 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export function FeaturesGrid() {
  return (
    <section className="py-24 container mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-16"
      >
        <p className="text-brand-400 font-medium text-sm uppercase tracking-wider mb-3">
          Everything You Need
        </p>
        <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
          LinkedIn + Rezi + Simplify
          <br />
          <span className="gradient-text">in one AI platform</span>
        </h2>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Stop using 6 different tools. CareerOS replaces your entire career stack
          with one intelligent system that works for you 24/7.
        </p>
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
      >
        {FEATURES.map((feature) => (
          <motion.div
            key={feature.title}
            variants={itemVariants}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="group relative rounded-2xl border border-border/50 bg-card p-6 overflow-hidden cursor-default"
          >
            {/* Background gradient */}
            <div
              className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
            />

            <div className="relative">
              <div className="flex items-start justify-between mb-4">
                <div
                  className={`p-2.5 rounded-xl bg-muted/60 group-hover:bg-background/60 transition-colors ${feature.iconColor}`}
                >
                  <feature.icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  {feature.tag}
                </span>
              </div>

              <h3 className="text-base font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
