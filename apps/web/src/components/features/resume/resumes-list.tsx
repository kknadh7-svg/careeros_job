"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, Sparkles, MoreHorizontal, Trash2,
  Star, Clock, Wand2, X, Copy, Check, Loader2, UploadCloud, Download,
  Lock, Crown, ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ATSScoreRing } from "@/components/shared/ats-score-ring";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import type { PlanTier } from "@prisma/client";

interface Resume {
  id: string;
  title: string;
  fileType: string;
  fileUrl: string | null;
  atsScore: number | null;
  isBase: boolean;
  isTailored: boolean;
  status: string;
  version: number;
  createdAt: Date;
  rawText?: string | null;
  tailoredForJob: { title: string; company: string } | null;
}

interface ResumesListProps {
  resumes: Resume[];
  plan: PlanTier;
  enhancementCount: number;
}

// Free plan: 1 enhancement allowed
const FREE_ENHANCEMENT_LIMIT = 1;

function canEnhance(plan: PlanTier, enhancementCount: number): boolean {
  if (plan === "PRO") return true;
  return enhancementCount < FREE_ENHANCEMENT_LIMIT;
}

// ─── Upgrade Nudge Banner ────────────────────────────────────────────────────

function UpgradeBanner() {
  return (
    <a
      href="/pricing/upgrade"
      className="flex items-center gap-4 p-4 rounded-xl border border-brand-500/30 bg-gradient-to-r from-brand-500/10 to-purple-500/10 hover:border-brand-500/60 hover:from-brand-500/15 hover:to-purple-500/15 transition-all group"
    >
      <div className="w-10 h-10 rounded-xl bg-brand-500/15 flex items-center justify-center flex-shrink-0">
        <Crown className="w-5 h-5 text-brand-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">Unlock unlimited AI enhancements</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Free plan includes 1 enhancement. Upgrade to Pro for unlimited AI-powered resumes.
        </p>
      </div>
      <div className="flex items-center gap-1 text-brand-400 text-sm font-medium flex-shrink-0">
        Upgrade
        <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
      </div>
    </a>
  );
}

// ─── Enhance Modal ────────────────────────────────────────────────────────────

