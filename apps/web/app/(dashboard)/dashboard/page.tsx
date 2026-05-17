import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db/client";
import { getOrCreateUser } from "@/lib/auth/get-or-create-user";
import { DashboardStats } from "@/components/features/dashboard/dashboard-stats";
import { RecentApplications } from "@/components/features/dashboard/recent-applications";
import { JobRecommendations } from "@/components/features/dashboard/job-recommendations";
import { AIAgentStatus } from "@/components/features/dashboard/ai-agent-status";
import { QuickActions } from "@/components/features/dashboard/quick-actions";
import { Skeleton } from "@/components/ui/skeleton";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard" };

async function getDashboardData(clerkId: string) {
  const user = await db.user.findUnique({
    where: { clerkId },
    select: {
      id: true,
      firstName: true,
      plan: true,
      _count: {
        select: {
          resumes: { where: { deletedAt: null } },
          applications: true,
          savedJobs: true,
          interviews: true,
        },
      },
    },
  });

  if (!user) return null;

  const [applicationStats, recentApplications, baseResume] = await Promise.all([
    db.application.groupBy({
      by: ["status"],
      where: { userId: user.id },
      _count: { status: true },
    }),
    db.application.findMany({
      where: { userId: user.id },
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        job: {
          select: { title: true, company: true, companyLogo: true },
        },
      },
    }),
    db.resume.findFirst({
      where: { userId: user.id, isBase: true, deletedAt: null },
      select: { atsScore: true, status: true, title: true },
    }),
  ]);

  const statusMap = Object.fromEntries(
    (applicationStats as { status: string; _count: { status: number } }[]).map((s) => [s.status, s._count.status])
  );

  return {
    user,
    stats: {
      totalApplications: Object.values(statusMap).reduce((a: number, b: number) => a + b, 0),
      interviews: (statusMap.INTERVIEW ?? 0) + (statusMap.TECHNICAL ?? 0),
      offers: statusMap.OFFER ?? 0,
      responseRate:
        Object.values(statusMap).reduce((a: number, b: number) => a + b, 0) > 0
          ? Math.round(
              (((statusMap.SCREENING ?? 0) +
                (statusMap.INTERVIEW ?? 0) +
                (statusMap.TECHNICAL ?? 0) +
                (statusMap.OFFER ?? 0)) /
                Object.values(statusMap).reduce((a: number, b: number) => a + b, 0)) *
                100
            )
          : 0,
      savedJobs: user._count.savedJobs,
      resumeCount: user._count.resumes,
      atsScore: baseResume?.atsScore ?? null,
    },
    recentApplications,
    baseResume,
  };
}

export default async function DashboardPage() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return null;

  let currentUser = null;
  try {
    currentUser = await getOrCreateUser();
  } catch {
    // DB tables may not be migrated yet
  }

  let data = null;
  try {
    if (clerkId) data = await getDashboardData(clerkId);
  } catch {
    data = null;
  }

  const firstName = data?.user.firstName ?? currentUser.firstName ?? null;
  const plan = data?.user.plan ?? currentUser.plan;
  const stats = data?.stats ?? {
    totalApplications: 0,
    interviews: 0,
    offers: 0,
    responseRate: 0,
    savedJobs: 0,
    resumeCount: 0,
    atsScore: null,
  };
  const recentApplications = data?.recentApplications ?? [];
  const baseResume = data?.baseResume ?? null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Good morning{firstName ? `, ${firstName}` : ""} 👋
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s your career overview for today.
        </p>
      </div>

      {/* Quick actions */}
      <QuickActions hasResume={!!baseResume} plan={plan} />

      {/* Stats */}
      <DashboardStats stats={stats} />

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent applications */}
        <div className="lg:col-span-2">
          <Suspense fallback={<Skeleton className="h-80 w-full rounded-xl" />}>
            <RecentApplications applications={recentApplications} />
          </Suspense>
        </div>

        {/* AI Agent status */}
        <div>
          <Suspense fallback={<Skeleton className="h-80 w-full rounded-xl" />}>
            <AIAgentStatus plan={plan} />
          </Suspense>
        </div>
      </div>

      {/* Job recommendations */}
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <JobRecommendations userId={currentUser.id} />
      </Suspense>
    </div>
  );
}
