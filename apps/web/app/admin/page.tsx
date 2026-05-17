import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { AdminDashboard } from "@/components/features/admin/admin-dashboard";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin — CareerOS" };

async function getAdminStats() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    newUsersThisMonth,
    planBreakdown,
    totalApplications,
    totalResumes,
    totalInterviews,
    aiUsageThisMonth,
    activeBrowserSessions,
    recentUsers,
  ] = await Promise.all([
    db.user.count({ where: { deletedAt: null } }),
    db.user.count({ where: { createdAt: { gte: thirtyDaysAgo }, deletedAt: null } }),
    db.user.groupBy({
      by: ["plan"],
      _count: { plan: true },
      where: { deletedAt: null },
    }),
    db.application.count(),
    db.resume.count({ where: { deletedAt: null } }),
    db.interview.count(),
    db.aiGeneration.aggregate({
      where: { createdAt: { gte: thirtyDaysAgo } },
      _sum: { totalTokens: true, costUsd: true },
      _count: { id: true },
    }),
    db.browserSession.count({ where: { status: { in: ["PENDING", "RUNNING"] } } }),
    db.user.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        plan: true,
        createdAt: true,
        _count: { select: { applications: true, resumes: true } },
      },
    }),
  ]);

  return {
    totalUsers,
    newUsersThisMonth,
    planBreakdown: Object.fromEntries(
      planBreakdown.map((p) => [p.plan, p._count.plan])
    ),
    totalApplications,
    totalResumes,
    totalInterviews,
    aiUsage: {
      totalTokens: aiUsageThisMonth._sum.totalTokens ?? 0,
      totalCostUsd: aiUsageThisMonth._sum.costUsd ?? 0,
      callCount: aiUsageThisMonth._count.id,
    },
    activeBrowserSessions,
    recentUsers,
  };
}

export default async function AdminPage() {
  const { userId: clerkId, sessionClaims } = await auth();

  if (!clerkId) redirect("/sign-in");

  const role = (sessionClaims?.metadata as { role?: string })?.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") redirect("/dashboard");

  const stats = await getAdminStats();

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <p className="text-muted-foreground">System overview and management</p>
        </div>
        <AdminDashboard stats={stats} />
      </div>
    </div>
  );
}