function EnhanceModal({
  resume,
  onClose,
  onSuccess,
}: {
  resume: Resume;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const hasStoredText = (resume.rawText?.trim().length ?? 0) > 50;
  const [phase, setPhase] = useState<"idle" | "reupload" | "loading" | "done">(
    hasStoredText ? "idle" : "reupload"
  );
  const [reuploadFile, setReuploadFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [enhancedText, setEnhancedText] = useState("");
  const [enhancedResumeId, setEnhancedResumeId] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const handleFileSelect = (file: File) => {
    if (!file.name.match(/\.(pdf|docx)$/i)) {
      toast({ title: "Invalid file", description: "Please upload a PDF or DOCX file.", variant: "destructive" });
      return;
    }
    setReuploadFile(file);
  };

  const handleEnhance = async () => {
    setPhase("loading");
    try {
      let res: Response;

      if (!hasStoredText && reuploadFile) {
        const formData = new FormData();
        formData.append("file", reuploadFile);
        res = await fetch(`/api/v1/resumes/${resume.id}/enhance`, { method: "POST", body: formData });
      } else {
        res = await fetch(`/api/v1/resumes/${resume.id}/enhance`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
        throw new Error(err?.error?.message ?? "Enhancement failed");
      }
      const { data } = await res.json() as { data: { enhancedText: string; resume: { id: string } } };
      setEnhancedText(data.enhancedText);
      setEnhancedResumeId(data.resume.id);
      setPhase("done");
    } catch (err) {
      toast({ title: "Enhancement failed", description: err instanceof Error ? err.message : "Try again later.", variant: "destructive" });
      setPhase(hasStoredText ? "idle" : "reupload");
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(enhancedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="bg-card border border-border/60 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-500/10 flex items-center justify-center">
              <Wand2 className="w-4 h-4 text-brand-400" />
            </div>
            <div>
              <h2 className="font-semibold text-sm">AI Resume Enhancement</h2>
              <p className="text-xs text-muted-foreground truncate max-w-[20rem]">{resume.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-accent transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* RE-UPLOAD phase */}
          {phase === "reupload" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Upload your resume file — Claude will read it and rewrite it into a{" "}
                <strong className="text-foreground">polished professional version</strong> instantly.
              </p>

              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const f = e.dataTransfer.files[0];
                  if (f) handleFileSelect(f);
                }}
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = ".pdf,.docx";
                  input.onchange = (e) => {
                    const f = (e.target as HTMLInputElement).files?.[0];
                    if (f) handleFileSelect(f);
                  };
                  input.click();
                }}
                className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                  isDragging ? "border-brand-500 bg-brand-500/10" : "border-border/50 hover:border-brand-500/50 hover:bg-accent/20"
                }`}
              >
                {reuploadFile ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                      <FileText className="w-6 h-6 text-green-400" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-green-400">{reuploadFile.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {(reuploadFile.size / 1024).toFixed(0)} KB — click to change file
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-brand-500/10 flex items-center justify-center">
                      <UploadCloud className="w-6 h-6 text-brand-400" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Drop your resume here</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        or <span className="text-brand-400">click to browse</span> — PDF or DOCX
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                {["Strong action verbs", "Quantified achievements", "Professional summary", "ATS-optimized structure"].map((f) => (
                  <div key={f} className="flex items-center gap-2 text-xs text-muted-foreground bg-accent/20 rounded-lg px-3 py-2">
                    <Sparkles className="w-3 h-3 text-brand-400 flex-shrink-0" />
                    {f}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* IDLE phase */}
          {phase === "idle" && (
            <div className="space-y-5">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Claude AI will rewrite your resume into a{" "}
                <strong className="text-foreground">polished, professional version</strong>{" "}
                optimized for ATS systems and recruiters — using your exact experience and credentials.
              </p>
              <div className="grid grid-cols-1 gap-3">
                {[
                  { icon: "✦", label: "Professional Summary", desc: "Compelling 3-4 sentence intro for your target role" },
                  { icon: "⚡", label: "Action-Verb Rewrites", desc: "Every bullet: Led, Built, Optimized, Delivered…" },
                  { icon: "📊", label: "Quantified Achievements", desc: "Metrics and impact added where logically inferable" },
                  { icon: "🎯", label: "ATS-Optimized Structure", desc: "Clean section headers that pass automated screening" },
                  { icon: "✂️", label: "Weak Phrases Removed", desc: "'Responsible for' replaced with impact statements" },
                ].map((item) => (
                  <div key={item.label} className="flex items-start gap-3 p-3 rounded-xl bg-accent/30 border border-border/30">
                    <span className="text-base mt-0.5">{item.icon}</span>
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                Your original resume is kept safe. The enhanced version is saved as a separate copy.
              </p>
            </div>
          )}

          {/* LOADING phase */}
          {phase === "loading" && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-brand-500/10 flex items-center justify-center">
                  <Wand2 className="w-7 h-7 text-brand-400" />
                </div>
                <div className="absolute -inset-1 rounded-2xl border-2 border-brand-500/30 animate-ping" />
              </div>
              <div className="text-center space-y-1">
                <p className="font-medium">Claude is reading and rewriting your resume…</p>
                <p className="text-sm text-muted-foreground">This takes 15–25 seconds</p>
              </div>
              <div className="flex gap-1.5 mt-2">
                {[0, 1, 2].map((i) => (
                  <motion.div key={i} className="w-2 h-2 rounded-full bg-brand-400"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.4 }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* DONE phase */}
          {phase === "done" && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                <div className="w-10 h-10 rounded-xl bg-green-500/15 flex items-center justify-center flex-shrink-0">
                  <Check className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="font-semibold text-green-400 text-sm">Resume enhanced successfully!</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Your professional resume is ready to download as a DOCX file.</p>
                </div>
              </div>

              <a
                href={`/api/v1/resumes/${enhancedResumeId}/download`}
                download
                className="flex items-center gap-4 p-4 rounded-xl border-2 border-brand-500/40 bg-brand-500/5 hover:bg-brand-500/10 hover:border-brand-500/70 transition-all cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-xl bg-brand-500/15 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-6 h-6 text-brand-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground">{resume.title} — AI Enhanced.docx</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Formatted DOCX • Ready to open in Word or Google Docs</p>
                </div>
                <div className="flex items-center gap-1.5 text-brand-400 text-sm font-medium flex-shrink-0">
                  <Download className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
                  Download
                </div>
              </a>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Preview</p>
                  <button onClick={handleCopy} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                    {copied ? "Copied!" : "Copy text"}
                  </button>
                </div>
                <pre className="whitespace-pre-wrap text-xs font-mono leading-relaxed bg-muted/20 border border-border/40 rounded-xl p-4 max-h-60 overflow-y-auto text-muted-foreground">
                  {enhancedText.slice(0, 800)}{enhancedText.length > 800 ? "\n\n… (download to see full resume)" : ""}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border/50 flex gap-3 shrink-0">
          {phase === "reupload" && (
            <>
              <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
              <Button
                className="flex-1 bg-brand-500 hover:bg-brand-600"
                onClick={() => void handleEnhance()}
                disabled={!reuploadFile}
              >
                <Wand2 className="w-4 h-4 mr-2" />
                {reuploadFile ? "Enhance with Claude AI" : "Select a file first"}
              </Button>
            </>
          )}
          {phase === "idle" && (
            <>
              <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
              <Button className="flex-1 bg-brand-500 hover:bg-brand-600" onClick={() => void handleEnhance()}>
                <Wand2 className="w-4 h-4 mr-2" />
                Enhance with Claude AI
              </Button>
            </>
          )}
          {phase === "loading" && (
            <Button variant="outline" className="flex-1" disabled>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Enhancing…
            </Button>
          )}
          {phase === "done" && (
            <>
              <Button variant="outline" className="flex-1" onClick={() => { onSuccess(); onClose(); }}>
                Close
              </Button>
              <Button className="flex-1 bg-brand-500 hover:bg-brand-600" asChild>
                <a href={`/api/v1/resumes/${enhancedResumeId}/download`} download>
                  <Download className="w-4 h-4 mr-2" />
                  Download DOCX
                </a>
              </Button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ─── Resume Card ──────────────────────────────────────────────────────────────

function ResumeCard({
  resume,
  plan,
  enhancementCount,
  onEnhance,
}: {
  resume: Resume;
  plan: PlanTier;
  enhancementCount: number;
  onEnhance: () => void;
}) {
  const allowed = canEnhance(plan, enhancementCount);
  const isEnhanced = resume.isTailored;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group bg-card rounded-xl border border-border/50 p-5 hover:border-border transition-colors flex flex-col gap-4"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-brand-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-sm leading-tight line-clamp-1">{resume.title}</h3>
              {resume.isBase && <Star className="w-3 h-3 text-yellow-400 fill-yellow-400 flex-shrink-0" />}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <Badge variant="secondary" className="text-[10px] px-1.5 h-4">{resume.fileType}</Badge>
              {isEnhanced && (
                <Badge variant="secondary" className="text-[10px] px-1.5 h-4 bg-brand-500/15 text-brand-400 border-0">
                  <Sparkles className="w-2.5 h-2.5 mr-1" />
                  AI Enhanced
                </Badge>
              )}
            </div>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {!isEnhanced && (
              <DropdownMenuItem onClick={allowed ? onEnhance : undefined} className={!allowed ? "opacity-50 cursor-not-allowed" : ""}>
                <Wand2 className="w-4 h-4 mr-2" />
                Enhance with AI
              </DropdownMenuItem>
            )}
            {isEnhanced && (
              <DropdownMenuItem asChild>
                <a href={`/api/v1/resumes/${resume.id}/download`} download>
                  <Download className="w-4 h-4 mr-2" />
                  Download DOCX
                </a>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ATS Score */}
      <div className="flex items-center justify-between">
        {resume.status === "PROCESSING" ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Analyzing…
          </div>
        ) : resume.atsScore !== null ? (
          <div className="flex items-center gap-3">
            <ATSScoreRing score={resume.atsScore} size="sm" />
            <div>
              <div className={cn("text-xl font-bold",
                resume.atsScore >= 80 ? "text-green-400" : resume.atsScore >= 60 ? "text-yellow-400" : "text-red-400"
              )}>
                {resume.atsScore}<span className="text-xs text-muted-foreground font-normal">/100</span>
              </div>
              <div className="text-xs text-muted-foreground">ATS Score</div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">Not scored yet</div>
        )}
        {resume.tailoredForJob && (
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Tailored for</div>
            <div className="text-xs font-medium line-clamp-1">{resume.tailoredForJob.company}</div>
          </div>
        )}
      </div>

      {/* CTA area */}
      {!isEnhanced && (
        allowed ? (
          /* Enhance button — available */
          <Button
            onClick={onEnhance}
            variant="outline"
            className="w-full border-brand-500/30 text-brand-400 hover:bg-brand-500/10 hover:border-brand-500/60 group/btn transition-all"
          >
            <Wand2 className="w-4 h-4 mr-2 group-hover/btn:animate-pulse" />
            Enhance with Claude AI
            <Sparkles className="w-3.5 h-3.5 ml-2 opacity-60" />
          </Button>
        ) : (
          /* Locked — upgrade CTA */
          <a
            href="/pricing/upgrade"
            className="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-lg border border-border/60 bg-muted/30 text-muted-foreground hover:border-brand-500/40 hover:text-brand-400 hover:bg-brand-500/5 transition-all text-sm font-medium group/lock"
          >
            <Lock className="w-3.5 h-3.5" />
            Enhancement used
            <span className="ml-auto flex items-center gap-1 text-xs text-brand-400 opacity-80 group-hover/lock:opacity-100">
              <Crown className="w-3 h-3" />
              Upgrade to unlock
            </span>
          </a>
        )
      )}

      {/* Download for enhanced resumes */}
      {isEnhanced && (
        <Button
          variant="outline"
          className="w-full border-green-500/30 text-green-400 hover:bg-green-500/10 hover:border-green-500/60 transition-all"
          asChild
        >
          <a href={`/api/v1/resumes/${resume.id}/download`} download>
            <Download className="w-4 h-4 mr-2" />
            Download as DOCX
          </a>
        </Button>
      )}

      {/* Footer */}
      <div className="flex items-center gap-1.5 pt-1 border-t border-border/50">
        <Clock className="w-3 h-3 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(resume.createdAt), { addSuffix: true })}
        </span>
      </div>
    </motion.div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function ResumesList({ resumes, plan, enhancementCount }: ResumesListProps) {
  const router = useRouter();
  const [enhancingResume, setEnhancingResume] = useState<Resume | null>(null);

  if (resumes.length === 0) {
    return (
      <div className="text-center py-16 bg-card rounded-2xl border border-border/50">
        <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">No resumes yet</h3>
        <p className="text-muted-foreground text-sm max-w-sm mx-auto">
          Upload your resume above to get your ATS score and start applying with AI.
        </p>
      </div>
    );
  }

  const showUpgradeBanner = plan === "FREE" && enhancementCount >= FREE_ENHANCEMENT_LIMIT;

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Your Resumes</h2>
          {plan === "FREE" && (
            <span className="text-xs text-muted-foreground bg-muted/50 border border-border/40 rounded-full px-3 py-1">
              Free plan · {enhancementCount}/{FREE_ENHANCEMENT_LIMIT} enhancement used
            </span>
          )}
        </div>

        {showUpgradeBanner && <UpgradeBanner />}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {resumes.map((resume) => (
            <ResumeCard
              key={resume.id}
              resume={resume}
              plan={plan}
              enhancementCount={enhancementCount}
              onEnhance={() => setEnhancingResume(resume)}
            />
          ))}
        </div>
      </div>

      <AnimatePresence>
        {enhancingResume && (
          <EnhanceModal
            resume={enhancingResume}
            onClose={() => setEnhancingResume(null)}
            onSuccess={() => router.refresh()}
          />
        )}
      </AnimatePresence>
    </>
  );
}
