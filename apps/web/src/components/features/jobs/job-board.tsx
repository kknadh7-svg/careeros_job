"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Bookmark, BookmarkCheck, ExternalLink, Zap,
  MapPin, Clock, Briefcase, IndianRupee, Building2, ChevronRight,
  AlertTriangle, Crown, ArrowRight, Loader2, Lock, Info,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import type { PlanTier } from "@prisma/client";

interface Job {
  id: string;
  title: string;
  company: string;
  companyLogo: string | null;
  location: string | null;
  locationType: string | null;
  jobType: string | null;
  seniority: string | null;
  salary: { min: number | null; max: number | null; currency: string } | null;
  skills: string[];
  source: string;
  sourceUrl?: string;
  applyUrl: string;
  postedAt: Date | null;
  description?: string;
  isSaved?: boolean;
}

interface Meta {
  total: number;
  plan: string;
  limit: number;
  configured: boolean;
  source: string | null;
  sourceUrl?: string;
  query?: string;
  location?: string;
}

interface JobBoardProps {
  plan: PlanTier;
  isConfigured: boolean;
}

const LOCATION_TYPE_STYLES: Record<string, string> = {
  REMOTE: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  HYBRID: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  ONSITE: "bg-rose-500/10 text-rose-400 border-rose-500/20",
};

const SKILL_COLORS = [
  "bg-blue-500/10 text-blue-400",
  "bg-purple-500/10 text-purple-400",
  "bg-cyan-500/10 text-cyan-400",
  "bg-teal-500/10 text-teal-400",
  "bg-indigo-500/10 text-indigo-400",
  "bg-violet-500/10 text-violet-400",
  "bg-sky-500/10 text-sky-400",
  "bg-green-500/10 text-green-400",
];

function skillColor(skill: string): string {
  let hash = 0;
  for (let i = 0; i < skill.length; i++) hash = skill.charCodeAt(i) + ((hash << 5) - hash);
  return SKILL_COLORS[Math.abs(hash) % SKILL_COLORS.length] ?? SKILL_COLORS[0]!;
}

function formatSalary(salary: Job["salary"]): string | null {
  if (!salary) return null;
  const { min, max, currency } = salary;
  if (!min && !max) return null;
  const sym = currency === "INR" ? "₹" : "$";
  const fmt = (n: number) =>
    currency === "INR"
      ? n >= 100000 ? `${(n / 100000).toFixed(1)}L` : `${(n / 1000).toFixed(0)}K`
      : `${(n / 1000).toFixed(0)}K`;
  if (min && max) return `${sym}${fmt(min)} – ${sym}${fmt(max)}`;
  if (max) return `Up to ${sym}${fmt(max)}`;
  if (min) return `From ${sym}${fmt(min)}`;
  return null;
}

function CompanyLogo({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const sizeClass = size === "sm" ? "w-9 h-9 text-sm" : size === "lg" ? "w-14 h-14 text-xl" : "w-11 h-11 text-base";
  const initials = name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
  return (
    <div className={cn(sizeClass, "rounded-xl bg-brand-500/10 flex items-center justify-center font-bold text-brand-400 flex-shrink-0")}>
      {initials}
    </div>
  );
}

// ─── Setup Required Banner ────────────────────────────────────────────────────

function SetupBanner() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center gap-5 max-w-lg mx-auto">
      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
        <AlertTriangle className="w-7 h-7 text-amber-400" />
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-2">Job Search API not configured</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          CareerOS uses <strong className="text-foreground">Adzuna</strong> to show real Indian job listings.
          Get your free API keys (takes 2 minutes) and add them to your{" "}
          <code className="bg-muted px-1.5 py-0.5 rounded text-xs">.env.local</code>.
        </p>
      </div>

      <div className="w-full bg-card border border-border/60 rounded-xl p-4 text-left">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Setup steps</p>
        <ol className="space-y-2.5 text-sm">
          {[
            { step: "1", text: "Go to developer.adzuna.com and create a free account" },
            { step: "2", text: 'Click "Register App" — name it anything, set country to India' },
            { step: "3", text: "Copy your App ID and App Key from the dashboard" },
            { step: "4", text: "Add to .env.local and restart the dev server" },
          ].map((s) => (
            <li key={s.step} className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-brand-500/15 text-brand-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                {s.step}
              </span>
              <span className="text-muted-foreground">{s.text}</span>
            </li>
          ))}
        </ol>

        <div className="mt-4 p-3 rounded-lg bg-muted/50 font-mono text-xs space-y-1 border border-border/40">
          <p className="text-green-400">ADZUNA_APP_ID=your_app_id_here</p>
          <p className="text-green-400">ADZUNA_APP_KEY=your_app_key_here</p>
        </div>
      </div>

      <a
        href="https://developer.adzuna.com/"
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition-colors"
      >
        Get free API keys
        <ArrowRight className="w-4 h-4" />
      </a>
    </div>
  );
}

