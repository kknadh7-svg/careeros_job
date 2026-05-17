import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db/client";
import { getOrCreateUser } from "@/lib/auth/get-or-create-user";
import { ApplicationsBoard } from "@/components/features/applications/applications-board";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Applications" };

export default async function ApplicationsPage() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return null;

  await getOrCreateUser();

  const user = await db.user.findUnique({ where: { clerkId }, select: { id: true } });
  if (!user) return null;

  const applications = await db.application.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      job: { select: { title: true, company: true, location: true, applyUrl: true, source: true } },
    },
  });

  return <ApplicationsBoard initialApplications={applications} />;
}
