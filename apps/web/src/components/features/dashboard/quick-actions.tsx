import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Upload, Search, FileText, Mic } from "lucide-react";

export function QuickActions({ hasResume, plan }: { hasResume: boolean; plan: string }) {
  return (
    <div className="flex flex-wrap gap-3">
      <Button asChild variant={hasResume ? "outline" : "default"} size="sm">
        <Link href="/resumes">
          <Upload className="mr-2 h-4 w-4" />
          {hasResume ? "Manage Resumes" : "Upload Resume"}
        </Link>
      </Button>
      <Button asChild variant="outline" size="sm">
        <Link href="/jobs">
          <Search className="mr-2 h-4 w-4" />
          Browse Jobs
        </Link>
      </Button>
      <Button asChild variant="outline" size="sm">
        <Link href="/applications">
          <FileText className="mr-2 h-4 w-4" />
          Applications
        </Link>
      </Button>
      <Button asChild variant="outline" size="sm">
        <Link href="/interviews">
          <Mic className="mr-2 h-4 w-4" />
          Mock Interview
        </Link>
      </Button>
    </div>
  );
}
