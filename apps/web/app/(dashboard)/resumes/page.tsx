import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db/client";
import { getOrCreateUser } from "@/lib/auth/get-or-create-user";
import { ResumesList } from "@/components/features/resume/resumes-list";
import { ResumeUploadZone } from "@/components/features/resume/resume-upload-zone";
import { Skeleton } from "@/components/ui/skeleton";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Resumes" };

async function getUserResumes(clerkId: string) {
  await getOrCreateUser();
  const user = await db.user.findUnique({
    where: { clerkId },
    select: { id: true, plan: true },
  });

  if (!user) return { user: null, resumes: [], enhancementCount: 0 };

  const resumes = await db.resume.findMany({
    where: { userId: user.id, deletedAt: null },
    orderBy: [{ isBase: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      fileType: true,
      fileUrl: true,
      atsScore: true,
      isBase: true,
      isTailored: true,
      status: true,
      version: true,
      createdAt: true,
      rawText: true,
      tailoredForJob: {
        select: { title: true, company: true },
      },
    },
  });

  const enhancementCount = resumes.filter((r) => r.isTailored).length;

  return { user, resumes, enhancementCount };
}

export default async function ResumesPage() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return null;

  const { user, resumes, enhancementCount } = await getUserResumes(clerkId);
  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Resumes</h1>
          <p className="text-muted-foreground">
            Upload, optimize, and tailor your resumes with AI
          </p>
        </div>
      </div>

      {/* Upload zone */}
      <ResumeUploadZone plan={user.plan} resumeCount={resumes.filter((r) => r.isBase).length} />

      {/* Resumes list */}
      <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
        <ResumesList resumes={resumes} plan={user.plan} enhancementCount={enhancementCount} />
      </Suspense>
    </div>
  );
}
