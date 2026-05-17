import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const statusColors: Record<string, string> = {
  DRAFT: "secondary",
  APPLIED: "default",
  SCREENING: "default",
  INTERVIEW: "default",
  TECHNICAL: "default",
  OFFER: "default",
  ACCEPTED: "default",
  REJECTED: "destructive",
  WITHDRAWN: "secondary",
};

interface Application {
  id: string;
  status: string;
  createdAt: Date;
  job: { title: string; company: string; companyLogo: string | null };
}

export function RecentApplications({ applications }: { applications: Application[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent Applications</CardTitle>
      </CardHeader>
      <CardContent>
        {applications.length === 0 ? (
          <p className="text-sm text-muted-foreground">No applications yet. Start applying!</p>
        ) : (
          <div className="space-y-3">
            {applications.map((app) => (
              <div key={app.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium">{app.job.title}</p>
                  <p className="text-xs text-muted-foreground">{app.job.company}</p>
                </div>
                <Badge variant={(statusColors[app.status] ?? "secondary") as "default" | "secondary" | "destructive" | "outline"}>
                  {app.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
