"use client";

import * as React from "react";
import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Bot, Send, ArrowLeft, Star, TrendingUp, AlertCircle,
  Mic, MicOff, Volume2, VolumeX, MessageSquare,
  Lightbulb, Lock, Crown, ChevronDown, ChevronUp,
  CheckCircle2, XCircle, BarChart2, Loader2, Sparkles, Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatMessage { role: "user" | "assistant"; content: string; }

interface ScoreBreakdown { communication: number; technicalDepth: number; structuredThinking: number; specificExamples: number; }

interface QuestionReview { question: string; userAnswer: string; modelAnswer: string; score: number; }

interface InterviewFeedback {
  overallScore: number;
  scoreBreakdown: ScoreBreakdown;
  feedback: string;
  strengths: string[];
  improvements: string[];
  questionReviews: QuestionReview[];
  hasAnswers: boolean;
  plan: "FREE" | "PRO";
  maxQuestions: number;
}

type ApiPayload =
  | { isComplete: false; message: string; questionNumber: number; plan?: string; maxQuestions?: number; hintsAllowed?: number }
  | { isComplete: true } & InterviewFeedback
  | { isHint: true; hint: string | null; hintsRemaining: number; error?: string };

// ─── API helpers ──────────────────────────────────────────────────────────────

class DailyLimitError extends Error {
  constructor(public readonly detail: { message: string; sessionsUsed: number; dailyLimit: number; plan: string }) {
    super(detail.message);
    this.name = "DailyLimitError";
  }
}

async function callChatApi(
  messages: ChatMessage[],
  interviewType: string,
  questionNumber: number,
  endSession = false
): Promise<ApiPayload> {
  const res = await fetch("/api/v1/interviews/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, interviewType, questionNumber, endSession }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: { code?: string; message?: string; sessionsUsed?: number; dailyLimit?: number; plan?: string } };
    if (res.status === 429 && body?.error?.code === "DAILY_LIMIT_REACHED") {
      throw new DailyLimitError({
        message: body.error.message ?? "Daily limit reached.",
        sessionsUsed: body.error.sessionsUsed ?? 0,
        dailyLimit: body.error.dailyLimit ?? 2,
        plan: body.error.plan ?? "FREE",
      });
    }
    throw new Error(body?.error?.message ?? `Request failed ${res.status}`);
  }
  const json = (await res.json()) as { data: ApiPayload };
  return json.data;
}

async function callHintApi(messages: ChatMessage[], hintsUsed: number): Promise<{ hint: string | null; hintsRemaining: number; error?: string }> {
  const res = await fetch("/api/v1/interviews/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, interviewType: "BEHAVIORAL", questionNumber: 1, requestHint: true, hintsUsed }),
  });
  const json = (await res.json()) as { data: { isHint: true; hint: string | null; hintsRemaining: number; error?: string } };
  return json.data;
}

// ─── Speech helpers ───────────────────────────────────────────────────────────

