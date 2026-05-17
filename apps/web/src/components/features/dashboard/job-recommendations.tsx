import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase } from "lucide-react";

export async function JobRecommendations({ userId }: { userId: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">AI Job Recommendations</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
          <Briefcase className="mb-2 h-8 w-8 opacity-50" />
          <p className="text-sm">Upload your resume to get personalized job matches</p>
        </div>
      </CardContent>
    </Card>
  );
}
