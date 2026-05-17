"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import type { PlanTier } from "@prisma/client";

interface ResumeUploadZoneProps {
  plan: PlanTier;
  resumeCount: number;
}

type UploadState = "idle" | "uploading" | "success" | "error";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
};

export function ResumeUploadZone({ plan, resumeCount }: ResumeUploadZoneProps) {
  const router = useRouter();
  const [state, setState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const isLimited = plan === "FREE" && resumeCount >= 1;

  const uploadFile = useCallback(
    async (file: File) => {
      if (isLimited) {
        toast({
          title: "Plan limit reached",
          description: "Upgrade to Pro to upload unlimited resumes.",
          variant: "destructive",
        });
        return;
      }

      setFileName(file.name);
      setState("uploading");
      setProgress(20);

      try {
        const formData = new FormData();
        formData.append("file", file);

        setProgress(50);

        const res = await fetch("/api/v1/resumes", {
          method: "POST",
          body: formData,
        });

        setProgress(90);

        if (!res.ok) {
          const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
          throw new Error(err?.error?.message ?? "Upload failed");
        }

        setProgress(100);
        setState("success");

        toast({
          title: "Resume uploaded!",
          description: "Your resume is ready. AI scoring runs in the background.",
        });

        setTimeout(() => {
          router.refresh();
          setState("idle");
          setProgress(0);
        }, 2000);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed";
        setErrorMessage(message);
        setState("error");
        toast({ title: "Upload failed", description: message, variant: "destructive" });
      }
    },
    [isLimited, router]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => { const f = files[0]; if (f) void uploadFile(f); },
    accept: ACCEPTED_TYPES,
    maxSize: MAX_SIZE,
    multiple: false,
    disabled: state !== "idle" || isLimited,
    onDropRejected: (rejections) => {
      const reason = rejections[0]?.errors[0]?.message;
      toast({
        title: "Invalid file",
        description: reason ?? "Please upload a PDF or DOCX under 10MB",
        variant: "destructive",
      });
    },
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-200 cursor-pointer",
        isDragActive ? "border-brand-500 bg-brand-500/10" : "border-border/60 hover:border-brand-500/50 hover:bg-accent/40",
        (state !== "idle" || isLimited) && "cursor-not-allowed opacity-60"
      )}
    >
      <input {...getInputProps()} />

      <AnimatePresence mode="wait">
        {state === "idle" && (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            <div className="flex justify-center">
              <div className="w-14 h-14 rounded-2xl bg-brand-500/10 flex items-center justify-center">
                <Upload className="w-6 h-6 text-brand-400" />
              </div>
            </div>
            <div>
              <p className="text-base font-medium">
                {isDragActive ? "Drop your resume here" : "Drag & drop your resume"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                or <span className="text-brand-400 font-medium">click to browse</span> — PDF or DOCX, max 10MB
              </p>
            </div>
            {isLimited && (
              <p className="text-sm text-muted-foreground">
                Free plan includes 1 resume.{" "}
                <a href="/pricing" className="text-brand-400 hover:underline font-medium">Upgrade to Pro</a>
                {" "}for unlimited uploads.
              </p>
            )}
          </motion.div>
        )}

        {state === "uploading" && (
          <motion.div key="uploading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="flex justify-center">
              <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
            </div>
            <div>
              <p className="font-medium">Uploading {fileName}</p>
              <p className="text-sm text-muted-foreground">Extracting text and analyzing your resume…</p>
            </div>
            <Progress value={progress} className="w-full max-w-sm mx-auto" />
          </motion.div>
        )}

        {state === "success" && (
          <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            <div className="flex justify-center">
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>
            <p className="font-medium text-green-400">Resume uploaded successfully!</p>
          </motion.div>
        )}

        {state === "error" && (
          <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            <div className="flex justify-center">
              <AlertCircle className="w-10 h-10 text-destructive" />
            </div>
            <p className="font-medium text-destructive">{errorMessage}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => { e.stopPropagation(); setState("idle"); setProgress(0); }}
            >
              Try again
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