// ─── Free Limit Banner ────────────────────────────────────────────────────────

function FreeLimitBanner({ shown, total }: { shown: number; total: number }) {
  return (
    <div className="flex items-center gap-3 p-3.5 rounded-xl bg-gradient-to-r from-brand-500/10 to-purple-500/10 border border-brand-500/25">
      <Lock className="w-4 h-4 text-brand-400 flex-shrink-0" />
      <p className="text-xs text-muted-foreground flex-1">
        <span className="text-foreground font-medium">Free plan:</span> showing {shown} of {total}+ real jobs.
        Upgrade to Pro to see 50 results per search.
      </p>
      <a
        href="/pricing/upgrade"
        className="flex items-center gap-1 text-xs text-brand-400 font-medium hover:underline flex-shrink-0"
      >
        <Crown className="w-3 h-3" />
        Upgrade
      </a>
    </div>
  );
}

// ─── Job Card ─────────────────────────────────────────────────────────────────

function JobCard({
  job,
  isSelected,
  onSelect,
  onSave,
  isSaving,
}: {
  job: Job;
  isSelected: boolean;
  onSelect: () => void;
  onSave: () => void;
  isSaving: boolean;
}) {
  const salary = formatSalary(job.salary);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onSelect}
      className={cn(
        "group relative p-4 rounded-2xl border cursor-pointer transition-all duration-200",
        isSelected
          ? "border-brand-500/60 bg-brand-500/5 shadow-sm"
          : "border-border/50 bg-card hover:border-border hover:shadow-sm hover:bg-accent/20"
      )}
    >
      <div className="flex items-start gap-3">
        <CompanyLogo name={job.company} size="md" />

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-semibold text-sm leading-tight line-clamp-1">{job.title}</h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Building2 className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                <span className="text-xs text-muted-foreground truncate">{job.company}</span>
              </div>
            </div>

            <button
              className="flex-shrink-0 h-7 w-7 flex items-center justify-center rounded-lg hover:bg-accent transition-colors"
              onClick={(e) => { e.stopPropagation(); onSave(); }}
              disabled={isSaving}
            >
              {job.isSaved
                ? <BookmarkCheck className="w-4 h-4 text-brand-400" />
                : <Bookmark className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />}
            </button>
          </div>

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {job.locationType && (
              <Badge variant="outline" className={cn("text-[10px] px-1.5 h-5 border font-medium", LOCATION_TYPE_STYLES[job.locationType])}>
                {job.locationType === "ONSITE" ? "On-site" : job.locationType.charAt(0) + job.locationType.slice(1).toLowerCase()}
              </Badge>
            )}
            {job.location && (
              <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                <MapPin className="w-2.5 h-2.5" />
                {job.location.split(",")[0]}
              </span>
            )}
            {salary && (
              <span className="flex items-center gap-0.5 text-[10px] text-emerald-400 font-medium">
                <IndianRupee className="w-2.5 h-2.5" />
                {salary.replace("₹", "")}
              </span>
            )}
            {/* Source badge — real platform label */}
            <Badge variant="outline" className="text-[10px] px-1.5 h-5 border bg-violet-500/10 text-violet-400 border-violet-500/20">
              Adzuna
            </Badge>
            {job.postedAt && (
              <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground ml-auto">
                <Clock className="w-2.5 h-2.5" />
                {formatDistanceToNow(new Date(job.postedAt), { addSuffix: true })}
              </span>
            )}
          </div>
        </div>
      </div>

      {job.skills.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {job.skills.slice(0, 5).map((skill) => (
            <span key={skill} className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", skillColor(skill))}>
              {skill}
            </span>
          ))}
          {job.skills.length > 5 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
              +{job.skills.length - 5} more
            </span>
          )}
        </div>
      )}

      {isSelected && (
        <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-400 opacity-60" />
      )}
    </motion.div>
  );
}