function speak(text: string) {
  if (typeof window === "undefined") return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.92; u.pitch = 1;
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find((v) => v.lang.startsWith("en") && (v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Premium"))) ?? voices.find((v) => v.lang.startsWith("en"));
  if (preferred) u.voice = preferred;
  window.speechSynthesis.speak(u);
}
function stopSpeaking() { if (typeof window !== "undefined") window.speechSynthesis.cancel(); }

const CHUNK_MS = 6000;        // 6-second recording chunks
const SPEECH_THRESHOLD = 22;  // RMS energy — must exceed this to count as speech (background noise ~5–12)
const MIN_SPEECH_MS = 900;    // at least 900ms of detected speech required to send chunk to Whisper

// Known Whisper hallucinations on silence/noise — discard these
const HALLUCINATION_PATTERNS = [
  "thank you for watching", "thanks for watching", "please subscribe", "like and subscribe",
  "good evening", "good morning", "good night", "have a good", "see you next",
  "hope you guys", "i hope you", "i'm done", "that's all", "for more information",
  "visit our", "visit www", ".gov", ".com", ".org", "www.", "subscribe",
  "bye", "goodbye", "cheers", "take care", "breast cancer", "fema",
];

function isHallucination(text: string): boolean {
  const lower = text.toLowerCase().trim();
  if (lower.length < 5) return true;
  return HALLUCINATION_PATTERNS.some((p) => lower.includes(p));
}

function getSupportedMimeType(): string {
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/ogg", "audio/mp4"];
  return types.find((t) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) ?? "";
}

// Primes Whisper with professional/interview vocabulary so it biases
// toward real words rather than phonetic guesses on accented speech.
const WHISPER_DOMAIN_HINT =
  "Professional job interview. Work experience, technical skills, projects, " +
  "software engineering, product management, data science, finance, banking, " +
  "consulting, MBA, B.Tech, leadership, agile, scrum, SQL, Python, AWS. ";

async function transcribeChunk(blob: Blob, context: string): Promise<string> {
  if (blob.size < 4000) return ""; // too small — almost certainly silence
  const ext = blob.type.includes("ogg") ? "audio.ogg" : blob.type.includes("mp4") ? "audio.mp4" : "audio.webm";
  const form = new FormData();
  form.append("audio", blob, ext);
  // Whisper uses the prompt as vocabulary/style context (max ~224 tokens).
  // Prepend the domain hint so the model knows it's hearing professional speech,
  // then append the previous transcription for cross-chunk word continuity.
  const promptText = (WHISPER_DOMAIN_HINT + context).slice(-800);
  form.append("context", promptText);
  try {
    const res = await fetch("/api/v1/interviews/transcribe", { method: "POST", body: form });
    if (!res.ok) return "";
    const data = (await res.json()) as { text?: string };
    const text = data.text?.trim() ?? "";
    // Discard known Whisper hallucinations
    return isHallucination(text) ? "" : text;
  } catch { return ""; }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2">
      <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center shrink-0">
        <Bot className="w-4 h-4 text-brand-400" />
      </div>
      <div className="bg-card border border-border/50 rounded-2xl rounded-bl-sm px-4 py-3">
        <div className="flex gap-1 items-center h-4">
          {[0,1,2].map((i) => (
            <motion.span key={i} className="w-1.5 h-1.5 rounded-full bg-muted-foreground"
              animate={{ opacity:[0.3,1,0.3], y:[0,-3,0] }}
              transition={{ duration:1, repeat:Infinity, delay:i*0.2 }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isAI = message.role === "assistant";
  return (
    <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.25 }}
      className={cn("flex items-end gap-2", !isAI && "flex-row-reverse")}>
      {isAI && (
        <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center shrink-0">
          <Bot className="w-4 h-4 text-brand-400" />
        </div>
      )}
      <div className={cn("max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
        isAI ? "bg-card border border-border/50 rounded-bl-sm" : "bg-brand-500 text-white rounded-br-sm")}>
        {message.content}
      </div>
    </motion.div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const color = value >= 80 ? "bg-green-400" : value >= 60 ? "bg-yellow-400" : "bg-red-400";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}</span>
      </div>
      <div className="h-1.5 bg-border/60 rounded-full overflow-hidden">
        <motion.div className={cn("h-full rounded-full", color)}
          initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ duration: 0.7, delay: 0.2 }} />
      </div>
    </div>
  );
}

function QuestionReviewCard({ review, index, isFree, isLocked }: { review: QuestionReview; index: number; isFree: boolean; isLocked: boolean }) {
  const [open, setOpen] = React.useState(index === 0);
  const scoreColor = review.score >= 80 ? "text-green-400" : review.score >= 60 ? "text-yellow-400" : "text-red-400";

  return (
    <div className={cn("border rounded-xl overflow-hidden", isLocked ? "border-border/30 opacity-60" : "border-border/50")}>
      <button
        onClick={() => !isLocked && setOpen(!open)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-accent/20 transition-colors"
        disabled={isLocked}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-6 h-6 rounded-full bg-brand-500/10 text-brand-400 text-xs font-bold flex items-center justify-center flex-shrink-0">
            {index + 1}
          </span>
          <p className="text-sm font-medium line-clamp-1 text-left">{review.question}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          {isLocked ? (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Lock className="w-3 h-3" /> Pro
            </div>
          ) : (
            <>
              <span className={cn("text-sm font-bold", scoreColor)}>{review.score}</span>
              {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </>
          )}
        </div>
      </button>

      {open && !isLocked && (
        <div className="px-4 pb-4 space-y-3 border-t border-border/40 pt-3">
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Your answer</p>
            <p className="text-sm text-muted-foreground bg-muted/20 rounded-lg px-3 py-2 leading-relaxed">{review.userAnswer}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-green-400 uppercase tracking-wide mb-1">Model answer</p>
            <p className="text-sm text-muted-foreground bg-green-500/5 border border-green-500/20 rounded-lg px-3 py-2 leading-relaxed">{review.modelAnswer}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function DailyLimitScreen({ sessionsUsed, dailyLimit, plan, onBack }: { sessionsUsed: number; dailyLimit: number; plan: string; onBack: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center h-full gap-6 max-w-md mx-auto text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
        <Lock className="w-7 h-7 text-amber-400" />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Daily Limit Reached</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          You&apos;ve used <strong className="text-foreground">{sessionsUsed} of {dailyLimit}</strong> free mock interview sessions today.
          Your limit resets at midnight.
        </p>
      </div>
      {plan === "FREE" && (
        <div className="w-full rounded-xl border border-brand-500/30 bg-brand-500/5 p-4 space-y-3">
          <div className="flex items-center gap-2 text-brand-400 text-sm font-medium">
            <Crown className="w-4 h-4" /> Upgrade to Pro
          </div>
          <p className="text-xs text-muted-foreground text-left">Get unlimited mock interview sessions every day, plus 10 questions per session and unlimited hints.</p>
          <a href="/pricing/upgrade"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition-colors">
            Upgrade to Pro
            <ArrowRight />
          </a>
        </div>
      )}
      <Button variant="outline" className="w-full" onClick={onBack}>
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Interviews
      </Button>
    </motion.div>
  );
}

function FeedbackScreen({ feedback, onRestart }: { feedback: InterviewFeedback; onRestart: () => void }) {
  // No answers — show a minimal prompt to retry properly
  if (!feedback.hasAnswers) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center gap-6 max-w-md mx-auto text-center px-4 pt-16">
        <div className="w-16 h-16 rounded-2xl bg-muted border border-border/50 flex items-center justify-center">
          <AlertCircle className="w-7 h-7 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">No Answers Recorded</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            You ended the session before answering any questions. We need at least one answer to generate a meaningful score.
          </p>
        </div>
        <ul className="text-left text-sm text-muted-foreground space-y-2 w-full bg-card border border-border/50 rounded-xl p-4">
          <li className="flex items-start gap-2"><span className="text-brand-400 mt-0.5">→</span>Read each question carefully before responding</li>
          <li className="flex items-start gap-2"><span className="text-brand-400 mt-0.5">→</span>Use the STAR method (Situation, Task, Action, Result)</li>
          <li className="flex items-start gap-2"><span className="text-brand-400 mt-0.5">→</span>Try the Hint button if you&apos;re unsure what to say</li>
        </ul>
        <Button className="w-full bg-brand-500 hover:bg-brand-600" onClick={onRestart}>
          Try Again
        </Button>
      </motion.div>
    );
  }

  const score = feedback.overallScore;
  const scoreColor = score >= 80 ? "text-green-400" : score >= 60 ? "text-yellow-400" : "text-red-400";
  const scoreBg = score >= 80 ? "border-green-500/30 bg-green-500/5" : score >= 60 ? "border-yellow-500/30 bg-yellow-500/5" : "border-red-500/30 bg-red-500/5";
  const scoreLabel = score >= 80 ? "Excellent" : score >= 70 ? "Good" : score >= 60 ? "Average" : "Needs Work";

  // All users see all question reviews
  const visibleReviews = feedback.questionReviews.length;

  return (
    <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} className="space-y-5 max-w-2xl mx-auto w-full pb-8">

      {/* Score hero */}
      <div className={cn("rounded-2xl border p-6 text-center space-y-2", scoreBg)}>
        <div className="flex items-center justify-center gap-3 mb-3">
          <Star className="w-5 h-5 text-brand-400" />
          <h2 className="font-semibold">Interview Complete</h2>
        </div>
        <div className={cn("text-7xl font-bold tabular-nums", scoreColor)}>{score}</div>
        <div className="text-sm text-muted-foreground">/ 100 — <span className={scoreColor}>{scoreLabel}</span></div>
        <p className="text-sm text-muted-foreground leading-relaxed mt-3 max-w-md mx-auto">{feedback.feedback}</p>
      </div>

      {/* Score breakdown */}
      {feedback.scoreBreakdown && (
        <div className="bg-card border border-border/50 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <BarChart2 className="w-4 h-4 text-brand-400" />
            <h3 className="font-semibold text-sm">Score Breakdown</h3>
          </div>
          <ScoreBar label="Communication" value={feedback.scoreBreakdown.communication} />
          <ScoreBar label="Technical Depth" value={feedback.scoreBreakdown.technicalDepth} />
          <ScoreBar label="Structured Thinking" value={feedback.scoreBreakdown.structuredThinking} />
          <ScoreBar label="Specific Examples" value={feedback.scoreBreakdown.specificExamples} />
        </div>
      )}

      {/* Strengths + Improvements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border border-border/50 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-green-400">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm font-semibold">Strengths</span>
          </div>
          <ul className="space-y-2">
            {feedback.strengths.map((s, i) => (
              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-green-400 mt-0.5 flex-shrink-0">+</span>{s}
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-card border border-border/50 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-yellow-400">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-semibold">Improve On</span>
          </div>
          <ul className="space-y-2">
            {feedback.improvements.map((s, i) => (
              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-yellow-400 mt-0.5 flex-shrink-0">→</span>{s}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Question reviews */}
      {feedback.questionReviews.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-brand-400" />
            <h3 className="font-semibold text-sm">Question-by-Question Review</h3>
          </div>
          <div className="space-y-2">
            {feedback.questionReviews.map((r, i) => (
              <QuestionReviewCard
                key={i}
                review={r}
                index={i}
                isFree={false}
                isLocked={false}
              />
            ))}
          </div>
        </div>
      )}

      <Button className="w-full bg-brand-500 hover:bg-brand-600" onClick={onRestart}>
        Start New Session
      </Button>
    </motion.div>
  );
}

function ArrowRight() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>;
}

function MicDeniedBanner() {
  const isChrome = typeof navigator !== "undefined" && /Chrome/.test(navigator.userAgent) && !/Edg/.test(navigator.userAgent);
  return (
    <div className="w-full rounded-xl border border-red-500/30 bg-red-500/5 p-4 space-y-3 text-sm">
      <div className="flex items-center gap-2 text-red-400 font-medium">
        <MicOff className="w-4 h-4 flex-shrink-0" />
        Microphone access is blocked
      </div>
      <p className="text-muted-foreground text-xs leading-relaxed">
        Your browser denied microphone access. To enable it:
      </p>
      <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
        {isChrome ? (
          <>
            <li>Click the <strong className="text-foreground">🔒 lock icon</strong> in the address bar</li>
            <li>Set <strong className="text-foreground">Microphone</strong> to <strong className="text-foreground">Allow</strong></li>
            <li>Reload the page and try again</li>
          </>
        ) : (
          <>
            <li>Open your browser settings → Site permissions</li>
            <li>Find this site and allow <strong className="text-foreground">Microphone</strong></li>
            <li>Reload the page and try again</li>
          </>
        )}
      </ol>
      <p className="text-[10px] text-muted-foreground opacity-70">
        You can also switch to <strong>Text mode</strong> above to type your answers instead.
      </p>
    </div>
  );
}

function VoiceOrb({ isListening, isLoading, isTranscribing, onClick }: {
  isListening: boolean; isLoading: boolean; isTranscribing: boolean; onClick: () => void;
}) {
  const bg = isTranscribing ? "bg-brand-500/70 cursor-not-allowed" : isListening ? "bg-red-500" : "bg-brand-500 hover:bg-brand-600";
  return (
    <motion.button onClick={onClick} disabled={isLoading || isTranscribing}
      className={cn("relative w-24 h-24 rounded-full flex items-center justify-center transition-colors focus:outline-none", bg)}
      whileTap={{ scale: 0.95 }}>
      {isListening && !isTranscribing && (
        <motion.div className="absolute inset-0 rounded-full bg-red-500"
          animate={{ scale:[1,1.35,1], opacity:[0.6,0,0.6] }}
          transition={{ duration:1.5, repeat:Infinity }} />
      )}
      {isTranscribing
        ? <Loader2 className="w-8 h-8 text-white animate-spin relative z-10" />
        : isListening
        ? <MicOff className="w-8 h-8 text-white relative z-10" />
        : <Mic className="w-8 h-8 text-white relative z-10" />}
    </motion.button>
  );
}

// ─── Main session ─────────────────────────────────────────────────────────────

function InterviewSession() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const interviewType = searchParams.get("type") ?? "BEHAVIORAL";
  const { toast } = useToast();

  const [mode, setMode] = React.useState<"text" | "voice">("text");
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [questionNumber, setQuestionNumber] = React.useState(1);
  const [maxQuestions, setMaxQuestions] = React.useState(8);
  const [plan, setPlan] = React.useState<"FREE" | "PRO">("FREE");
  const [hintsAllowed, setHintsAllowed] = React.useState(1);
  const [hintsUsed, setHintsUsed] = React.useState(0);
  const [hintText, setHintText] = React.useState<string | null>(null);
  const [showHint, setShowHint] = React.useState(false);
  const [isLoadingHint, setIsLoadingHint] = React.useState(false);

  const [isLoading, setIsLoading] = React.useState(false);
  const [isComplete, setIsComplete] = React.useState(false);
  const [feedback, setFeedback] = React.useState<InterviewFeedback | null>(null);
  const [dailyLimitInfo, setDailyLimitInfo] = React.useState<{ sessionsUsed: number; dailyLimit: number; plan: string } | null>(null);
  const [inputValue, setInputValue] = React.useState("");
  const [isImproving, setIsImproving] = React.useState(false);
  const [isSpeaking, setIsSpeaking] = React.useState(true);

  // Voice state — Whisper-based recording
  const [isListening, setIsListening] = React.useState(false);
  const [isTranscribing, setIsTranscribing] = React.useState(false);
  const [displayTranscript, setDisplayTranscript] = React.useState("");
  const [micPermission, setMicPermission] = React.useState<"unknown" | "granted" | "denied" | "unavailable">("unknown");
  const finalTranscriptRef = React.useRef("");
  const whisperContextRef = React.useRef(""); // accumulated text passed as Whisper prompt for continuity
  const mediaStreamRef = React.useRef<MediaStream | null>(null);
  const currentRecorderRef = React.useRef<MediaRecorder | null>(null);
  const chunkTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRecordingIntentRef = React.useRef(false);
  const isFinalStopRef = React.useRef(false);
  // VAD — Voice Activity Detection to suppress Whisper hallucinations on silence
  const audioContextRef = React.useRef<AudioContext | null>(null);
  const analyserNodeRef = React.useRef<AnalyserNode | null>(null);
  const vadIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const speechDetectedRef = React.useRef(false); // was enough speech detected in current chunk?
  const speechDurationMsRef = React.useRef(0);   // ms of above-threshold audio in current chunk
  const [micVolume, setMicVolume] = React.useState(0); // 0–100 for the VU meter
  // Initialized lazily after sendMessage is declared (see effect below)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sendMessageRef = React.useRef<(text: string) => Promise<void>>(async () => {});

  const scrollRef = React.useRef<HTMLDivElement>(null);
  const initializedRef = React.useRef(false);

  const speakIfEnabled = React.useCallback((text: string) => { if (isSpeaking) speak(text); }, [isSpeaking]);

  React.useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isLoading]);

  React.useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    void (async () => {
      setIsLoading(true);
      try {
        const data = await callChatApi([], interviewType, 1);
        if (!("isHint" in data) && !data.isComplete) {
          setMessages([{ role: "assistant", content: data.message }]);
          setQuestionNumber(1);
          if (data.plan) setPlan(data.plan as "FREE" | "PRO");
          if (data.maxQuestions) setMaxQuestions(data.maxQuestions);
          if (data.hintsAllowed !== undefined) setHintsAllowed(data.hintsAllowed);
          speakIfEnabled(data.message);
        }
      } catch (err) {
        if (err instanceof DailyLimitError) {
          setDailyLimitInfo({ sessionsUsed: err.detail.sessionsUsed, dailyLimit: err.detail.dailyLimit, plan: err.detail.plan });
        } else {
          toast({ title: "Connection Error", description: err instanceof Error ? err.message : "Failed to start.", variant: "destructive" });
        }
      } finally { setIsLoading(false); }
    })();
  }, [interviewType, toast, speakIfEnabled]);

  React.useEffect(() => {
    return () => {
      stopSpeaking();
      isRecordingIntentRef.current = false;
      isFinalStopRef.current = false;
      if (chunkTimerRef.current) clearTimeout(chunkTimerRef.current);
      if (vadIntervalRef.current) clearInterval(vadIntervalRef.current);
      if (currentRecorderRef.current?.state === "recording") currentRecorderRef.current.stop();
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
      audioContextRef.current?.close().catch(() => {});
    };
  }, []);

  const sendMessage = React.useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading || isComplete) return;

    const userMessage: ChatMessage = { role: "user", content: trimmed };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputValue("");
    setDisplayTranscript("");
    finalTranscriptRef.current = "";
    setHintText(null);
    setShowHint(false);
    setIsLoading(true);

    const nextQ = questionNumber + 1;
    try {
      const data = await callChatApi(updatedMessages, interviewType, nextQ);
      if ("isHint" in data) return;
      if (data.isComplete) {
        setFeedback(data as InterviewFeedback);
        setIsComplete(true);
        stopSpeaking();
      } else {
        setMessages([...updatedMessages, { role: "assistant", content: data.message }]);
        setQuestionNumber(nextQ);
        speakIfEnabled(data.message);
      }
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Something went wrong.", variant: "destructive" });
      setMessages(messages);
    } finally { setIsLoading(false); }
  }, [messages, questionNumber, interviewType, isLoading, isComplete, speakIfEnabled, toast]);

  // Keep ref always pointing to the latest sendMessage to avoid stale closures in MediaRecorder callbacks
  React.useEffect(() => { sendMessageRef.current = sendMessage; }, [sendMessage]);

  const polishAnswer = React.useCallback(async (rawText: string, setter: (v: string) => void) => {
    const trimmed = rawText.trim();
    if (!trimmed || trimmed.length < 5) return;
    setIsImproving(true);
    try {
      const res = await fetch("/api/v1/interviews/improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });
      if (res.ok) {
        const data = (await res.json()) as { data?: { improved?: string } };
        const improved = data?.data?.improved;
        if (improved) setter(improved);
      }
    } catch { /* keep original on failure */ }
    finally { setIsImproving(false); }
  }, []);

  const handleHint = async () => {
    if (isLoadingHint) return;
    if (showHint && hintText) { setShowHint(false); return; }
    setIsLoadingHint(true);
    try {
      const result = await callHintApi(messages, hintsUsed);
      if (result.error) {
        toast({ title: "Hint unavailable", description: result.error, variant: "destructive" });
        return;
      }
      setHintText(result.hint);
      setHintsUsed((h) => h + 1);
      setShowHint(true);
    } catch {
      toast({ title: "Could not load hint", variant: "destructive" });
    } finally { setIsLoadingHint(false); }
  };

  const handleEndSession = async () => {
    if (isLoading) return;
    setIsLoading(true);
    stopSpeaking();
    try {
      const data = await callChatApi(messages, interviewType, questionNumber, true);
      if ("isComplete" in data && data.isComplete) {
        setFeedback(data as InterviewFeedback);
        setIsComplete(true);
      }
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to generate feedback.", variant: "destructive" });
    } finally { setIsLoading(false); }
  };

  // ── Start a recording chunk with VAD. Next chunk starts immediately on stop
  //    so there is zero gap while Whisper transcribes in parallel. ──────────
  const startChunk = React.useCallback((stream: MediaStream) => {
    if (!stream.active || !isRecordingIntentRef.current) return;

    const mimeType = getSupportedMimeType();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const audioChunks: Blob[] = [];

    // ── VAD setup — track both energy AND duration ────────────────────────────
    speechDetectedRef.current = false;
    speechDurationMsRef.current = 0;
    const VAD_TICK = 80; // ms

    try {
      if (!audioContextRef.current || audioContextRef.current.state === "closed") {
        audioContextRef.current = new AudioContext();
      }
      if (audioContextRef.current.state === "suspended") void audioContextRef.current.resume();

      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.3;
      audioContextRef.current.createMediaStreamSource(stream).connect(analyser);
      analyserNodeRef.current = analyser;

      const freqData = new Uint8Array(analyser.frequencyBinCount);
      vadIntervalRef.current = setInterval(() => {
        analyser.getByteFrequencyData(freqData);
        const rms = Math.sqrt(freqData.reduce((sum, v) => sum + v * v, 0) / freqData.length);
        setMicVolume(Math.min(100, Math.round(rms * 2.5)));
        if (rms > SPEECH_THRESHOLD) {
          speechDurationMsRef.current += VAD_TICK;
          // Only flag as speech after sustained detection (filters out coughs, clicks)
          if (speechDurationMsRef.current >= MIN_SPEECH_MS) {
            speechDetectedRef.current = true;
          }
        }
      }, VAD_TICK);
    } catch { /* AudioContext unavailable — skip VAD, always transcribe */ }

    recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunks.push(e.data); };

    recorder.onstop = () => {
      // Capture snapshot of flags BEFORE anything async
      const isFinal = isFinalStopRef.current;
      const hadSpeech = speechDetectedRef.current || !analyserNodeRef.current;
      const chunks = [...audioChunks];
      const chunkMime = mimeType || "audio/webm";

      // Stop VAD
      if (vadIntervalRef.current) { clearInterval(vadIntervalRef.current); vadIntervalRef.current = null; }
      setMicVolume(0);
      currentRecorderRef.current = null;
      if (chunkTimerRef.current) { clearTimeout(chunkTimerRef.current); chunkTimerRef.current = null; }

      if (isFinal) {
        isFinalStopRef.current = false;
        // Transcribe last chunk then send — keep stream open until done
        void (async () => {
          if (hadSpeech && chunks.length > 0) {
            setIsTranscribing(true);
            const blob = new Blob(chunks, { type: chunkMime });
            const text = await transcribeChunk(blob, whisperContextRef.current);
            setIsTranscribing(false);
            if (text) {
              whisperContextRef.current = (whisperContextRef.current + " " + text).trim();
              finalTranscriptRef.current = whisperContextRef.current;
              setDisplayTranscript(whisperContextRef.current);
            }
          }
          stream.getTracks().forEach((t) => t.stop());
          mediaStreamRef.current = null;
          setIsListening(false);
          const final = finalTranscriptRef.current.trim();
          if (final) void sendMessageRef.current(final);
        })();
      } else {
        // ── Start NEXT chunk IMMEDIATELY so there is no recording gap ──────────
        if (isRecordingIntentRef.current) startChunk(stream);

        // Transcribe current chunk in parallel (non-blocking)
        if (hadSpeech && chunks.length > 0) {
          void (async () => {
            setIsTranscribing(true);
            const blob = new Blob(chunks, { type: chunkMime });
            const text = await transcribeChunk(blob, whisperContextRef.current);
            setIsTranscribing(false);
            if (text) {
              whisperContextRef.current = (whisperContextRef.current + " " + text).trim();
              finalTranscriptRef.current = whisperContextRef.current;
              setDisplayTranscript(whisperContextRef.current);
            }
          })();
        }
        // Silent chunk: next chunk already started above, nothing else to do
      }
    };

    try {
      recorder.start();
      currentRecorderRef.current = recorder;
      chunkTimerRef.current = setTimeout(() => {
        if (currentRecorderRef.current?.state === "recording") currentRecorderRef.current.stop();
      }, CHUNK_MS);
    } catch {
      if (vadIntervalRef.current) { clearInterval(vadIntervalRef.current); vadIntervalRef.current = null; }
      stream.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
      isRecordingIntentRef.current = false;
      setIsListening(false);
    }
  }, []); // stable refs/setters only — no closure deps

  // ── Toggle mic on/off ─────────────────────────────────────────────────────
  const toggleListening = React.useCallback(async () => {
    if (isLoading || isComplete) return;

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      toast({ title: "Voice not supported", description: "Use Chrome or Edge with HTTPS for voice input.", variant: "destructive" });
      return;
    }

    // ── Stop (deliberate tap) ─────────────────────────────────────────────
    if (isListening) {
      isRecordingIntentRef.current = false;
      isFinalStopRef.current = true;
      if (chunkTimerRef.current) { clearTimeout(chunkTimerRef.current); chunkTimerRef.current = null; }
      if (currentRecorderRef.current?.state === "recording") {
        currentRecorderRef.current.stop(); // → onstop → transcribe last chunk → sendMessage
      } else {
        // Recorder already stopped (between chunks), clean up and send directly
        isFinalStopRef.current = false;
        mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
        setIsListening(false);
        const final = finalTranscriptRef.current.trim();
        if (final) void sendMessage(final);
      }
      return;
    }

    // Prevent double-start
    if (currentRecorderRef.current) return;

    // ── Start recording ───────────────────────────────────────────────────
    stopSpeaking();
    finalTranscriptRef.current = "";
    whisperContextRef.current = "";
    setDisplayTranscript("");
    isFinalStopRef.current = false;
    isRecordingIntentRef.current = true;

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    } catch (err) {
      isRecordingIntentRef.current = false;
      const name = (err as { name?: string }).name ?? "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setMicPermission("denied");
      } else {
        toast({ title: "Microphone unavailable", description: "Could not access your microphone.", variant: "destructive" });
      }
      return;
    }

    setMicPermission("granted");
    mediaStreamRef.current = stream;
    setIsListening(true);
    startChunk(stream);
  }, [isListening, isLoading, isComplete, startChunk, sendMessage, toast]);

  const displayedQ = Math.min(questionNumber, maxQuestions);
  const hintsRemaining = hintsAllowed - hintsUsed;
  const canHint = hintsRemaining > 0 && messages.some((m) => m.role === "assistant") && !isLoading;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)]">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => { stopSpeaking(); window.location.href = "/interviews"; }} className="h-8 w-8">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-sm font-semibold">AI Mock Interview</h1>
            <p className="text-xs text-muted-foreground capitalize">
              {interviewType.toLowerCase().replace("_", " ")} · {plan === "FREE" ? "Free" : "Pro"} plan
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isComplete && (
            <Badge variant="outline" className="text-xs">
              Question {displayedQ} / {maxQuestions}
            </Badge>
          )}

          {/* Hint button */}
          {!isComplete && (
            <Button
              variant="outline"
              size="sm"
              className={cn("text-xs gap-1.5", showHint ? "border-yellow-500/50 text-yellow-400 bg-yellow-500/5" : "")}
              onClick={() => void handleHint()}
              disabled={!canHint && !showHint}
              title={canHint ? `${hintsRemaining} hint${hintsRemaining === 1 ? "" : "s"} remaining` : "No hints remaining"}
            >
              {isLoadingHint ? (
                <span className="animate-pulse">…</span>
              ) : (
                <>
                  <Lightbulb className="w-3.5 h-3.5" />
                  Hint
                  {hintsAllowed < 99 && (
                    <span className={cn("text-[10px] rounded-full px-1", hintsRemaining > 0 ? "bg-brand-500/20 text-brand-400" : "bg-muted text-muted-foreground")}>
                      {hintsRemaining}
                    </span>
                  )}
                </>
              )}
            </Button>
          )}

          {!isComplete && (
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              <button onClick={() => { setMode("text"); stopSpeaking(); }}
                className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                  mode === "text" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                <MessageSquare className="w-3 h-3" /> Text
              </button>
              <button onClick={() => setMode("voice")}
                className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                  mode === "voice" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                <Mic className="w-3 h-3" /> Voice
              </button>
            </div>
          )}

          {!isComplete && (
            <Button variant="ghost" size="icon" className="h-8 w-8"
              onClick={() => { setIsSpeaking((v) => { if (v) stopSpeaking(); return !v; }); }}>
              {isSpeaking ? <Volume2 className="w-4 h-4 text-brand-400" /> : <VolumeX className="w-4 h-4 text-muted-foreground" />}
            </Button>
          )}

          {!isComplete && messages.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => void handleEndSession()} disabled={isLoading} className="text-xs">
              End Session
            </Button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {!isComplete && (
        <div className="h-0.5 bg-border shrink-0">
          <motion.div className="h-full bg-brand-500" animate={{ width: `${(displayedQ / maxQuestions) * 100}%` }} transition={{ duration: 0.4 }} />
        </div>
      )}

      {/* Free plan question limit warning */}
      {!isComplete && plan === "FREE" && displayedQ === maxQuestions && (
        <div className="shrink-0 px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-amber-400">
            <Lock className="w-3 h-3" />
            Last question for free plan — upgrade to Pro for {"{"}8{"}"} questions per session
          </div>
          <a href="/pricing/upgrade" className="flex items-center gap-1 text-xs text-brand-400 font-medium hover:underline">
            <Crown className="w-3 h-3" /> Upgrade
          </a>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {dailyLimitInfo ? (
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            <DailyLimitScreen
              sessionsUsed={dailyLimitInfo.sessionsUsed}
              dailyLimit={dailyLimitInfo.dailyLimit}
              plan={dailyLimitInfo.plan}
              onBack={() => { stopSpeaking(); window.location.href = "/interviews"; }}
            />
          </div>
        ) : isComplete && feedback ? (
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            <FeedbackScreen feedback={feedback} onRestart={() => { stopSpeaking(); window.location.href = "/interviews"; }} />
          </div>
        ) : (
          <>
            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4 max-w-2xl mx-auto w-full">
              <AnimatePresence initial={false}>
                {messages.map((msg, idx) => <MessageBubble key={idx} message={msg} />)}
              </AnimatePresence>
              {isLoading && <TypingIndicator />}

              {/* Hint bubble */}
              <AnimatePresence>
                {showHint && hintText && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                    className="flex items-start gap-2 p-4 rounded-2xl border border-yellow-500/25 bg-yellow-500/5"
                  >
                    <Lightbulb className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-yellow-400 mb-1.5">Hint — what to cover:</p>
                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{hintText}</p>
                      {plan === "FREE" && (
                        <p className="text-[10px] text-muted-foreground mt-2 opacity-70">
                          Free plan: {hintsRemaining} hint{hintsRemaining === 1 ? "" : "s"} remaining ·{" "}
                          <a href="/pricing/upgrade" className="text-brand-400 hover:underline">Upgrade for unlimited</a>
                        </p>
                      )}
                    </div>
                    <button onClick={() => setShowHint(false)} className="ml-auto text-muted-foreground hover:text-foreground">
                      <XCircle className="w-4 h-4" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* TEXT mode input */}
            {mode === "text" && (
              <div className="shrink-0 border-t border-border/50 px-4 py-3 max-w-2xl mx-auto w-full space-y-2">
                <div className="flex items-end gap-2">
                  <textarea rows={2} value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(inputValue); } }}
                    disabled={isLoading || isComplete}
                    placeholder={isLoading ? "AI is thinking…" : "Type your answer… (Enter to send, Shift+Enter for newline)"}
                    className={cn("flex-1 resize-none rounded-xl border border-border/50 bg-card px-4 py-2.5 text-sm",
                      "placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brand-500",
                      "disabled:opacity-50 disabled:cursor-not-allowed")} />
                  <div className="flex flex-col gap-1.5">
                    <Button size="icon" className="h-9 w-9 shrink-0 rounded-xl bg-brand-500 hover:bg-brand-600"
                      onClick={() => void sendMessage(inputValue)}
                      disabled={isLoading || isComplete || !inputValue.trim()}
                      title="Send answer">
                      <Send className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="outline"
                      className={cn("h-9 w-9 shrink-0 rounded-xl", isImproving && "animate-pulse")}
                      onClick={() => void polishAnswer(inputValue, setInputValue)}
                      disabled={isLoading || isComplete || !inputValue.trim() || isImproving}
                      title="Polish answer with AI">
                      {isImproving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-brand-400" />}
                    </Button>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground text-right">
                  <kbd className="font-mono bg-muted px-1 rounded">Enter</kbd> to send ·{" "}
                  <kbd className="font-mono bg-muted px-1 rounded">Shift+Enter</kbd> new line ·{" "}
                  <span className="inline-flex items-center gap-0.5"><Sparkles className="w-2.5 h-2.5 text-brand-400" /> to professionally polish</span>
                </p>
              </div>
            )}

            {/* VOICE mode input */}
            {mode === "voice" && (
              <div className="shrink-0 border-t border-border/50 px-4 py-6 max-w-2xl mx-auto w-full">
                {micPermission === "denied" ? (
                  <div className="space-y-3">
                    <MicDeniedBanner />
                    <button onClick={() => { setMicPermission("unknown"); setMode("text"); }}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border/60 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors">
                      <MessageSquare className="w-4 h-4" /> Switch to Text Mode
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <VoiceOrb isListening={isListening} isLoading={isLoading} isTranscribing={isTranscribing} onClick={() => void toggleListening()} />

                    {/* VU meter — shows mic is live and detecting voice */}
                    {isListening && !isTranscribing && (
                      <div className="w-full space-y-1">
                        <div className="w-full h-2 bg-border/30 rounded-full overflow-hidden">
                          <div className={cn("h-full rounded-full transition-all duration-100",
                            micVolume > 25 ? "bg-green-400" : micVolume > 8 ? "bg-brand-400" : "bg-border/60"
                          )} style={{ width: `${Math.max(2, micVolume)}%` }} />
                        </div>
                        <p className="text-[10px] text-center text-muted-foreground">
                          {micVolume > 8 ? "🎙 Voice detected" : "🔇 Silence — take your time thinking"}
                        </p>
                      </div>
                    )}

                    {/* Transcript: read-only while recording, editable textarea when stopped */}
                    {isListening || isTranscribing ? (
                      <div className={cn("w-full min-h-[4rem] rounded-xl border bg-card px-4 py-2.5 text-sm leading-relaxed",
                        isListening && !isTranscribing ? "border-red-500/40 bg-red-500/5" : "border-brand-500/30 bg-brand-500/5")}>
                        {isTranscribing
                          ? <span className="text-brand-400 flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> Processing your speech…</span>
                          : displayTranscript
                            ? <span className="text-foreground">{displayTranscript}{" "}<span className="text-muted-foreground text-xs">(still recording…)</span></span>
                            : <span className="text-muted-foreground">{micVolume > 8 ? "Capturing your voice…" : "Take your time — speak when ready"}</span>}
                      </div>
                    ) : (
                      /* Editable — user can fix any transcription mistakes before sending */
                      <div className="w-full relative">
                        <textarea
                          value={displayTranscript}
                          onChange={(e) => {
                            setDisplayTranscript(e.target.value);
                            finalTranscriptRef.current = e.target.value;
                            whisperContextRef.current = e.target.value;
                          }}
                          rows={4}
                          placeholder="Tap the mic and speak your answer"
                          disabled={isLoading}
                          className={cn(
                            "w-full rounded-xl border bg-card px-4 py-2.5 pr-20 text-sm leading-relaxed resize-none",
                            "placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brand-500",
                            "disabled:opacity-50",
                            displayTranscript ? "border-border/50" : "border-border/30"
                          )}
                        />
                        {displayTranscript && (
                          <span className="absolute top-2 right-2 flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/90 rounded px-1.5 py-0.5 pointer-events-none select-none">
                            <Pencil className="w-2.5 h-2.5" /> editable
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2 w-full flex-wrap">
                      {displayTranscript && !isListening && !isTranscribing && (
                        <Button className="flex-1 bg-brand-500 hover:bg-brand-600" onClick={() => void sendMessage(displayTranscript)} disabled={isLoading}>
                          <Send className="w-4 h-4 mr-2" /> Send Answer
                        </Button>
                      )}
                      {displayTranscript && !isListening && !isTranscribing && (
                        <Button variant="outline" className="flex-1 gap-1.5"
                          onClick={() => void polishAnswer(displayTranscript, (v) => {
                            setDisplayTranscript(v);
                            finalTranscriptRef.current = v;
                            whisperContextRef.current = v;
                          })}
                          disabled={isLoading || isImproving}>
                          {isImproving
                            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Polishing…</>
                            : <><Sparkles className="w-3.5 h-3.5 text-brand-400" /> Polish Answer</>}
                        </Button>
                      )}
                      {displayTranscript && !isListening && (
                        <Button variant="ghost" size="sm" className="text-muted-foreground"
                          onClick={() => { setDisplayTranscript(""); finalTranscriptRef.current = ""; whisperContextRef.current = ""; }}>
                          Clear
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      {isTranscribing
                        ? "AI is transcribing — your answer is safe"
                        : isListening
                        ? "Tap mic when done • Silence is ignored • Text updates live"
                        : displayTranscript
                        ? "Click the text above to fix any mistakes, then send"
                        : "Tap mic to start • Powered by OpenAI Whisper"}
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function InterviewSessionPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64 text-muted-foreground">Loading…</div>}>
      <InterviewSession />
    </Suspense>
  );
}
