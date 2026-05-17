import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db/client";
import { getOrCreateUser } from "@/lib/auth/get-or-create-user";
import { InterviewsBoard } from "@/components/features/interviews/interviews-board";
import type { Metadata } from "next";

export const dynamic = "force-dynamic"; // always fetch fresh session count

export const metadata: Metadata = { title: "Mock Interviews — CareerOS" };

const DAILY_LIMITS = { FREE: 2, PRO: 999 } as const;

export default async function InterviewsPage() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return null;

  await getOrCreateUser();

  const user = await db.user.findUnique({
    where: { clerkId },
    select: { id: true, plan: true },
  });
  if (!user) return null;

  const plan = (user.plan as "FREE" | "PRO") ?? "FREE";
  const dailyLimit = DAILY_LIMITS[plan] ?? 2;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const sessionsUsedToday = await db.aiGeneration.count({
    where: {
      userId: user.id,
      feature: "INTERVIEW_FEEDBACK",
      createdAt: { gte: todayStart },
      success: true,
    },
  });

  return (
    <InterviewsBoard
      plan={plan}
      sessionsUsedToday={sessionsUsedToday}
      dailyLimit={dailyLimit}
    />
  );
}