// ─── Job Detail Panel ─────────────────────────────────────────────────────────

function JobDetailPanel({ job, onSave, isSaving }: { job: Job; onSave: () => void; isSaving: boolean }) {
  const salary = formatSalary(job.salary);

  return (
    <motion.div
      key={job.id}
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }}
      transition={{ duration: 0.2 }}
      className="w-[22rem] flex-shrink-0 flex flex-col bg-card rounded-2xl border border-border/50 overflow-hidden"
    >
      <div className="p-5 border-b border-border/50">
        <div className="flex items-start gap-3 mb-4">
          <CompanyLogo name={job.company} size="lg" />
          <div className="min-w-0">
            <h2 className="font-semibold text-sm leading-snug">{job.title}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{job.company}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          {job.location && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="w-3 h-3 text-brand-400 flex-shrink-0" />
              <span className="truncate">{job.locationType === "REMOTE" ? "Remote" : job.location}</span>
            </div>
          )}
          {job.jobType && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Briefcase className="w-3 h-3 text-brand-400 flex-shrink-0" />
              <span>{job.jobType.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}</span>
            </div>
          )}
          {salary && (
            <div className="flex items-center gap-1.5 text-emerald-400 font-medium col-span-2">
              <IndianRupee className="w-3 h-3 flex-shrink-0" />
              {salary}
            </div>
          )}
        </div>
      </div>

      {/* Description excerpt */}
      {job.description && (
        <div className="px-5 py-4 border-b border-border/50">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">About the role</p>
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-6">{job.description}</p>
        </div>
      )}

      {job.skills.length > 0 && (
        <div className="px-5 py-4 border-b border-border/50">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">Skills detected</p>
          <div className="flex flex-wrap gap-1.5">
            {job.skills.map((skill) => (
              <span key={skill} className={cn("text-xs px-2.5 py-1 rounded-full font-medium", skillColor(skill))}>
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1" />

      {/* Source attribution */}
      <div className="px-5 py-3 flex items-center justify-between text-[10px] text-muted-foreground border-t border-border/50">
        <div className="flex items-center gap-1.5">
          <Info className="w-3 h-3" />
          <span>Listed on</span>
          <a
            href="https://www.adzuna.in"
            target="_blank"
            rel="noreferrer"
            className="text-violet-400 hover:underline font-medium"
          >
            Adzuna India
          </a>
        </div>
        {job.postedAt && (
          <span className="flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" />
            {formatDistanceToNow(new Date(job.postedAt), { addSuffix: true })}
          </span>
        )}
      </div>

      <div className="p-4 pt-0 space-y-2">
        <Button className="w-full bg-brand-500 hover:bg-brand-600 font-medium" asChild>
          <a href={job.applyUrl} target="_blank" rel="noreferrer">
            <ExternalLink className="w-4 h-4 mr-2" />
            Apply Now on Adzuna
          </a>
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 text-xs"
            onClick={(e) => { e.stopPropagation(); onSave(); }}
            disabled={isSaving}
          >
            {job.isSaved
              ? <><BookmarkCheck className="w-3.5 h-3.5 mr-1.5 text-brand-400" />Saved</>
              : <><Bookmark className="w-3.5 h-3.5 mr-1.5" />Save Job</>}
          </Button>
          <Button variant="outline" className="flex-1 text-xs" disabled title="Coming in Pro">
            <Zap className="w-3.5 h-3.5 mr-1.5" />
            Auto Apply
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function JobBoard({ plan, isConfigured }: JobBoardProps) {
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [locationInput, setLocationInput] = useState("");
  const [location, setLocation] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());

  const fetchJobs = useCallback(async (q: string, loc: string, type: string) => {
    if (!isConfigured) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (loc) params.set("location", loc);
      if (type !== "all") params.set("jobType", type);

      const res = await fetch(`/api/v1/jobs?${params}`);
      const json = await res.json() as { data: Job[]; meta: Meta };
      setJobs(json.data ?? []);
      setMeta(json.meta ?? null);
    } catch {
      toast({ title: "Search failed", description: "Could not load jobs. Try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [isConfigured]);

  // Initial load
  useEffect(() => {
    void fetchJobs("software engineer", "India", "all");
  }, [fetchJobs]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setLocation(locationInput);
    void fetchJobs(searchInput || "software engineer", locationInput || "India", typeFilter);
  };

  const handleTypeChange = (val: string) => {
    setTypeFilter(val);
    void fetchJobs(search || "software engineer", location || "India", val);
  };

  const handleSave = async (job: Job) => {
    setSavingIds((s) => new Set(s).add(job.id));
    try {
      await fetch("/api/v1/jobs/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.id }),
      });
      setJobs((prev) => prev.map((j) => j.id === job.id ? { ...j, isSaved: !j.isSaved } : j));
      if (selectedJob?.id === job.id) setSelectedJob((j) => j ? { ...j, isSaved: !j.isSaved } : j);
    } catch {
      toast({ title: "Could not save job", variant: "destructive" });
    } finally {
      setSavingIds((s) => { const n = new Set(s); n.delete(job.id); return n; });
    }
  };

  if (!isConfigured) return <SetupBanner />;

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Job title, skill, company…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="City or state"
            value={locationInput}
            onChange={(e) => setLocationInput(e.target.value)}
            className="pl-9 w-44"
          />
        </div>
        <Select value={typeFilter} onValueChange={handleTypeChange}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Job type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="FULL_TIME">Full Time</SelectItem>
            <SelectItem value="PART_TIME">Part Time</SelectItem>
            <SelectItem value="CONTRACT">Contract</SelectItem>
          </SelectContent>
        </Select>
        <Button type="submit" className="bg-brand-500 hover:bg-brand-600 px-5">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        </Button>
      </form>

      {/* Plan limit notice */}
      {meta && plan === "FREE" && meta.total > meta.limit && (
        <FreeLimitBanner shown={jobs.length} total={meta.total} />
      )}

      {/* Results count + source attribution */}
      {meta && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {loading ? "Searching…" : `${jobs.length} real jobs found`}
            {meta.query && !loading && (
              <span className="text-foreground font-medium"> for &quot;{meta.query}&quot;</span>
            )}
            {meta.location && !loading && (
              <span> in {meta.location}</span>
            )}
          </span>
          {meta.configured && (
            <span className="flex items-center gap-1 text-xs">
              <Info className="w-3 h-3" />
              Live data from{" "}
              <a href="https://www.adzuna.in" target="_blank" rel="noreferrer" className="text-violet-400 hover:underline">
                Adzuna India
              </a>
            </span>
          )}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-card border border-border/40 animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && jobs.length === 0 && (
        <div className="text-center py-16">
          <Search className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium">No jobs found</p>
          <p className="text-sm text-muted-foreground mt-1">Try a different search term or location</p>
        </div>
      )}

      {/* Jobs grid + detail panel */}
      {!loading && jobs.length > 0 && (
        <div className="flex gap-4 items-start">
          {/* Job list */}
          <div className="flex-1 space-y-3 min-w-0">
            <AnimatePresence>
              {jobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  isSelected={selectedJob?.id === job.id}
                  onSelect={() => setSelectedJob(job)}
                  onSave={() => void handleSave(job)}
                  isSaving={savingIds.has(job.id)}
                />
              ))}
            </AnimatePresence>

            {/* Pro upsell at list bottom */}
            {plan === "FREE" && (
              <a
                href="/pricing/upgrade"
                className="flex items-center justify-center gap-2 p-4 rounded-2xl border border-dashed border-brand-500/30 text-sm text-muted-foreground hover:border-brand-500/60 hover:text-brand-400 transition-all"
              >
                <Crown className="w-4 h-4" />
                Upgrade to Pro to unlock 50 results per search
                <ArrowRight className="w-4 h-4" />
              </a>
            )}
          </div>

          {/* Detail panel */}
          <AnimatePresence>
            {selectedJob && (
              <JobDetailPanel
                job={selectedJob}
                onSave={() => void handleSave(selectedJob)}
                isSaving={savingIds.has(selectedJob.id)}
              />
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
