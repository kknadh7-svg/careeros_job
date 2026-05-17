import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db/client";
import { getOrCreateUser } from "@/lib/auth/get-or-create-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Briefcase, Calendar, Star, BarChart3 } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Analytics" };

export default async function AnalyticsPage() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return null;

  await getOrCreateUser();

  const user = await db.user.findUnique({
    where: { clerkId },
    select: { id: true },
  });

  const [applicationStats, totalResumes, savedJobs] = user
    ? await Promise.all([
        db.application.groupBy({
          by: ["status"],
          where: { userId: user.id },
          _count: { status: true },
        }),
        db.resume.count({ where: { userId: user.id, deletedAt: null } }),
        db.savedJob.count({ where: { userId: user.id } }),
      ])
    : [[], 0, 0];

  const statusMap = Object.fromEntries(
    (applicationStats as { status: string; _count: { status: number } }[]).map((s) => [s.status, s._count.status])
  );
  const total = Object.values(statusMap).reduce((a: number, b: number) => a + b, 0);
  const responded = (statusMap.SCREENING ?? 0) + (statusMap.INTERVIEW ?? 0) + (statusMap.TECHNICAL ?? 0) + (statusMap.OFFER ?? 0);

  const cards = [
    { label: "Total Applications", value: total, icon: Briefcase, color: "text-blue-400" },
    { label: "Response Rate", value: total > 0 ? `${Math.round((responded / total) * 100)}%` : "0%", icon: TrendingUp, color: "text-green-400" },
    { label: "Interviews", value: (statusMap.INTERVIEW ?? 0) + (statusMap.TECHNICAL ?? 0), icon: Calendar, color: "text-purple-400" },
    { label: "Offers", value: statusMap.OFFER ?? 0, icon: Star, color: "text-yellow-400" },
    { label: "Resumes", value: totalResumes, icon: BarChart3, color: "text-cyan-400" },
    { label: "Saved Jobs", value: savedJobs, icon: Briefcase, color: "text-orange-400" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Career Analytics</h1>
        <p className="text-muted-foreground">Track your career metrics and progress</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {cards.map((card) => (
          <Card key={card.label} className="border-border/50">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                  <card.icon className={`w-4 h-4 ${card.color}`} />
                </div>
                <span className="text-xs text-muted-foreground font-medium">{card.label}</span>
              </div>
              <p className={`text-3xl font-bold ${card.color}`}>{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Application Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          {total === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
              <BarChart3 className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-sm">No data yet. Start applying to see your funnel metrics.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(statusMap).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <span className="text-sm capitalize">{status.toLowerCase().replace("_", " ")}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-500 rounded-full"
                        style={{ width: `${(count / total) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-6 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
