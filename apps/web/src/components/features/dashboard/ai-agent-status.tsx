import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot } from "lucide-react";

export function AIAgentStatus({ plan }: { plan: string }) {
  const isActive = plan === "PRO" || plan === "ENTERPRISE";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Daily AI Agent</CardTitle>
        <Badge variant={isActive ? "default" : "secondary"}>
          {isActive ? "Active" : "Upgrade"}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <Bot className={`mb-2 h-10 w-10 ${isActive ? "text-primary" : "text-muted-foreground opacity-50"}`} />
          {isActive ? (
            <p className="text-sm text-muted-foreground">Agent runs daily at 6am and finds matching jobs for you</p>
          ) : (
            <p className="text-sm text-muted-foreground">Upgrade to Pro to enable the daily job discovery agent</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
