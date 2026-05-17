import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db/client";
import { getOrCreateUser } from "@/lib/auth/get-or-create-user";
import { JobBoard } from "@/components/features/jobs/job-board";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Job Search" };

export default async function JobsPage() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return null;

  await getOrCreateUser();

  const user = await db.user.findUnique({
    where: { clerkId },
    select: { plan: true },
  });

  const plan = user?.plan ?? "FREE";
  const isConfigured = !!(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Job Search</h1>
        <p className="text-muted-foreground">
          Real job listings from Adzuna — India&apos;s largest job aggregator
        </p>
      </div>

      <JobBoard plan={plan} isConfigured={isConfigured} />
    </div>
  );
}
