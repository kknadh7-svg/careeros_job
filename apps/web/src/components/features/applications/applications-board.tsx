"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Building2, MapPin, ExternalLink, Trash2, X,
  Briefcase, TrendingUp, Calendar, CheckCircle2, XCircle,
  Clock, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

// ─── Types ───────────────────────────────────────────────────────────────────

type AppStatus =
  | "APPLIED" | "SCREENING" | "INTERVIEW"
  | "TECHNICAL" | "OFFER" | "ACCEPTED"
  | "REJECTED" | "WITHDRAWN";

interface Application {
  id: string;
  status: AppStatus;
  notes: string | null;
  appliedAt: Date | null;
  interviewAt: Date | null;
  createdAt: Date;
  job: {
    title: string;
    company: string;
    location: string | null;
    applyUrl: string;
    source: string;
  };
}

interface ApplicationsBoardProps {
  initialApplications: Application[];
}

// ─── Pipeline config ──────────────────────────────────────────────────────────

const PIPELINE: {
  status: AppStatus;
  label: string;
  color: string;
  dot: string;
  icon: React.ElementType;
}[] = [
  { status: "APPLIED",    label: "Applied",    color: "border-blue-500/30 bg-blue-500/5",    dot: "bg-blue-400",    icon: Briefcase },
  { status: "SCREENING",  label: "Screening",  color: "border-yellow-500/30 bg-yellow-500/5", dot: "bg-yellow-400", icon: Clock },
  { status: "INTERVIEW",  label: "Interview",  color: "border-purple-500/30 bg-purple-500/5", dot: "bg-purple-400", icon: Calendar },
  { status: "TECHNICAL",  label: "Technical",  color: "border-orange-500/30 bg-orange-500/5", dot: "bg-orange-400", icon: TrendingUp },
  { status: "OFFER",      label: "Offer",      color: "border-green-500/30 bg-green-500/5",  dot: "bg-green-400",  icon: CheckCircle2 },
  { status: "ACCEPTED",   label: "Accepted",   color: "border-emerald-500/30 bg-emerald-500/5", dot: "bg-emerald-400", icon: CheckCircle2 },
  { status: "REJECTED",   label: "Rejected",   color: "border-red-500/30 bg-red-500/5",     dot: "bg-red-400",    icon: XCircle },
];

const STATUS_BADGE: Record<AppStatus, string> = {
  APPLIED:   "bg-blue-500/10 text-blue-400 border-blue-500/20",
  SCREENING: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  INTERVIEW: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  TECHNICAL: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  OFFER:     "bg-green-500/10 text-green-400 border-green-500/20",
  ACCEPTED:  "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  REJECTED:  "bg-red-500/10 text-red-400 border-red-500/20",
  WITHDRAWN: "bg-slate-500/10 text-slate-400 border-slate-500/20",
};

// ─── Add Application Modal ────────────────────────────────────────────────────

function AddModal({ onClose, onAdded }: { onClose: () => void; onAdded: (app: Application) => void }) {
  const [form, setForm] = useState({ company: "", title: "", location: "", applyUrl: "", notes: "", status: "APPLIED" as AppStatus });
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.company.trim() || !form.title.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/v1/applications/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to add");
      const { data } = await res.json() as { data: Application };
      onAdded(data);
      toast({ title: "Application added!", description: `${form.title} at ${form.company}` });
      onClose();
    } catch {
      toast({ title: "Could not add application", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card border border-border/60 rounded-2xl w-full max-w-md shadow-2xl"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center">
              <Plus className="w-4 h-4 text-brand-400" />
            </div>
            <h2 className="font-semibold text-sm">Track Application</h2>
          </div>
          <button onClick={onClose} className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-accent transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Company *">
              <input
                required
                value={form.company}
                onChange={(e) => set("company", e.target.value)}
                placeholder="Google, Infosys…"
                className="w-full px-3 py-2 rounded-lg bg-background border border-border/60 text-sm focus:outline-none focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/15 transition-all"
              />
            </Field>
            <Field label="Job Title *">
              <input
                required
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="Software Engineer"
                className="w-full px-3 py-2 rounded-lg bg-background border border-border/60 text-sm focus:outline-none focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/15 transition-all"
              />
            </Field>
          </div>

          <Field label="Location">
            <input
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
              placeholder="Bangalore, Remote…"
              className="w-full px-3 py-2 rounded-lg bg-background border border-border/60 text-sm focus:outline-none focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/15 transition-all"
            />
          </Field>

          <Field label="Job Listing URL">
            <input
              value={form.applyUrl}
              onChange={(e) => set("applyUrl", e.target.value)}
              placeholder="https://careers.company.com/..."
              className="w-full px-3 py-2 rounded-lg bg-background border border-border/60 text-sm focus:outline-none focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/15 transition-all"
            />
          </Field>

          <Field label="Current Status">
            <select
              value={form.status}
              onChange={(e) => set("status", e.target.value as AppStatus)}
              className="w-full px-3 py-2 rounded-lg bg-background border border-border/60 text-sm focus:outline-none focus:border-brand-500/60 transition-all"
            >
              {["APPLIED","SCREENING","INTERVIEW","TECHNICAL","OFFER","ACCEPTED","REJECTED"].map((s) => (
                <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>
              ))}
            </select>
          </Field>

          <Field label="Notes">
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Recruiter name, interview date, salary discussed…"
              rows={2}
              className="w-full px-3 py-2 rounded-lg bg-background border border-border/60 text-sm focus:outline-none focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/15 transition-all resize-none"
            />
          </Field>

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1 bg-brand-500 hover:bg-brand-600" disabled={loading}>
              {loading ? "Adding…" : "Add Application"}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ─── Application Card ─────────────────────────────────────────────────────────

function AppCard({ app, onStatusChange, onDelete }: {
  app: Application;
  onStatusChange: (id: string, status: AppStatus) => void;
  onDelete: (id: string) => void;
}) {
  const [showStatus, setShowStatus] = useState(false);

  const nextStatuses: AppStatus[] = ["APPLIED","SCREENING","INTERVIEW","TECHNICAL","OFFER","ACCEPTED","REJECTED","WITHDRAWN"]
    .filter((s) => s !== app.status) as AppStatus[];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-card border border-border/50 rounded-xl p-4 space-y-3 hover:border-border transition-colors group"
    >
      {/* Company + actions */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center flex-shrink-0 font-bold text-xs text-brand-400">
            {app.job.company.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm line-clamp-1">{app.job.title}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              {app.job.company}
            </p>
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <a
            href={app.job.applyUrl}
            target="_blank"
            rel="noreferrer"
            className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-accent transition-colors"
            title="Open listing"
          >
            <ExternalLink className="w-3 h-3 text-muted-foreground" />
          </a>
          <button
            onClick={() => onDelete(app.id)}
            className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-red-500/10 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-3 h-3 text-muted-foreground hover:text-red-400" />
          </button>
        </div>
      </div>

      {/* Location */}
      {app.job.location && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="w-3 h-3" />
          {app.job.location}
        </div>
      )}

      {/* Notes preview */}
      {app.notes && (
        <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg px-2.5 py-1.5 line-clamp-2 border border-border/30">
          {app.notes}
        </p>
      )}

      {/* Footer: date + status change */}
      <div className="flex items-center justify-between pt-1 border-t border-border/40">
        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatDistanceToNow(new Date(app.createdAt), { addSuffix: true })}
        </span>

        {/* Status picker */}
        <div className="relative">
          <button
            onClick={() => setShowStatus(!showStatus)}
            className={cn("flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-lg border transition-colors", STATUS_BADGE[app.status])}
          >
            {app.status.charAt(0) + app.status.slice(1).toLowerCase()}
            <ChevronDown className="w-2.5 h-2.5" />
          </button>
          {showStatus && (
            <div className="absolute right-0 bottom-7 z-10 bg-card border border-border/60 rounded-xl shadow-xl p-1 w-36">
              {nextStatuses.map((s) => (
                <button
                  key={s}
                  onClick={() => { onStatusChange(app.id, s); setShowStatus(false); }}
                  className="w-full text-left text-xs px-3 py-1.5 rounded-lg hover:bg-accent transition-colors"
                >
                  {s.charAt(0) + s.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Board ───────────────────────────────────────────────────────────────

export function ApplicationsBoard({ initialApplications }: ApplicationsBoardProps) {
  const [apps, setApps] = useState<Application[]>(initialApplications);
  const [showAdd, setShowAdd] = useState(false);

  const stats = {
    total: apps.length,
    interviews: apps.filter((a) => ["INTERVIEW","TECHNICAL"].includes(a.status)).length,
    offers: apps.filter((a) => ["OFFER","ACCEPTED"].includes(a.status)).length,
    responseRate: apps.length > 0
      ? Math.round((apps.filter((a) => a.status !== "APPLIED").length / apps.length) * 100)
      : 0,
  };

  const handleStatusChange = async (id: string, status: AppStatus) => {
    setApps((prev) => prev.map((a) => a.id === id ? { ...a, status } : a));
    try {
      await fetch(`/api/v1/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
    } catch {
      toast({ title: "Could not update status", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    setApps((prev) => prev.filter((a) => a.id !== id));
    try {
      await fetch(`/api/v1/applications/${id}`, { method: "DELETE" });
      toast({ title: "Application removed" });
    } catch {
      toast({ title: "Could not delete", variant: "destructive" });
    }
  };

  const handleAdded = (app: Application) => setApps((prev) => [app, ...prev]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Applications</h1>
          <p className="text-muted-foreground text-sm">Your personal job application tracker — like a CRM for your career</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="bg-brand-500 hover:bg-brand-600">
          <Plus className="w-4 h-4 mr-2" />
          Track Application
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Applied", value: stats.total, color: "text-blue-400", bg: "bg-blue-500/10" },
          { label: "Interviews", value: stats.interviews, color: "text-purple-400", bg: "bg-purple-500/10" },
          { label: "Offers", value: stats.offers, color: "text-green-400", bg: "bg-green-500/10" },
          { label: "Response Rate", value: `${stats.responseRate}%`, color: "text-brand-400", bg: "bg-brand-500/10" },
        ].map((s) => (
          <div key={s.label} className={cn("rounded-xl border border-border/40 p-4 flex items-center gap-3", s.bg.replace("bg-", "bg-"))}>
            <div className={cn("text-2xl font-bold", s.color)}>{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {apps.length === 0 && (
        <div className="text-center py-20 bg-card rounded-2xl border border-border/50 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-brand-500/10 flex items-center justify-center mx-auto">
            <Briefcase className="w-7 h-7 text-brand-400" />
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-1">No applications tracked yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Every time you apply to a job — on LinkedIn, Naukri, Indeed, or anywhere — add it here to track your progress through each stage.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg mx-auto text-left">
            {[
              { icon: "📋", title: "Track every application", desc: "Log jobs from any platform — LinkedIn, Naukri, Indeed, company sites" },
              { icon: "📊", title: "See your pipeline", desc: "Watch your applications move from Applied → Interview → Offer" },
              { icon: "📝", title: "Add notes", desc: "Save recruiter names, salary discussed, interview dates, next steps" },
            ].map((f) => (
              <div key={f.title} className="p-3 rounded-xl bg-accent/30 border border-border/30">
                <div className="text-xl mb-1.5">{f.icon}</div>
                <p className="text-xs font-medium mb-1">{f.title}</p>
                <p className="text-xs text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
          <Button onClick={() => setShowAdd(true)} className="bg-brand-500 hover:bg-brand-600">
            <Plus className="w-4 h-4 mr-2" />
            Add your first application
          </Button>
        </div>
      )}

      {/* Kanban pipeline */}
      {apps.length > 0 && (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-3 min-w-max">
            {PIPELINE.map((col) => {
              const colApps = apps.filter((a) => a.status === col.status);
              return (
                <div key={col.status} className={cn("w-64 rounded-2xl border p-3 flex flex-col gap-2", col.color)}>
                  {/* Column header */}
                  <div className="flex items-center justify-between px-1 mb-1">
                    <div className="flex items-center gap-2">
                      <span className={cn("w-2 h-2 rounded-full", col.dot)} />
                      <span className="text-xs font-semibold">{col.label}</span>
                    </div>
                    <span className="text-xs text-muted-foreground bg-background/60 rounded-full px-1.5 py-0.5 font-medium">
                      {colApps.length}
                    </span>
                  </div>

                  {/* Cards */}
                  <AnimatePresence>
                    {colApps.map((app) => (
                      <AppCard
                        key={app.id}
                        app={app}
                        onStatusChange={(id, status) => void handleStatusChange(id, status)}
                        onDelete={(id) => void handleDelete(id)}
                      />
                    ))}
                  </AnimatePresence>

                  {colApps.length === 0 && (
                    <div className="text-center py-6 text-xs text-muted-foreground opacity-50">
                      No applications
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add modal */}
      <AnimatePresence>
        {showAdd && (
          <AddModal onClose={() => setShowAdd(false)} onAdded={handleAdded} />
        )}
      </AnimatePresence>
    </div>
  );
}
